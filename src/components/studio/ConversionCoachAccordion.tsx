import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConversionCoach } from "@/components/dashboard/ConversionCoach";
import { auditProfile, hasPrimaryAction, type ConversionFix } from "@/lib/conversion-coach";
import type { ProfileBlock } from "@/lib/profile";
import type { ProfileDisplayPrefs } from "@/lib/profile-display";
import { cn } from "@/lib/utils";

const CTA_EFFECTS: { id: ProfileDisplayPrefs["ctaEffect"]; label: string }[] = [
  { id: "none", label: "Geen" },
  { id: "glow", label: "Glow" },
  { id: "pulse", label: "Pulse" },
  { id: "shimmer", label: "Shimmer" },
];

const TONE_CLASS = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  green: "bg-emerald-500",
} as const;

interface Props {
  blocks: ProfileBlock[];
  avatarUrl: string | null;
  bio: string | null;
  displayName: string | null;
  prefs: ProfileDisplayPrefs;
  onPrefChange: <K extends keyof ProfileDisplayPrefs>(
    key: K,
    value: ProfileDisplayPrefs[K],
  ) => void;
  /** Voegt een blok toe (quick fix). */
  onAddKind: (kind: string) => void;
}

/**
 * 💡 Conversie Coach & Optimalisatie.
 *
 * Toont een live score, concrete quick fixes, het CTA-accent en een
 * OpenGraph-inspecteur die laat zien hoe je link in chat-apps oogt.
 */
export function ConversionCoachAccordion({
  blocks,
  avatarUrl,
  bio,
  displayName,
  prefs,
  onPrefChange,
  onAddKind,
}: Props) {
  const audit = auditProfile({
    blocks,
    avatarUrl,
    bio,
    hasPrimaryAction: hasPrimaryAction(blocks),
    highlightActive: prefs.ctaEffect !== "none" && Boolean(prefs.ctaBlockId),
    metaTitle: prefs.metaTitle,
    metaDescription: prefs.metaDescription,
    ogImageUrl: prefs.ogImageUrl,
  });

  const runFix = (fix: ConversionFix) => {
    if (fix.kind === "add_booking") onAddKind("booking_request");
    else if (fix.kind === "add_vcard") onAddKind("vcard");
    else if (fix.kind === "highlight_cta") {
      const first = blocks.find((b) => !b.hidden);
      if (first) {
        onPrefChange("ctaBlockId", first.id);
        onPrefChange("ctaEffect", "glow");
      }
    } else {
      document.getElementById("coach-meta-title")?.scrollIntoView({ behavior: "smooth" });
      document.getElementById("coach-meta-title")?.focus();
    }
  };

  return (
    <AccordionItem
      value="conversion_tips"
      className="rounded-2xl border border-border bg-card px-4 sm:px-5"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex flex-1 items-center justify-between gap-3 pr-2">
          <span className="text-base font-medium">💡 Conversie Coach &amp; Optimalisatie</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {audit.score}%
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pb-5">
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{audit.label}</span>
            <span className="text-muted-foreground">{audit.score}/100</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={audit.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Conversiescore"
          >
            <div
              className={cn("h-full transition-all", TONE_CLASS[audit.tone])}
              style={{ width: `${audit.score}%` }}
            />
          </div>
        </section>

        {audit.fixes.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-medium">Snelle verbeteringen</p>
            {audit.fixes.map((fix) => (
              <div
                key={fix.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <span className="text-xs">{fix.title}</span>
                <button
                  type="button"
                  onClick={() => runFix(fix)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                >
                  {fix.action}
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <p className="text-xs font-medium">Accentueer je belangrijkste link</p>
          <select
            className="input-field h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
            aria-label="Link met accent"
            value={prefs.ctaBlockId ?? ""}
            onChange={(e) => onPrefChange("ctaBlockId", e.target.value || null)}
          >
            <option value="">Geen link gekozen</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label || b.kind}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-4 gap-1.5">
            {CTA_EFFECTS.map((effect) => (
              <button
                key={effect.id}
                type="button"
                aria-pressed={prefs.ctaEffect === effect.id}
                onClick={() => onPrefChange("ctaEffect", effect.id)}
                className={cn(
                  "rounded-lg border px-2 py-1 text-[11px]",
                  prefs.ctaEffect === effect.id
                    ? "border-foreground bg-muted font-medium"
                    : "border-border hover:bg-muted",
                )}
              >
                {effect.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium">Social share inspecteur</p>
          <Input
            id="coach-meta-title"
            value={prefs.metaTitle ?? ""}
            maxLength={70}
            placeholder="Meta titel"
            aria-label="Meta titel"
            onChange={(e) => onPrefChange("metaTitle", e.target.value || null)}
            className="h-9 text-xs"
          />
          <Textarea
            value={prefs.metaDescription ?? ""}
            maxLength={200}
            placeholder="Meta omschrijving"
            aria-label="Meta omschrijving"
            onChange={(e) => onPrefChange("metaDescription", e.target.value || null)}
            className="min-h-16 text-xs"
          />
          <Input
            value={prefs.ogImageUrl ?? ""}
            placeholder="OpenGraph afbeelding (https://…)"
            aria-label="OpenGraph afbeelding"
            spellCheck={false}
            onChange={(e) => onPrefChange("ogImageUrl", e.target.value || null)}
            className="h-9 text-xs"
          />
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="aspect-[1.91/1] w-full bg-muted">
              {prefs.ogImageUrl ? (
                <img
                  src={prefs.ogImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="space-y-0.5 p-2">
              <p className="truncate text-xs font-medium">
                {prefs.metaTitle || displayName || "Jouw profiel"}
              </p>
              <p className="line-clamp-2 text-[11px] text-muted-foreground">
                {prefs.metaDescription || bio || "Voeg een omschrijving toe voor WhatsApp en LinkedIn."}
              </p>
            </div>
          </div>
        </section>

        <ConversionCoach blocks={blocks} />
      </AccordionContent>
    </AccordionItem>
  );
}
