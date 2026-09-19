import { createFileRoute } from "@tanstack/react-router";
import { handleAuthProxyRequest } from "@neondatabase/neon-js/auth/server";
import { NEON_AUTH_BASE_URL, getCookieSecret } from "@/lib/neon-auth.server";

/**
 * Same-origin proxy for Neon Auth.
 *
 * The browser client calls `/api/auth/*`; this handler forwards to the Neon
 * Auth service and rewrites the session cookies so they are first-party. That
 * is what lets the server read the session on every request.
 */
async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  return handleAuthProxyRequest({
    request,
    path: params._splat ?? "",
    baseUrl: NEON_AUTH_BASE_URL,
    cookieSecret: getCookieSecret(),
    sameSite: "lax",
  });
}

export const Route = createFileRoute("/api_/auth/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
    },
  },
});
