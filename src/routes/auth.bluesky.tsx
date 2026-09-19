import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { finishBlueskyLogin, getPendingBlueskyLogin } from "@/lib/bluesky-login.functions";

/**
 * Laatste stap na een geslaagde Bluesky-aanmelding: Bluesky geeft geen
 * e-mailadres door, en zonder e-mailadres bestaat er geen ROUT-account.
 */
export const Route = createFileRoute("/auth/bluesky")({
  head: () => ({
    meta: [
      { title: "Bluesky koppelen aan ROUT" },
      {
        name: "description",
        content: "Rond je aanmelding met Bluesky af door je e-mailadres op te geven.",
      },
      { property: "og:title", content: "Bluesky koppelen aan ROUT" },
      {
        property: "og:description",
        content: "Rond je aanmelding met Bluesky af door je e-mailadres op te geven.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlueskyEmailStep,
});

function BlueskyEmailStep() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [handle, setHandle] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getPendingBlueskyLogin({})
      .then((res) => setHandle(res.handle))
      .catch(() => setHandle(null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await finishBlueskyLogin({ data: { email } });
      await refresh();
      void nav({ to: res.next as never, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dat lukte niet. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h1 className="mb-1 font-display text-2xl text-foreground">Nog één stap</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            {handle
              ? `We hebben ${handle} bij Bluesky bevestigd. Geef je e-mailadres op om je ROUT-account af te ronden.`
              : "Geef je e-mailadres op om je ROUT-account af te ronden."}
          </p>
          <form onSubmit={submit} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="bsky-email" className="text-sm">
                E-mailadres
              </Label>
              <Input
                id="bsky-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@domein.be"
                autoComplete="email"
                required
                className="h-10 rounded-lg"
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-lg font-medium" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Account afronden"}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
