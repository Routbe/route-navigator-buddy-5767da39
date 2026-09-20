import { createFileRoute } from "@tanstack/react-router";

/**
 * Stap 2 van de Mastodon-login. De instance stuurt het lid hier terug met een
 * code; die wisselen we in, we controleren het account en zetten daarna de
 * eigen ROUT-sessiecookie.
 */
export const Route = createFileRoute("/auth_/mastodon/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const failure = url.searchParams.get("error_description") ?? url.searchParams.get("error");

        const fail = (message: string) =>
          new Response(null, {
            status: 302,
            headers: { location: `/auth/sign-in?mastodon_error=${encodeURIComponent(message)}` },
          });

        if (failure || !code || !state) {
          return fail(failure ?? "De aanmelding bij je Fediverse-server is afgebroken.");
        }

        try {
          const { completeMastodonCallback } = await import("@/lib/mastodon-auth.server");
          const { createAppSessionValue } = await import("@/lib/app-session.server");
          const result = await completeMastodonCallback({ code, state });
          const session = await createAppSessionValue(result.userId);
          return new Response(null, {
            status: 302,
            headers: {
              location: result.next,
              "set-cookie": `rout_session=${encodeURIComponent(session)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Aanmelden via Mastodon mislukte.";
          return fail(message);
        }
      },
    },
  },
});
