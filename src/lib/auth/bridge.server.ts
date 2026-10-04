import type { SessionUser } from "@/lib/auth/session.server";
import { sql } from "@/lib/neon";

/**
 * Better Auth (self-hosted, System A) → `public.users` bridge.
 *
 * Better Auth owns credentials and the session cookie (tables in the
 * `neon_auth` schema of our own Postgres). Every identity is mapped onto the
 * existing `public.users` row so all foreign keys keep resolving. The
 * metadata key `neon_auth_id` is kept for backwards compatibility: it holds
 * the Better Auth user id.
 */

export type RoutIdentity = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
};

/** Reads the Better Auth session for the in-flight request; null when signed out. */
export async function getAuthIdentity(): Promise<RoutIdentity | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (!request) return null;
    const { createRoutAuth } = await import("@/lib/better-auth.server");
    const result = await createRoutAuth(request).api.getSession({ headers: request.headers });
    const user = result?.user as Record<string, unknown> | undefined;
    const id = typeof user?.["id"] === "string" ? (user["id"] as string) : null;
    const email = typeof user?.["email"] === "string" ? (user["email"] as string) : null;
    if (!id || !email) return null;
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
 * Bridges a Better Auth identity onto `public.users`.
 *
 * Existing members keep their original row (matched on the normalised e-mail),
 * so no foreign key ever changes. First-time members get a row created here.
 */
export async function bridgeIdentity(identity: RoutIdentity): Promise<SessionUser | null> {
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
    // Nooit samenvoegen op een onbevestigd e-mailadres (bv. Infomaniak/OIDC
    // zonder email_verified): alleen een al gekoppelde identiteit mag binnen.
    if (meta["neon_auth_id"] !== identity.id && !identity.emailVerified) return null;
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
    if (row && identity.emailVerified) {
      const { ensureOwnerAdmin } = await import("@/lib/auth/owner-admin.server");
      await ensureOwnerAdmin(row["id"] as string, email);
    }
  }

  if (!row) return null;
  return toSessionUser(row);
}

/** Full resolve: Better Auth session → the matching `public.users` record. */
export async function getBridgedUser(): Promise<SessionUser | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;
  return bridgeIdentity(identity);
}
