import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  consoleAccess,
  deleteOAuthClient,
  listOAuthClients,
  rotateOAuthSecret,
  saveOAuthClient,
} from "@/lib/oauth/console.functions";

type ClientRow = {
  id: string;
  clientId: string;
  name: string;
  logoUrl: string | null;
  homepageUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  redirectUris: string[];
  scopes: string[];
  status: string;
  hasSecret: boolean;
  createdAt: string;
};

const SCOPES = [
  { id: "openid", label: "openid — bevestigt wie de gebruiker is (verplicht)" },
  { id: "profile", label: "profile — naam, handle en profielfoto" },
  { id: "email", label: "email — e-mailadres en of het bevestigd is" },
];

const empty = {
  id: undefined as string | undefined,
  name: "",
  logoUrl: "",
  homepageUrl: "",
  privacyUrl: "",
  termsUrl: "",
  redirectUris: "",
  scopes: ["openid", "profile"],
};

/** Google-Cloud-achtige console om "Login met ROUT"-apps te beheren. */
export function OAuthConsole() {
  const access = useServerFn(consoleAccess);
  const list = useServerFn(listOAuthClients);
  const save = useServerFn(saveOAuthClient);
  const remove = useServerFn(deleteOAuthClient);
  const rotate = useServerFn(rotateOAuthSecret);

  const [verified, setVerified] = useState<boolean | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ clientId: string; value: string } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setClients((await list()) as ClientRow[]);
    } catch {
      /* stil: toegang wordt apart gemeld */
    }
  }, [list]);

  useEffect(() => {
    access()
      .then(async (r) => {
        setVerified(r.verified);
        if (r.verified) await refresh();
      })
      .catch(() => setVerified(false));
  }, [access, refresh]);

  if (verified === null) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!verified) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-xl text-foreground">Login met ROUT</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          De Developer Console is beschikbaar zodra je account geverifieerd is. Zo weten gebruikers
          altijd wie er achter een app zit.
        </p>
      </section>
    );
  }

  function startNew() {
    setForm({ ...empty });
    setEditing(true);
    setSecret(null);
  }

  function startEdit(row: ClientRow) {
    setForm({
      id: row.id,
      name: row.name,
      logoUrl: row.logoUrl ?? "",
      homepageUrl: row.homepageUrl ?? "",
      privacyUrl: row.privacyUrl ?? "",
      termsUrl: row.termsUrl ?? "",
      redirectUris: row.redirectUris.join("\n"),
      scopes: row.scopes,
    });
    setEditing(true);
    setSecret(null);
  }

  async function submit() {
    setBusy(true);
    try {
      const result = (await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name.trim(),
          logoUrl: form.logoUrl.trim() || null,
          homepageUrl: form.homepageUrl.trim() || null,
          privacyUrl: form.privacyUrl.trim() || null,
          termsUrl: form.termsUrl.trim() || null,
          redirectUris: form.redirectUris
            .split("\n")
            .map((u) => u.trim())
            .filter(Boolean),
          scopes: form.scopes,
        },
      })) as { client: ClientRow; clientSecret: string | null };
      toast.success(form.id ? "App bijgewerkt" : "App aangemaakt");
      if (result.clientSecret) {
        setSecret({ clientId: result.client.clientId, value: result.clientSecret });
        setRevealed(true);
      }
      setEditing(false);
      await refresh();
    } catch (error) {
      toast.error((error as Error).message || "Opslaan lukte niet");
    } finally {
      setBusy(false);
    }
  }

  async function onRotate(row: ClientRow) {
    setBusy(true);
    try {
      const result = (await rotate({ data: { id: row.id } })) as { clientSecret: string };
      setSecret({ clientId: row.clientId, value: result.clientSecret });
      setRevealed(true);
      toast.success("Nieuwe sleutel gemaakt — kopieer hem nu, hij wordt niet opnieuw getoond.");
    } catch (error) {
      toast.error((error as Error).message || "Roteren lukte niet");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: ClientRow) {
    if (!window.confirm(`"${row.name}" definitief verwijderen?`)) return;
    await remove({ data: { id: row.id } });
    await refresh();
    toast.success("App verwijderd");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-foreground">Login met ROUT</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registreer je app en laat mensen aanmelden met hun ROUT-identiteit (OAuth 2.1 / OIDC,
            met verplichte PKCE).
          </p>
        </div>
        <Button onClick={startNew} size="sm">
          <Plus className="h-4 w-4" /> Nieuwe app
        </Button>
      </div>

      {secret && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            Clientsecret voor {secret.clientId} — één keer zichtbaar
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
              {revealed ? secret.value : "•".repeat(32)}
            </code>
            <Button size="sm" variant="outline" onClick={() => setRevealed((v) => !v)}>
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(secret.value);
                toast.success("Gekopieerd");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <Tabs defaultValue="branding">
            <TabsList>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="redirects">Terugkeeradressen</TabsTrigger>
              <TabsTrigger value="scopes">Scopes</TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="mt-4 space-y-3">
              <div>
                <Label htmlFor="oa-name">Naam van de app</Label>
                <Input
                  id="oa-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="oa-logo">Logo-URL</Label>
                <Input
                  id="oa-logo"
                  placeholder="https://…/logo.png"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="oa-home">Website</Label>
                  <Input
                    id="oa-home"
                    value={form.homepageUrl}
                    onChange={(e) => setForm({ ...form, homepageUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="oa-priv">Privacybeleid</Label>
                  <Input
                    id="oa-priv"
                    value={form.privacyUrl}
                    onChange={(e) => setForm({ ...form, privacyUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="oa-terms">Voorwaarden</Label>
                  <Input
                    id="oa-terms"
                    value={form.termsUrl}
                    onChange={(e) => setForm({ ...form, termsUrl: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="redirects" className="mt-4 space-y-2">
              <Label htmlFor="oa-uris">Toegestane terugkeeradressen — één per lijn</Label>
              <textarea
                id="oa-uris"
                rows={4}
                className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs"
                placeholder={"https://jouwapp.be/callback\nhttp://localhost:3000/callback"}
                value={form.redirectUris}
                onChange={(e) => setForm({ ...form, redirectUris: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Alleen https; http mag uitsluitend voor localhost tijdens ontwikkeling. Adressen
                worden letterlijk vergeleken.
              </p>
            </TabsContent>

            <TabsContent value="scopes" className="mt-4 space-y-2">
              {SCOPES.map((scope) => (
                <label key={scope.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(scope.id)}
                    disabled={scope.id === "openid"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scopes: e.target.checked
                          ? [...form.scopes, scope.id]
                          : form.scopes.filter((s) => s !== scope.id),
                      })
                    }
                  />
                  {scope.label}
                </label>
              ))}
            </TabsContent>
          </Tabs>

          <div className="mt-5 flex gap-2">
            <Button onClick={submit} disabled={busy || !form.name.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {clients.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground">Je hebt nog geen apps geregistreerd.</p>
        )}
        {clients.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.clientId}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {row.scopes.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
                <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                  Bewerken
                </Button>
                <Button size="sm" variant="outline" onClick={() => void onRotate(row)}>
                  <RefreshCw className="h-4 w-4" /> Nieuwe sleutel
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void onDelete(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {row.redirectUris.length > 0 && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {row.redirectUris.join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
