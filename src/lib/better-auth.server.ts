import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { Pool } from "@neondatabase/serverless";
import { APP_DOMAINS } from "@/lib/app-domains";
import { canonicalAppUrl, isApprovedHost } from "@/lib/app-url";

/**
 * Self-hosted Better Auth — ROUT's own identity layer (System A).
 *
 * No managed middleman: Google, GitHub, GitLab, Apple and a generic OIDC
 * provider talk directly to OUR backend with OUR client credentials. Data
 * lives in the existing `neon_auth` schema (the Better Auth table layout), so
 * existing e-mail/password accounts keep working.
 *
 * Providers are only enabled when their credentials are present, so a missing
 * key disables that button instead of crashing sign-in.
 *
 * Cookies: strictly functional (session + OAuth state/CSRF), always
 * HttpOnly + Secure + SameSite=Lax. No trackers, no third-party cookies.
 */

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function pair(id: string, secret: string) {
  const clientId = env(id);
  const clientSecret = env(secret);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Origin the browser is actually using, when it is one we may trust. */
function requestOrigin(request?: Request): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host") || new URL(request.url).host;
  if (!host) return null;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? "http" : "https"}://${host}`;
}

/** The base URL OAuth callbacks are built on: configured, else approved host, else canonical. */
function baseUrlFor(request?: Request): string {
  const configured = env("BETTER_AUTH_URL") ?? env("NEXT_PUBLIC_APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  const origin = requestOrigin(request);
  if (origin && isApprovedHost(new URL(origin).host)) return origin;
  return canonicalAppUrl();
}

export function createRoutAuth(request?: Request) {
  const connectionString = env("DATABASE_URL");
  if (!connectionString) throw new Error("DATABASE_URL ontbreekt.");
  const secret = env("BETTER_AUTH_SECRET");
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET ontbreekt.");

  const socialProviders: Record<string, unknown> = {};
  const google = pair("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  if (google) socialProviders["google"] = { ...google, prompt: "select_account" };
  const github = pair("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET");
  if (github) socialProviders["github"] = github;
  const gitlab = pair("GITLAB_CLIENT_ID", "GITLAB_CLIENT_SECRET");
  if (gitlab) socialProviders["gitlab"] = { ...gitlab, issuer: env("GITLAB_ISSUER") };
  const apple = pair("APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET");
  if (apple) socialProviders["apple"] = { ...apple, appBundleIdentifier: env("APPLE_APP_BUNDLE_IDENTIFIER") };

  const plugins: unknown[] = [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        const { sendMail } = await import("@/emails/send.server");
        await sendMail({
          to: email,
          subject: "Je inloglink voor ROUT",
          html: `<p>Klik om in te loggen bij ROUT:</p><p><a href="${url}">Inloggen</a></p><p>Deze link werkt 15 minuten en maar één keer.</p>`,
          text: `Log in bij ROUT: ${url}\n\nDeze link werkt 15 minuten en maar één keer.`,
          tags: ["magic-link"],
        });
      },
    }),
  ];

  const genericConfigs: unknown[] = [];
  const oidc = pair("OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET");
  const discoveryUrl = env("OIDC_DISCOVERY_URL");
  if (oidc && discoveryUrl) {
    genericConfigs.push({ providerId: "oidc", discoveryUrl, ...oidc, scopes: ["openid", "email", "profile"], pkce: true });
  }
  // Infomaniak (Zwitserland) — native OIDC, geen tussenpartij.
  const infomaniak = pair("INFOMANIAK_CLIENT_ID", "INFOMANIAK_CLIENT_SECRET");
  if (infomaniak) {
    genericConfigs.push({
      providerId: "infomaniak",
      ...infomaniak,
      authorizationUrl: "https://login.infomaniak.com/authorize",
      tokenUrl: "https://login.infomaniak.com/token",
      userInfoUrl: "https://login.infomaniak.com/oauth2/userinfo",
      scopes: ["openid", "email", "profile"],
      pkce: true,
      mapProfileToUser: (p: Record<string, unknown>) => ({
        email: typeof p["email"] === "string" ? (p["email"] as string).toLowerCase() : undefined,
        name: (p["name"] as string) ?? (p["display_name"] as string) ?? undefined,
        image: (p["picture"] as string) ?? undefined,
        // Alleen expliciet bevestigde adressen gelden als geverifieerd.
        emailVerified: p["email_verified"] === true,
      }),
    });
  }
  if (genericConfigs.length) plugins.push(genericOAuth({ config: genericConfigs as never }));

  const origin = requestOrigin(request);

  return betterAuth({
    appName: "ROUT",
    baseURL: baseUrlFor(request),
    basePath: "/api/auth",
    secret,
    database: new Pool({ connectionString }),
    user: { modelName: "neon_auth.user" },
    session: {
      modelName: "neon_auth.session",
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: "neon_auth.account",
      accountLinking: {
        enabled: true,
        // No trusted providers: a social account is only linked to an existing
        // ROUT user when that provider reports the e-mail as verified.
        trustedProviders: [],
        allowDifferentEmails: false,
      },
    },
    verification: { modelName: "neon_auth.verification" },
    emailAndPassword: { enabled: true, minPasswordLength: 10, autoSignIn: true },
    socialProviders: socialProviders as never,
    plugins: plugins as never,
    trustedOrigins: [
      canonicalAppUrl(),
      ...APP_DOMAINS.flatMap((d) => [`https://${d}`, `https://*.${d}`]),
      ...(origin ? [origin] : []),
    ],
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
      database: { generateId: () => crypto.randomUUID() },
    },
    telemetry: { enabled: false },
  });
}

/** Which sign-in buttons are actually configured (for the UI). */
export function enabledProviders(): string[] {
  const list: string[] = [];
  if (pair("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")) list.push("google");
  if (pair("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET")) list.push("github");
  if (pair("GITLAB_CLIENT_ID", "GITLAB_CLIENT_SECRET")) list.push("gitlab");
  if (pair("APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET")) list.push("apple");
  if (pair("OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET") && env("OIDC_DISCOVERY_URL")) list.push("oidc");
  if (pair("INFOMANIAK_CLIENT_ID", "INFOMANIAK_CLIENT_SECRET")) list.push("infomaniak");
  return list;
}
