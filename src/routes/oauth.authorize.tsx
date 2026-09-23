import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RoutLogo } from "@/components/RoutLogo";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  describeAuthorizeRequest,
  decideAuthorizeRequest,
  type AuthorizePrompt,
} from "@/lib/oauth/console.functions";

type Search = {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  response_type?: string;
};

export const Route = createFileRoute("/oauth/authorize")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    client_id: typeof search["client_id"] === "string" ? search["client_id"] : undefined,
    redirect_uri: typeof search["redirect_uri"] === "string" ? search["redirect_uri"] : undefined,
    scope: typeof search["scope"] === "string" ? search["scope"] : undefined,
    state: typeof search["state"] === "string" ? search["state"] : undefined,
    nonce: typeof search["nonce"] === "string" ? search["nonce"] : undefined,
    code_challenge:
      typeof search["code_challenge"] === "string" ? search["code_challenge"] : undefined,
    code_challenge_method:
      typeof search["code_challenge_method"] === "string"
        ? search["code_challenge_method"]
        : undefined,
    response_type:
      typeof search["response_type"] === "string" ? search["response_type"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Toestemming geven — Login met ROUT" },
      {
        name: "description",
        content: "Bekijk welke gegevens een app van je ROUT-account wil zien en kies zelf.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Toestemming geven — Login met ROUT" },
      {
        property: "og:description",
        content: "Bekijk welke gegevens een app van je ROUT-account wil zien en kies zelf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthorizePage,
});

const SCOPE_TEXT: Record<string, string> = {
  openid: "Bevestigen dat jij het bent (je ROUT-accountnummer).",
  profile: "Je publieke naam, handle en profielfoto bekijken.",
  email: "Je e-mailadres bekijken en of het bevestigd is.",
};

function AuthorizePage() {
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const describe = useServerFn(describeAuthorizeRequest);
  const decide = useServerFn(decideAuthorizeRequest);
  const [prompt, setPrompt] = useState<AuthorizePrompt | null>(null);
  const [busy, setBusy] = useState(false);

  const payload = {
    clientId: search.client_id ?? "",
    redirectUri: search.redirect_uri ?? "",
    scope: search.scope ?? "openid",
    state: search.state ?? null,
    nonce: search.nonce ?? null,
    codeChallenge: search.code_challenge ?? "",
    codeChallengeMethod: search.code_challenge_method ?? "",
  };

  // Niet ingelogd? Eerst aanmelden, daarna terug naar exact dit scherm.
  useEffect(() => {
    if (loading || user) return;
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth/sign-in?next=${encodeURIComponent(next)}`;
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    if (search.response_type && search.response_type !== "code") {
      setPrompt({ ok: false, error: "Alleen de veilige code-flow wordt ondersteund." });
      return;
    }
    if (!payload.clientId || !payload.redirectUri || !payload.codeChallenge) {
      setPrompt({ ok: false, error: "Deze aanvraag mist verplichte gegevens." });
      return;
    }
    describe({ data: payload })
      .then(setPrompt)
      .catch(() => setPrompt({ ok: false, error: "De aanvraag kon niet gecontroleerd worden." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search.client_id, search.redirect_uri, search.scope, search.code_challenge]);

  async function choose(allow: boolean) {
    setBusy(true);
    try {
      const result = await decide({ data: { ...payload, allow } });
      if ("redirectTo" in result) window.location.href = result.redirectTo;
      else setPrompt({ ok: false, error: result.error });
    } catch {
      setPrompt({ ok: false, error: "Er ging iets mis. Probeer het opnieuw." });
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !prompt) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!prompt.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="font-display text-xl text-foreground">Deze aanvraag klopt niet</h1>
          <p className="mt-2 text-sm text-muted-foreground">{prompt.error}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            We sturen je hierbij niet terug naar de app: dat zou onveilig zijn.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-center gap-4">
          <RoutLogo className="h-8 w-auto" />
          <span className="text-muted-foreground">+</span>
          {prompt.app?.logoUrl ? (
            <img
              src={prompt.app.logoUrl}
              alt=""
              className="h-8 w-8 rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-xs font-medium text-muted-foreground">
              {prompt.app?.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="mt-5 text-center font-display text-xl text-foreground">
          {prompt.app?.name} wil je aanmelden met ROUT
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Je bent aangemeld als {prompt.account?.email}
        </p>

        <ul className="mt-5 space-y-2">
          {prompt.scopes?.map((scope) => (
            <li key={scope} className="flex gap-2 rounded-xl border border-border p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{SCOPE_TEXT[scope] ?? scope}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => choose(false)}>
            Weigeren
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => choose(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toestaan"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {prompt.app?.privacyUrl && (
            <a href={prompt.app.privacyUrl} className="underline" rel="noreferrer noopener">
              Privacybeleid
            </a>
          )}
          {prompt.app?.privacyUrl && prompt.app?.termsUrl ? " · " : ""}
          {prompt.app?.termsUrl && (
            <a href={prompt.app.termsUrl} className="underline" rel="noreferrer noopener">
              Gebruiksvoorwaarden
            </a>
          )}
        </p>
      </div>
    </main>
  );
}
