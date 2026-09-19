import { createFileRoute } from "@tanstack/react-router";

const STATE_COOKIE = "rout_bsky_state";
const PENDING_COOKIE = "rout_bsky_pending";

function redirectTo(location: string, cookies: string[] = []) {
  const headers = new Headers({ location });
  cookies.forEach((c) => headers.append("set-cookie", c));
  return new Response(null, { status: 302, headers });
}

/**
 * Stap 2 van de Bluesky-login. Is de Bluesky-account al aan een ROUT-account
 * gekoppeld, dan is het lid meteen ingelogd. Zo niet, dan vragen we eerst een
 * e-mailadres — zonder e-mail bestaat er geen ROUT-account.
 */
export const Route = createFileRoute("/api_/public/bluesky/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const failure = url.searchParams.get("error_description") ?? url.searchParams.get("error");
        const clear = `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;

        if (failure || !code || !returnedState) {
          const message = failure ?? "De aanmelding bij Bluesky is afgebroken.";
          return redirectTo(`/auth/sign-in?bluesky_error=${encodeURIComponent(message)}`, [clear]);
        }

        try {
          const { readCookie, signValue, createAppSessionValue } = await import(
            "@/lib/app-session.server"
          );
          const { openBlueskyState, completeBlueskyLogin } = await import(
            "@/lib/bluesky-auth.server"
          );
          const { canonicalAppUrl, isApprovedHost } = await import("@/lib/app-url");

          const host = request.headers.get("host") ?? "";
          const origin =
            process.env["NEXT_PUBLIC_APP_URL"]?.replace(/\/$/, "") ||
            (isApprovedHost(host) && !host.startsWith("localhost")
              ? `https://${host}`
              : canonicalAppUrl());

          const sealed = readCookie(request.headers.get("cookie") ?? "", STATE_COOKIE);
          if (!sealed) throw new Error("Deze inlogpoging is verlopen. Probeer opnieuw.");
          const state = await openBlueskyState(sealed);
          if (state.state !== returnedState) throw new Error("Deze inlogpoging is niet geldig.");

          const result = await completeBlueskyLogin({ code, state, origin });

          const { sql } = await import("@/lib/neon");
          const rows = (await sql`
            select user_id from public.user_identities
             where provider = 'bluesky' and provider_account_id = ${result.did}
             limit 1
          `) as Record<string, unknown>[];
          const userId = rows[0]?.["user_id"] as string | undefined;

          if (userId) {
            await sql`update public.users set last_sign_in_at = now() where id = ${userId}`;
            const session = await createAppSessionValue(userId);
            return redirectTo(result.next, [
              clear,
              `rout_session=${encodeURIComponent(session)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`,
            ]);
          }

          const pending = await signValue(`${result.did}|${result.handle}|${result.next}`);
          return redirectTo("/auth/bluesky", [
            clear,
            `${PENDING_COOKIE}=${encodeURIComponent(pending)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=900`,
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Bluesky-login mislukte.";
          return redirectTo(`/auth/sign-in?bluesky_error=${encodeURIComponent(message)}`, [clear]);
        }
      },
    },
  },
});
