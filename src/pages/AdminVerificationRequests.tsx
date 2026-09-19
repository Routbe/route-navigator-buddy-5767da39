import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminListBusinessRequests,
  adminListInfluencerRequests,
  adminReviewBusinessRequest,
  adminReviewInfluencerRequest,
} from "@/lib/verification-requests.functions";

/**
 * Wachtrij voor manuele goedkeuring: bedrijven (zwarte badge, pagina op de
 * officiële domeinnaam) en influencers (roze badge, één van vier namen).
 */

type Row = Record<string, unknown>;

const text = (row: Row, key: string) => {
  const value = row[key];
  return value == null ? "" : String(value);
};

export default function AdminVerificationRequests() {
  const listBusiness = useServerFn(adminListBusinessRequests);
  const listInfluencer = useServerFn(adminListInfluencerRequests);
  const reviewBusiness = useServerFn(adminReviewBusinessRequest);
  const reviewInfluencer = useServerFn(adminReviewInfluencerRequest);

  const [businesses, setBusinesses] = useState<Row[]>([]);
  const [influencers, setInfluencers] = useState<Row[]>([]);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setBusinesses((await listBusiness({ data: {} })) as Row[]);
      setInfluencers((await listInfluencer({ data: {} })) as Row[]);
    } catch {
      toast.error("Kon de wachtrij niet laden.");
    }
  }, [listBusiness, listInfluencer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success("Verwerkt.");
      await refresh();
    } catch {
      toast.error("Actie mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Bedrijfsverificaties</h1>
        {businesses.length === 0 && (
          <p className="text-sm text-muted-foreground">Geen openstaande aanvragen.</p>
        )}
        {businesses.map((row) => (
          <article key={text(row, "id")} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">
              {text(row, "company_name")} · {text(row, "vat_number")}
            </p>
            <p className="text-muted-foreground">
              Domein: rout.be/{text(row, "website_domain")} — account @{text(row, "username")}
            </p>
            {text(row, "address") && (
              <p className="text-muted-foreground">{text(row, "address")}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    reviewBusiness({ data: { requestId: text(row, "id"), approve: true } }),
                  )
                }
              >
                Goedkeuren
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    reviewBusiness({ data: { requestId: text(row, "id"), approve: false } }),
                  )
                }
              >
                Afwijzen
              </Button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Influenceraanvragen</h2>
        {influencers.length === 0 && (
          <p className="text-sm text-muted-foreground">Geen openstaande aanvragen.</p>
        )}
        {influencers.map((row) => {
          const id = text(row, "id");
          const choices = (row["handle_choices"] as string[] | null) ?? [];
          const links = (row["social_links"] as string[] | null) ?? [];
          return (
            <article key={id} className="rounded-xl border p-4 text-sm">
              <p className="font-medium">@{text(row, "username")}</p>
              <p className="text-muted-foreground">Naamkeuzes: {choices.join(" · ") || "—"}</p>
              <p className="break-all text-muted-foreground">
                Kanalen: {Array.isArray(links) ? links.join(" · ") : ""}
              </p>
              <p className="text-muted-foreground">
                Bedrag: € {(Number(row["fee_cents"] ?? 0) / 100).toFixed(2)} ·{" "}
                {row["paid"] ? "betaald" : "niet betaald"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  className="h-9 w-48"
                  placeholder={choices[0] ?? "handle"}
                  value={handles[id] ?? ""}
                  onChange={(e) => setHandles((prev) => ({ ...prev, [id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void act(() =>
                      reviewInfluencer({
                        data: { requestId: id, approve: true, handle: handles[id] || null },
                      }),
                    )
                  }
                >
                  Goedkeuren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void act(() =>
                      reviewInfluencer({ data: { requestId: id, approve: false } }),
                    )
                  }
                >
                  Afwijzen
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
