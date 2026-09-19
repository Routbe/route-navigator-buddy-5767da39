import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BadgeCheck, QrCode, Shield, Sun, Moon } from "lucide-react";
import { profileQrSvg, DEFAULT_PROFILE_QR_STYLE } from "@/lib/profile-qr";

/**
 * Interactieve profielvitrine op de landingspagina.
 *
 * Twee tiers in een tabwisselaar — gratis alias (`rout.be/u/…`) en Pro
 * geverifieerd (`rout.be/…`) — met een live thema-omschakelaar en een
 * QR-overlay die exact dezelfde engine gebruikt als de Studio.
 */

type Showcase = {
  id: string;
  tab: string;
  /** Pad zonder domein, bv. "u/studio" of "jdelplanche". */
  path: string;
  name: string;
  tagline: string;
  badge: "shield" | "verified";
  badgeLabel: string;
  light: { bg: string; card: string; text: string; muted: string; border: string };
  dark: { bg: string; card: string; text: string; muted: string; border: string };
  links: string[];
  widget: string;
};

const SHOWCASES: Showcase[] = [
  {
    id: "free",
    tab: "🛡️ Gratis Alias (rout.be/u/)",
    path: "u/studio",
    name: "ROUT Studio",
    tagline: "Creatief atelier — boek een sessie of blijf op de hoogte.",
    badge: "shield",
    badgeLabel: "Privacy Shield",
    light: { bg: "#FFF6F0", card: "#FFFFFF", text: "#2A1206", muted: "#8A6A56", border: "#F0D9C7" },
    dark: { bg: "#140A06", card: "#1E100A", text: "#FFE9DA", muted: "#B79479", border: "#3A2317" },
    links: ["Nieuwsbrief", "Cal.com boeking", "Instagram", "Pixelfed"],
    widget: "Privacy Shield — alias zonder echte naam",
  },
  {
    id: "pro",
    tab: "✓ Pro Geverifieerd (rout.be/)",
    path: "jdelplanche",
    name: "Jan Delplanche",
    tagline: "Strategic architect — bouwt soevereine software.",
    badge: "verified",
    badgeLabel: "Geverifieerd",
    light: { bg: "#F6F4EF", card: "#FFFFFF", text: "#141414", muted: "#6B6862", border: "#DCD7CC" },
    dark: { bg: "#0F0F11", card: "#17171A", text: "#F4EFE3", muted: "#9B978E", border: "#2A2A30" },
    links: ["Matrix", "GitHub", "Mastodon", "Contact opslaan (vCard)"],
    widget: "Blauwe checkmark + vCard-download",
  },
];

export function ProfileShowcase() {
  const [active, setActive] = useState(0);
  const [dark, setDark] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const item = SHOWCASES[active]!;
  const t = dark ? item.dark : item.light;
  // Beide tiers hebben een echte, aparte voorbeeldpagina in deze app; in de
  // preview-omgeving openen we die op dezelfde origin zodat de link werkt.
  const [origin, setOrigin] = useState("https://rout.be");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${item.path}`;

  const qr = useMemo(
    () =>
      profileQrSvg(
        url,
        {
          ...DEFAULT_PROFILE_QR_STYLE,
          fgColor: t.text,
          bgColor: t.card,
          cornerStyle: "smooth",
        },
        { size: 320 },
      ),
    [url, t.text, t.card],
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-14">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Live voorbeelden
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Eén link, twee niveaus
        </h2>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:mt-6">
        {SHOWCASES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`min-h-10 rounded-full px-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              i === active
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:mt-4">
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          {dark ? (
            <Moon className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Sun className="h-3.5 w-3.5" aria-hidden />
          )}
          {dark ? "Donker thema" : "Licht thema"}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((q) => !q)}
          aria-pressed={showQr}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden /> {showQr ? "Verberg QR" : "Toon QR"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          Open live profiel <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      <div
        className="relative mx-auto mt-5 w-full max-w-xs overflow-hidden rounded-3xl border p-4 text-center transition-colors sm:max-w-sm md:mt-8 md:p-6"
        style={{ background: t.bg, borderColor: t.border, color: t.text }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold md:h-16 md:w-16 md:text-lg"
          style={{ background: t.card, border: `1px solid ${t.border}` }}
        >
          {item.name.slice(0, 2).toUpperCase()}
        </div>
        <h3 className="mt-3 flex items-center justify-center gap-1.5 font-serif text-lg md:text-xl">
          {item.name}
          {item.badge === "verified" ? (
            <BadgeCheck className="h-4 w-4 text-sky-400" aria-label={item.badgeLabel} />
          ) : (
            <Shield className="h-4 w-4 text-emerald-500" aria-label={item.badgeLabel} />
          )}
        </h3>
        <p className="mt-1 font-mono text-xs" style={{ color: t.muted }}>
          rout.be/{item.path}
        </p>
        <p className="mt-2 text-sm" style={{ color: t.muted }}>
          {item.tagline}
        </p>

        <ul className="mt-4 space-y-1.5 md:mt-5 md:space-y-2">
          {item.links.map((label) => (
            <li
              key={label}
              className="flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-medium md:min-h-11 md:px-4"
              style={{ background: t.card, border: `1px solid ${t.border}` }}
            >
              {label}
            </li>
          ))}
        </ul>
        <p
          className="mt-3 text-[11px] uppercase tracking-widest md:mt-4"
          style={{ color: t.muted }}
        >
          {item.widget}
        </p>

        {showQr && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
            style={{ background: `${t.bg}ee` }}
          >
            <div
              className="h-40 w-40 rounded-2xl p-2 [&>svg]:h-full [&>svg]:w-full md:h-56 md:w-56"
              style={{ background: t.card, border: `1px solid ${t.border}` }}
              // Vector-QR uit dezelfde engine als de Studio-export.
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="text-xs" style={{ color: t.muted }}>
              Dynamische ROUT-QR met konijn-embleem
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
