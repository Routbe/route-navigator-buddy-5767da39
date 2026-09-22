import { createFileRoute } from "@tanstack/react-router";

/** Publieke sleutels waarmee apps een ROUT-id-token kunnen verifiëren. */
export const Route = createFileRoute("/.well-known/jwks.json")({
  server: {
    handlers: {
      GET: async () => {
        const { publicJwks } = await import("@/lib/oauth/provider.server");
        return Response.json(await publicJwks(), {
          headers: { "cache-control": "public, max-age=300" },
        });
      },
    },
  },
});
