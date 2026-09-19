import { createFileRoute } from "@tanstack/react-router";

const STATE_COOKIE = "rout_bsky_state";

/** Stap 1 van de Bluesky-login: stuur het lid door naar zijn eigen server. */
export const Route = createFileRoute("/api_/public/bluesky/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const handle = url.searchParams.get("handle") ?? "";
        const next = url.searchParams.get("next") ?? "/dashboard";
        const { canonicalAppUrl, isApprovedHost } = await import("@/lib/app-url");
        const host = request.headers.get("host") ?? "";
        const origin =
          process.env["NEXT_PUBLIC_APP_URL"]?.replace(/\/$/, "") ||
          (isApprovedHost(host) && !host.startsWith("localhost")
            ? `https://${host}`
            : canonicalAppUrl());

        try {
          const { startBlueskyLogin, sealBlueskyState } = await import("@/lib/bluesky-auth.server");
          const { url: authorizeUrl, state } = await startBlueskyLogin({ handle, origin, next });
          const sealed = await sealBlueskyState(state);
          return new Response(null, {
            status: 302,
            headers: {
              location: authorizeUrl,
              "set-cookie": `${STATE_COOKIE}=${encodeURIComponent(sealed)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Bluesky-login mislukte.";
          return new Response(null, {
            status: 302,
            headers: { location: `/auth/sign-in?bluesky_error=${encodeURIComponent(message)}` },
          });
        }
      },
    },
  },
});
