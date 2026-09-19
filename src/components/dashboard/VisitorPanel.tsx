import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Globe, Loader2, Users } from "lucide-react";
import { getMyVisitStats } from "@/lib/visits.functions";
import type { VisitSpace, VisitStats } from "@/lib/visits.server";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SpaceFilter = VisitSpace | "all";

const RANGES = [7, 30, 90] as const;

const LANGUAGE_NAMES: Record<string, string> = {
  nl: "Nederlands",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
};

function languageLabel(locale: string): string {
  if (locale === "unknown") return "—";
  const base = locale.split("-")[0] ?? locale;
  return LANGUAGE_NAMES[base] ?? locale.toUpperCase();
}

/** Compacte staafgrafiek zonder externe library. */
function DayChart({ data, label }: { data: Array<{ date: string; visits: number }>; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.visits));
  if (data.length === 0) return null;
  return (
    <div className="flex h-24 items-end gap-1" role="img" aria-label={label}>
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1" title={`${d.date}: ${d.visits}`}>
          <div
            className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
            style={{ height: `${Math.max(4, (d.visits / max) * 96)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Eye }) {
  return (
    <div className="min-w-0 rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </p>
      <p className="mt-1 text-xl font-medium leading-none">{value}</p>
    </div>
  );
}

/**
 * Bezoekerspaneel: totalen, verloop in de tijd, verdeling per taal en een
 * lijst met de laatste bezoeken. Filterbaar op namespace zodat de `/u/`-lijst
 * los te bekijken is.
 */
export function VisitorPanel({ defaultSpace = "all" }: { defaultSpace?: SpaceFilter }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [days, setDays] = useState<number>(30);
  const [space, setSpace] = useState<SpaceFilter>(defaultSpace);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useServerFn(getMyVisitStats);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await load({ data: { days, space } }));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [load, days, space]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user, refresh]);

  const totalLangVisits = useMemo(
    () => Math.max(1, (stats?.perLanguage ?? []).reduce((sum, l) => sum + l.visits, 0)),
    [stats],
  );

  if (!user) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <Users className="h-4 w-4" aria-hidden /> {t("visits.title")}
        </h2>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">{t("visits.subtitle")}</p>

      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setDays(r)}
            className={cn(
              "h-8 rounded-full border px-3 text-[11px] font-medium transition-colors",
              days === r ? "border-primary/50 bg-primary/10" : "border-border",
            )}
          >
            {t("visits.range.days", { days: String(r) })}
          </button>
        ))}
        <span className="mx-1 hidden w-px bg-border sm:block" aria-hidden />
        {(["all", "root", "alias"] as SpaceFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpace(s)}
            className={cn(
              "h-8 rounded-full border px-3 text-[11px] font-medium transition-colors",
              space === s ? "border-primary/50 bg-primary/10" : "border-border",
            )}
          >
            {t(`visits.space.${s}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label={t("visits.metric.total")} value={stats?.total ?? 0} icon={Eye} />
        <Metric label={t("visits.metric.unique")} value={stats?.unique ?? 0} icon={Users} />
        <Metric label={t("visits.metric.alias")} value={stats?.bySpace.alias ?? 0} icon={Globe} />
      </div>

      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("visits.overTime")}
        </p>
        {stats && stats.perDay.length > 0 ? (
          <DayChart data={stats.perDay} label={t("visits.overTime")} />
        ) : (
          <p className="text-xs text-muted-foreground">{t("visits.empty")}</p>
        )}
      </div>

      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("visits.perLanguage")}
        </p>
        {stats && stats.perLanguage.length > 0 ? (
          <ul className="space-y-1.5">
            {stats.perLanguage.map((l) => (
              <li key={l.locale} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 truncate">{languageLabel(l.locale)}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${(l.visits / totalLangVisits) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                  {l.visits}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t("visits.empty")}</p>
        )}
      </div>

      <div className="rounded-xl border border-border p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("visits.recent")}
        </p>
        {stats && stats.recent.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {stats.recent.map((v, i) => (
              <li key={`${v.at}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5 text-[11px]">
                <span className="font-mono">
                  {v.space === "root" ? `rout.be/${v.handle}` : `rout.be/u/${v.handle}`}
                </span>
                <span className="text-muted-foreground">{languageLabel(v.locale ?? "unknown")}</span>
                {v.country && v.country !== "??" ? (
                  <span className="text-muted-foreground">{v.country}</span>
                ) : null}
                {v.device ? <span className="text-muted-foreground">{v.device}</span> : null}
                <span className="ml-auto text-muted-foreground">
                  {new Date(v.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t("visits.empty")}</p>
        )}
      </div>
    </section>
  );
}
