import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * Server-functies voor de ROUT Developer Console en het toestemmingsscherm.
 *
 * Elke functie controleert zelf de sessie; apps horen altijd bij de gebruiker
 * die ze aanmaakte. Clientsecrets verlaten de server maar één keer: op het
 * moment dat ze gemaakt of geroteerd worden.
 */

const urlish = z.string().trim().max(300).nullable().optional();

const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  logoUrl: urlish,
  homepageUrl: urlish,
  privacyUrl: urlish,
  termsUrl: urlish,
  redirectUris: z.array(z.string().trim().max(300)).max(20),
  scopes: z.array(z.enum(["openid", "profile", "email"])).max(3),
});

async function assertVerified(userId: string) {
  const { isVerifiedDeveloper } = await import("./provider.server");
  if (!(await isVerifiedDeveloper(userId))) {
    throw new Error("De Developer Console is beschikbaar voor geverifieerde leden.");
  }
}

export const consoleAccess = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { isVerifiedDeveloper } = await import("./provider.server");
    return { verified: await isVerifiedDeveloper(context.userId) };
  });

export const listOAuthClients = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertVerified(context.userId);
    const { listClients } = await import("./provider.server");
    return listClients(context.userId);
  });

export const saveOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => clientSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertVerified(context.userId);
    const { createClient, updateClient } = await import("./provider.server");
    const input = {
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      homepageUrl: data.homepageUrl ?? null,
      privacyUrl: data.privacyUrl ?? null,
      termsUrl: data.termsUrl ?? null,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
    };
    if (data.id) {
      return { client: await updateClient(context.userId, data.id, input), clientSecret: null };
    }
    return createClient(context.userId, input);
  });

export const deleteOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertVerified(context.userId);
    const { deleteClient } = await import("./provider.server");
    await deleteClient(context.userId, data.id);
    return { ok: true };
  });

export const rotateOAuthSecret = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertVerified(context.userId);
    const { rotateClientSecret } = await import("./provider.server");
    return { clientSecret: await rotateClientSecret(context.userId, data.id) };
  });

/* ------------------------------------------------ toestemmingsscherm ----- */

const authorizeSchema = z.object({
  clientId: z.string().min(4).max(120),
  redirectUri: z.string().min(4).max(300),
  scope: z.string().max(200).optional(),
  state: z.string().max(300).nullable().optional(),
  nonce: z.string().max(300).nullable().optional(),
  codeChallenge: z.string().min(20).max(200),
  codeChallengeMethod: z.string().max(10),
});

export type AuthorizePrompt = {
  ok: boolean;
  error?: string;
  app?: {
    name: string;
    logoUrl: string | null;
    homepageUrl: string | null;
    privacyUrl: string | null;
    termsUrl: string | null;
  };
  scopes?: string[];
  account?: { email: string; name: string | null };
  alreadyGranted?: boolean;
};

export const describeAuthorizeRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => authorizeSchema.parse(data))
  .handler(async ({ data, context }): Promise<AuthorizePrompt> => {
    const { getClientByClientId, redirectAllowed, hasConsent, SUPPORTED_SCOPES } = await import(
      "./provider.server"
    );
    if (data.codeChallengeMethod !== "S256") {
      return { ok: false, error: "Deze app moet PKCE met S256 gebruiken." };
    }
    const client = await getClientByClientId(data.clientId);
    if (!client || client.status !== "active") {
      return { ok: false, error: "Deze app is onbekend bij ROUT." };
    }
    if (!redirectAllowed(client, data.redirectUri)) {
      return { ok: false, error: "Het terugkeeradres van deze app klopt niet." };
    }
    const requested = (data.scope ?? "openid").split(" ").filter(Boolean);
    const scopes = requested.filter(
      (s) => client.scopes.includes(s) && SUPPORTED_SCOPES.includes(s as never),
    );
    if (!scopes.includes("openid")) scopes.unshift("openid");
    const unknown = requested.find((s) => !scopes.includes(s));
    if (unknown) return { ok: false, error: `Deze app vraagt een recht dat niet mag: ${unknown}.` };

    return {
      ok: true,
      app: {
        name: client.name,
        logoUrl: client.logoUrl,
        homepageUrl: client.homepageUrl,
        privacyUrl: client.privacyUrl,
        termsUrl: client.termsUrl,
      },
      scopes,
      account: {
        email: context.user.email,
        name: (context.user.userMetadata["full_name"] as string | null) ?? null,
      },
      alreadyGranted: await hasConsent(context.userId, client.clientId, scopes),
    };
  });

export const decideAuthorizeRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) =>
    authorizeSchema.extend({ allow: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ redirectTo: string } | { error: string }> => {
    const { getClientByClientId, redirectAllowed, issueAuthorizationCode, rememberConsent } =
      await import("./provider.server");
    const client = await getClientByClientId(data.clientId);
    if (!client || client.status !== "active") return { error: "Deze app is onbekend bij ROUT." };
    if (!redirectAllowed(client, data.redirectUri)) {
      return { error: "Het terugkeeradres van deze app klopt niet." };
    }
    if (data.codeChallengeMethod !== "S256") return { error: "PKCE S256 is verplicht." };

    const target = new URL(data.redirectUri);
    if (data.state) target.searchParams.set("state", data.state);

    if (!data.allow) {
      target.searchParams.set("error", "access_denied");
      target.searchParams.set("error_description", "De gebruiker gaf geen toestemming.");
      return { redirectTo: target.toString() };
    }

    const scopes = (data.scope ?? "openid")
      .split(" ")
      .filter((s) => s && client.scopes.includes(s));
    if (!scopes.includes("openid")) scopes.unshift("openid");

    const code = await issueAuthorizationCode({
      clientId: client.clientId,
      userId: context.userId,
      redirectUri: data.redirectUri,
      scopes,
      codeChallenge: data.codeChallenge,
      nonce: data.nonce ?? null,
    });
    await rememberConsent(context.userId, client.clientId, scopes);
    target.searchParams.set("code", code);
    return { redirectTo: target.toString() };
  });
