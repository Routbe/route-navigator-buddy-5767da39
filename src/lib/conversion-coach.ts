/**
 * Conversie-coach: kleine, deterministische regels die de Studio inline toont
 * bij de linklijst. Client-safe en puur, zodat het ook testbaar blijft.
 */
import type { ProfileBlock } from "./profile";

export interface ConversionTip {
  id: string;
  tone: "warning" | "hint" | "info";
  message: string;
}

/** Titels die niets beloven — bezoekers klikken hier zelden op. */
const GENERIC_TITLES = [
  "blog",
  "website",
  "shop",
  "link",
  "eigen link",
  "instagram",
  "info",
  "hier",
  "klik hier",
  "meer",
];

export const IDEAL_LINK_MAX = 6;

export function isGenericTitle(label: string): boolean {
  const clean = label.trim().toLowerCase();
  if (!clean) return true;
  return GENERIC_TITLES.includes(clean);
}

export function conversionTips(blocks: ProfileBlock[]): ConversionTip[] {
  const active = blocks.filter((block) => !block.hidden);
  const tips: ConversionTip[] = [];

  if (active.length > IDEAL_LINK_MAX) {
    tips.push({
      id: "link-count",
      tone: "warning",
      message: `⚠️ Tip: je hebt ${active.length} actieve links. Beperk je tot 3–6 links voor maximale conversie.`,
    });
  }

  const generic = active.filter((block) => isGenericTitle(block.label));
  if (generic.length > 0) {
    const names = generic
      .slice(0, 3)
      .map((block) => `“${block.label.trim() || "zonder titel"}”`)
      .join(", ");
    tips.push({
      id: "copy-quality",
      tone: "hint",
      message: `💡 Schrijf actiegerichter bij ${names}: bijv. “Bekijk mijn nieuwste aanbod”.`,
    });
  }

  if (active.length > 1) {
    tips.push({
      id: "drag-hint",
      tone: "info",
      message:
        "↕️ Sleep je belangrijkste link naar boven — de bovenste link krijgt tot 70% van alle kliks.",
    });
  }

  return tips;
}

/* ------------------------------------------------------------------ */
/* Audit-engine: score, status en concrete quick fixes                  */
/* ------------------------------------------------------------------ */

/** Signalen die de score bepalen. Puur data, zodat dit testbaar blijft. */
export interface ConversionInput {
  blocks: ProfileBlock[];
  avatarUrl: string | null;
  bio: string | null;
  /** Er is een primaire actie (boeking, contact, tip, vCard …). */
  hasPrimaryAction: boolean;
  /** Minstens één link krijgt een accent-animatie. */
  highlightActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
}

export type ConversionStatus = "passive" | "growing" | "magnet";

export interface ConversionAudit {
  score: number;
  status: ConversionStatus;
  label: string;
  /** Tailwind-kleurtoken voor de meter. */
  tone: "red" | "yellow" | "green";
  fixes: ConversionFix[];
}

export interface ConversionFix {
  id: string;
  title: string;
  action: string;
  /** Wat de studio moet doen bij één klik. */
  kind: "add_booking" | "fill_meta" | "add_vcard" | "add_avatar" | "add_bio" | "highlight_cta";
}

/** Blokken die als primair doel tellen. */
const PRIMARY_KINDS = [
  "booking_request",
  "calcom",
  "calendly",
  "contact_form",
  "vcard",
  "kofi",
  "bmac",
  "stripe",
];

export function hasPrimaryAction(blocks: ProfileBlock[]): boolean {
  return blocks.some((b) => !b.hidden && PRIMARY_KINDS.includes(b.kind));
}

export function auditProfile(input: ConversionInput): ConversionAudit {
  const metaComplete = Boolean(input.metaTitle && input.metaDescription && input.ogImageUrl);
  let score = 0;
  if (input.avatarUrl) score += 15;
  if ((input.bio ?? "").trim().length >= 20) score += 15;
  if (input.hasPrimaryAction) score += 25;
  if (input.highlightActive) score += 15;
  if (metaComplete) score += 30;

  const fixes: ConversionFix[] = [];
  if (!input.avatarUrl)
    fixes.push({
      id: "avatar",
      title: "Nog geen profielfoto",
      action: "🖼️ Foto toevoegen",
      kind: "add_avatar",
    });
  if ((input.bio ?? "").trim().length < 20)
    fixes.push({
      id: "bio",
      title: "Je bio vertelt nog te weinig",
      action: "✍️ Bio schrijven",
      kind: "add_bio",
    });
  if (!input.hasPrimaryAction)
    fixes.push({
      id: "cta",
      title: "Geen hoofddoel ingesteld",
      action: "⚡ Boeking toevoegen",
      kind: "add_booking",
    });
  if (!metaComplete)
    fixes.push({
      id: "meta",
      title: "WhatsApp / social share preview mist",
      action: "📝 Vul in",
      kind: "fill_meta",
    });
  if (!input.blocks.some((b) => b.kind === "vcard"))
    fixes.push({
      id: "vcard",
      title: "Contact uitwisselen is lastig",
      action: "🎴 vCard toevoegen",
      kind: "add_vcard",
    });
  if (!input.highlightActive && input.blocks.length > 0)
    fixes.push({
      id: "highlight",
      title: "Geen link krijgt extra aandacht",
      action: "✨ Accent kiezen",
      kind: "highlight_cta",
    });

  if (score < 50) return { score, status: "passive", label: "Passief profiel", tone: "red", fixes };
  if (score < 80)
    return { score, status: "growing", label: "Groeiprofiel", tone: "yellow", fixes };
  return { score, status: "magnet", label: "Conversie-Magneet", tone: "green", fixes };
}
