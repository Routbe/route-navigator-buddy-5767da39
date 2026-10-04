import { createAuthClient } from "better-auth/react";
import { genericOAuthClient, magicLinkClient } from "better-auth/client/plugins";

/**
 * Browser client for ROUT's own Better Auth server (`/api/auth/*`).
 * Always same-origin: no third-party identity service in between.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost" : window.location.origin,
  basePath: "/api/auth",
  plugins: [genericOAuthClient(), magicLinkClient()],
});
