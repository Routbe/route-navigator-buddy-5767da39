import { createServerFn } from "@tanstack/react-start";

/**
 * Laatste stap van de Bluesky-login: het geverifieerde Bluesky-account aan een
 * e-mailadres hangen. Zonder e-mailadres maken we geen ROUT-account aan.
 */

const PENDING_COOKIE = "rout_bsky_pending";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Toont welk Bluesky-account op een e-mailadres wacht. */
export const getPendingBlueskyLogin = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const { readCookie, readSignedValue } = await import("@/lib/app-session.server");
  const raw = readCookie(getRequestHeader("cookie") ?? "", PENDING_COOKIE);
  const payload = await readSignedValue(raw);
  if (!payload) return { handle: null as string | null };
  const [, handle] = payload.split("|");
  return { handle: handle ?? null };
});

export const finishBlueskyLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) throw new Error("Vul een geldig e-mailadres in.");
    return { email };
  })
  .handler(async ({ data }) => {
    const { getRequestHeader, setCookie } = await import("@tanstack/react-start/server");
    const { readCookie, readSignedValue, createAppSessionValue, APP_SESSION_COOKIE, APP_SESSION_COOKIE_OPTIONS } =
      await import("@/lib/app-session.server");

    const raw = readCookie(getRequestHeader("cookie") ?? "", PENDING_COOKIE);
    const payload = await readSignedValue(raw);
    if (!payload) throw new Error("Deze aanmelding is verlopen. Begin opnieuw bij Bluesky.");
    const [did, handle, next] = payload.split("|") as [string, string, string | undefined];

    const { findUserByEmail, createUser, updateUserMetadata } = await import(
      "@/lib/auth/users.server"
    );
    const existing = await findUserByEmail(data.email);
    const metadata = {
      provider_kind: "bluesky",
      bluesky_did: did,
      bluesky_handle: handle,
      full_name: handle,
    };

    const userId = existing
      ? String(existing["id"])
      : (await createUser({ email: data.email, metadata, emailConfirmed: false })).id;
    if (existing) await updateUserMetadata(userId, metadata);

    const { linkIdentity } = await import("@/lib/identities.server");
    await linkIdentity({
      userId,
      provider: "bluesky",
      providerAccountId: did,
      email: data.email,
      displayName: handle,
    });

    const { sql } = await import("@/lib/neon");
    await sql`update public.users set last_sign_in_at = now() where id = ${userId}`;

    setCookie(APP_SESSION_COOKIE, await createAppSessionValue(userId), APP_SESSION_COOKIE_OPTIONS as never);
    setCookie(PENDING_COOKIE, "", { path: "/", maxAge: 0 } as never);

    return { ok: true as const, next: next && next.startsWith("/") ? next : "/dashboard" };
  });
