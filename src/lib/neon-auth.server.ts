import { createAuthServer } from "@neondatabase/neon-js/auth/server";
import type { SessionUser } from "@/lib/auth/session.server";
import { sql } from "@/lib/neon";
import { canonicalAppUrl, isApprovedHost } from "@/lib/app-url";

/**
 * Neon Auth — server side.
 *
 * Neon Auth is the only credential store for ROUT: sign-up, sign-in, social
 * login and password resets all happen against the Neon Auth service. The
 * browser talks to it through our own origin (`/api/auth/*`), so its session
 * cookie is first-party and readable here.
 *
 * Every Neon Auth identity is bridged onto the existing `public.users` row
 * (matched on e-mail, created on first sign-in) so all foreign keys — QR
 * codes, domains, statistics — keep pointing at the same id they always did.
 */

export const NEON_AUTH_BASE_URL =
  process.env["NEON_AUTH_URL"] ??
  process.env["VITE_NEON_AUTH_URL"] ??
  "https://ep-autumn-salad-b1wk95js.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth";

export function getCookieSecret(): string {
  const secret = process.env["NEON_AUTH_COOKIE_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("NEON_AUTH_COOKIE_SECRET is missing or shorter than 32 characters.");
  }
  return secret;
}

function createServer() {
  return createAuthServer({
    baseUrl: NEON_AUTH_BASE_URL,
    cookieSecret: getCookieSecret(),
    sameSite: "lax",
    context: async () => {
      const { getRequestHeader, setCookie, getRequestHeaders } = await import(
        "@tanstack/react-start/server"
      );
      return {
        getCookies: () => getRequestHeader("cookie") ?? "",
        setCookie: (name: string, value: string, options: Record<string, unknown>) => {
          setCookie(name, value, options as never);
        },
        getHeader: (name: string) => getRequestHeader(name) ?? null,
        // Eén canonieke origin: een preview- of deploy-host mag nooit in een
        // OAuth-redirect belanden (dat geeft `redirect_uri_mismatch`).
        getOrigin: () => {
          const headers = getRequestHeaders();
          const configured = process.env["NEXT_PUBLIC_APP_URL"];
          if (configured) return configured.replace(/\/$/, "");
          const host = headers["host"];
          if (host && isApprovedHost(host)) return `https://${host}`;
          return canonicalAppUrl();
        },
        getFramework: () => "tanstack-start",
      };
    },
  });
}

export type NeonAuthIdentity = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
};

/** Reads the Neon Auth session for the in-flight request; null when signed out. */
export async function getNeonAuthIdentity(): Promise<NeonAuthIdentity | null> {
  try {
    const auth = createServer();
    const result = (await auth.getSession()) as unknown;
    const payload = (result as { data?: unknown })?.data ?? result;
    const user = (payload as { user?: Record<string, unknown> } | null)?.user;
    const email = typeof user?.["email"] === "string" ? (user["email"] as string) : null;
    const id = typeof user?.["id"] === "string" ? (user["id"] as string) : null;
    if (!email || !id) return null;
    return {
      id,
      email,
      name: (user?.["name"] as string | null) ?? null,
      image: (user?.["image"] as string | null) ?? null,
      emailVerified: Boolean(user?.["emailVerified"]),
    };
  } catch {
    return null;
  }
}

type Row = Record<string, unknown>;

/**
 * Bridges a Neon Auth identity onto `public.users`.
 *
 * Existing members keep their original row (matched on the normalised e-mail),
 * so no foreign key ever changes. First-time members get a row created here.
 */
export async function bridgeIdentity(identity: NeonAuthIdentity): Promise<SessionUser | null> {
  const email = identity.email.trim().toLowerCase();
  const { toSessionUser } = await import("@/lib/auth/session.server");

  const existing = (await sql`
    select id, email, email_confirmed_at, user_metadata, app_metadata, created_at,
           last_sign_in_at, is_disabled
      from public.users
     where email_normalized = ${email}
     limit 1
  `) as Row[];

  let row = existing[0] ?? null;

  if (row) {
    if (row["is_disabled"]) return null;
    const meta = (row["user_metadata"] as Record<string, unknown> | null) ?? {};
    if (meta["neon_auth_id"] !== identity.id) {
      await sql`
        update public.users
           set user_metadata = coalesce(user_metadata, '{}'::jsonb)
                             || ${JSON.stringify({ neon_auth_id: identity.id })}::jsonb,
               email_confirmed_at = coalesce(email_confirmed_at,
                                             ${identity.emailVerified ? new Date().toISOString() : null}),
               last_sign_in_at = now()
         where id = ${row["id"] as string}
      `;
    } else {
      await sql`update public.users set last_sign_in_at = now() where id = ${row["id"] as string}`;
    }
  } else {
    const metadata = {
      neon_auth_id: identity.id,
      full_name: identity.name,
      avatar_url: identity.image,
    };
    const inserted = (await sql`
      insert into public.users (email, password_hash, user_metadata, email_confirmed_at,
                                last_sign_in_at)
      values (${identity.email}, null, ${JSON.stringify(metadata)}::jsonb,
              ${identity.emailVerified ? new Date().toISOString() : null}, now())
      on conflict (email_normalized) do update set last_sign_in_at = now()
      returning id, email, email_confirmed_at, user_metadata, app_metadata, created_at,
                last_sign_in_at
    `) as Row[];
    row = inserted[0] ?? null;
    if (row) {
      const { ensureOwnerAdmin } = await import("@/lib/auth/owner-admin.server");
      await ensureOwnerAdmin(row["id"] as string, email);
    }
  }

  if (!row) return null;
  return toSessionUser(row);
}

/** Full resolve: Neon Auth session → the matching `public.users` record. */
export async function getBridgedUser(): Promise<SessionUser | null> {
  const identity = await getNeonAuthIdentity();
  if (!identity) return null;
  return bridgeIdentity(identity);
}
