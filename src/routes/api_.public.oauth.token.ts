import { createFileRoute } from "@tanstack/react-router";

/**
 * Token-endpoint: wisselt een autorisatiecode in voor een id- en access-token.
 * Verplicht PKCE S256; codes zijn eenmalig en kortlevend.
 */
export const Route = createFileRoute("/api_/public/oauth/token")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "access-control-allow-origin": "*" };
        const fail = (code: string, description: string, status = 400) =>
          Response.json({ error: code, error_description: description }, { status, headers: cors });

        let form: URLSearchParams;
        try {
          const contentType = request.headers.get("content-type") ?? "";
          form = contentType.includes("application/json")
            ? new URLSearchParams(Object.entries((await request.json()) as Record<string, string>))
            : new URLSearchParams(await request.text());
        } catch {
          return fail("invalid_request", "De aanvraag kon niet gelezen worden.");
        }

        if (form.get("grant_type") !== "authorization_code") {
          return fail("unsupported_grant_type", "Alleen authorization_code wordt ondersteund.");
        }
        const code = form.get("code");
        const redirectUri = form.get("redirect_uri");
        const codeVerifier = form.get("code_verifier");
        let clientId = form.get("client_id");
        let clientSecret = form.get("client_secret");

        const basic = request.headers.get("authorization");
        if (basic?.toLowerCase().startsWith("basic ")) {
          try {
            const [id, secret] = atob(basic.slice(6)).split(":");
            clientId = clientId ?? decodeURIComponent(id ?? "");
            clientSecret = clientSecret ?? decodeURIComponent(secret ?? "");
          } catch {
            return fail("invalid_client", "Ongeldige client-authenticatie.", 401);
          }
        }

        if (!code || !redirectUri || !codeVerifier || !clientId) {
          return fail("invalid_request", "Verplichte velden ontbreken.");
        }

        try {
          const { exchangeAuthorizationCode } = await import("@/lib/oauth/provider.server");
          const tokens = await exchangeAuthorizationCode({
            code,
            clientId,
            clientSecret,
            redirectUri,
            codeVerifier,
          });
          return Response.json(tokens, {
            headers: { ...cors, "cache-control": "no-store", pragma: "no-cache" },
          });
        } catch (error) {
          const anyError = error as { code?: string; message?: string };
          return fail(
            anyError.code ?? "invalid_grant",
            anyError.message ?? "De code kon niet ingewisseld worden.",
            anyError.code === "invalid_client" ? 401 : 400,
          );
        }
      },
    },
  },
});
