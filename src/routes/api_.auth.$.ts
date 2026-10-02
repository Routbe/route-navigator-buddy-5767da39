import { createFileRoute } from "@tanstack/react-router";
import { handleAuthProxyRequest } from "@neondatabase/neon-js/auth/server";
import { NEON_AUTH_BASE_URL, getCookieSecret } from "@/lib/neon-auth.server";
import { canonicalAppUrl, isApprovedHost } from "@/lib/app-url";

/**
 * Same-origin proxy for Neon Auth.
 *
 * The browser client calls `/api/auth/*`; this handler forwards to the Neon
 * Auth service and rewrites the session cookies so they are first-party. That
 * is what lets the server read the session on every request.
 *
 * Neon Auth only trusts the origins configured in its console (rout.be). A
 * same-origin request from another host serving this app (preview, www, a
 * deploy URL) is rewritten to the canonical origin, so e-mail sign-in,
 * sign-up and magic links work everywhere. Cross-site requests are left
 * untouched and are still rejected upstream.
 */
function normalizeOrigin(request: Request): Request {
  const origin = request.headers.get("origin");
  if (!origin) return request;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return request;
  }
  if (isApprovedHost(originHost)) return request;

  const servingHosts = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    new URL(request.url).host,
  ]
    .filter(Boolean)
    .flatMap((h) => (h as string).split(","))
    .map((h) => h.trim().toLowerCase());
  if (!servingHosts.includes(originHost)) return request;

  const headers = new Headers(request.headers);
  headers.set("origin", canonicalAppUrl());
  headers.delete("referer");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(request.url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });
}

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  return handleAuthProxyRequest({
    request: normalizeOrigin(request),
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
