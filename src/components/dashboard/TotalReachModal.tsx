import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLATFORM_LABEL } from "@/lib/social-verify";
import { formatReach, relativeTimeNl, type ReachSettings } from "@/lib/total-reach";
import {
  getReachSettings,
  syncFollowersNow,
  updateReachSettings,
} from "@/lib/total-reach.functions";

/**
 * Studio-modal "Totaal bereik / volgers tonen": aan/uit, per platform
 * mee-tellen, handmatige override en handmatige sync.
 */
export function TotalReachModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [settings, setSettings] = useState<ReachSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manualOn, setManualOn] = useState(false);
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    getReachSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setManualOn(data.manualCount !== null);
        setManualValue(data.manualCount === null ? "" : String(data.manualCount));
      })
      .catch(() => toast.error("Instellingen konden niet geladen worden"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  async function persist(patch: Parameters<typeof updateReachSettings>[0]["data"]) {
    setBusy(true);
    try {
      const next = await updateReachSettings({ data: patch });
      setSettings(next);
      return next;
    } catch {
      toast.error("Opslaan mislukt");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    try {
      const next = await syncFollowersNow();
      setSettings(next);
      toast.success("Volgeraantallen bijgewerkt");
    } catch {
      toast.error("Synchroniseren mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSave() {
    const parsed = manualOn ? Math.max(0, Number.parseInt(manualValue || "0", 10) || 0) : null;
    const next = await persist({ manualCount: parsed });
    if (next)
      toast.success(
        parsed === null ? "Automatische telling actief" : "Handmatig totaal opgeslagen",
      );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Totaal bereik / volgers tonen</DialogTitle>
          <DialogDescription>
            Toon één compacte badge met je totale bereik over al je sociale accounts. We halen de
            aantallen op via publieke API&apos;s en OpenGraph-data — zonder betaalde API-sleutels.
          </DialogDescription>
        </DialogHeader>

        {loading || !settings ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="text-sm font-medium">Toon totaal bereik op mijn profiel</p>
                <p className="text-xs text-muted-foreground">
                  Huidig totaal: <strong>{formatReach(settings.totalReachCount)}</strong>
                </p>
              </div>
              <Switch
                checked={settings.showTotalReach}
                disabled={busy}
                onCheckedChange={(checked) => void persist({ showTotalReach: checked })}
                aria-label="Toon totaal bereik op mijn profiel"
              />
            </div>

            <div className="space-y-2">
              <p className="px-1 text-sm font-medium">Meegerekende accounts</p>
              {settings.accounts.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">
                  Nog geen sociale accounts gekoppeld.
                </p>
              ) : (
                <ul className="space-y-2">
                  {settings.accounts.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {PLATFORM_LABEL[account.platform]}{" "}
                          <span className="text-muted-foreground">
                            @{account.username.replace(/^@/, "")}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatReach(account.followerCount)} volgers ·{" "}
                          {relativeTimeNl(account.lastSyncedAt)}
                        </p>
                      </div>
                      <Switch
                        checked={account.autoSyncEnabled}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          void persist({ accounts: [{ id: account.id, autoSyncEnabled: checked }] })
                        }
                        aria-label={`${PLATFORM_LABEL[account.platform]} meetellen`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Handmatig aantal instellen</p>
                <Switch
                  checked={manualOn}
                  disabled={busy}
                  onCheckedChange={(checked) => {
                    setManualOn(checked);
                    if (!checked) void persist({ manualCount: null });
                  }}
                  aria-label="Handmatig aantal instellen"
                />
              </div>
              {manualOn && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={manualValue}
                    onChange={(event) => setManualValue(event.target.value)}
                    placeholder="Bijv. 24800"
                  />
                  <Button type="button" onClick={() => void handleManualSave()} disabled={busy}>
                    Opslaan
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">
                Laatst bijgewerkt: {relativeTimeNl(settings.lastSyncedAt)}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSync()}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                )}
                Nu synchroniseren
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Knop + modal in één, klaar om in de Studio te plaatsen. */
export function TotalReachButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Users className="mr-2 h-4 w-4" aria-hidden /> Totaal bereik / volgers tonen
      </Button>
      <TotalReachModal open={open} onOpenChange={setOpen} />
    </>
  );
}
