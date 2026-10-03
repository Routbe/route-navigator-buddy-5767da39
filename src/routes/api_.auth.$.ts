import { createFileRoute } from "@tanstack/react-router";

/**
 * ROUT's own auth endpoint (self-hosted Better Auth). Sign-up, sign-in,
 * magic links, social OAuth callbacks (`/api/auth/callback/<provider>`) and
 * sign-out all terminate here — no managed middleman.
 */
async function handle({ request }: { request: Request }) {
  const { createRoutAuth } = await import("@/lib/better-auth.server");
  return createRoutAuth(request).handler(request);
}

export const Route = createFileRoute("/api_/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
