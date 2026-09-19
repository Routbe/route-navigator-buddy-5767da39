/**
 * Avatar-decoraties & aanwezigheid ("presence") — in de geest van Discord,
 * maar volledig eigen: pure SVG/CSS, geen externe assets, geen tracking.
 *
 * Een decoratie zit *boven* de avatar (kattenoortjes, halo, koptelefoon …) en
 * staat los van het `avatarFrame` (de rand eromheen). Beide worden bewaard in
 * `profiles.display_prefs`.
 */

export type AvatarDecoration =
  | "none"
  | "cat_ears"
  | "bunny_ears"
  | "devil_horns"
  | "angel_halo"
  | "party_hat"
  | "headphones"
  | "cyber_visor"
  | "pixel_crown"
  | "sakura_branch"
  | "leaf_crown"
  | "snow_cap"
  | "flame_tips"
  | "sparkle_dust"
  | "star_orbit"
  | "ghost_pals"
  | "bubble_tea";

export type DecorationCategory = "kawaii" | "gaming" | "seizoen" | "elite";

export type AvatarDecorationDef = {
  id: AvatarDecoration;
  label: string;
  category: DecorationCategory;
  /** Animatieklasse uit styles.css (rout-deco-*). */
  animation?: string;
};

export const AVATAR_DECORATION_DEFS: AvatarDecorationDef[] = [
  { id: "none", label: "Geen", category: "kawaii" },
  { id: "cat_ears", label: "Kattenoortjes", category: "kawaii" },
  { id: "bunny_ears", label: "Konijnenoren", category: "kawaii" },
  { id: "bubble_tea", label: "Bubbelthee", category: "kawaii", animation: "rout-deco-bob" },
  { id: "sparkle_dust", label: "Sterrenstof", category: "kawaii", animation: "rout-deco-twinkle" },

  { id: "headphones", label: "Koptelefoon", category: "gaming" },
  { id: "cyber_visor", label: "Cyber visor", category: "gaming", animation: "rout-deco-scan" },
  { id: "pixel_crown", label: "Pixelkroon", category: "gaming" },
  { id: "ghost_pals", label: "Spookjes", category: "gaming", animation: "rout-deco-float" },

  { id: "sakura_branch", label: "Sakura-tak", category: "seizoen" },
  { id: "leaf_crown", label: "Bladerkrans", category: "seizoen" },
  { id: "snow_cap", label: "Sneeuwkap", category: "seizoen" },
  { id: "flame_tips", label: "Vlammen", category: "seizoen", animation: "rout-deco-flicker" },

  { id: "angel_halo", label: "Engelenhalo", category: "elite", animation: "rout-deco-bob" },
  { id: "devil_horns", label: "Duivelhoorns", category: "elite" },
  { id: "party_hat", label: "Feesthoed", category: "elite" },
  { id: "star_orbit", label: "Sterrenbaan", category: "elite", animation: "rout-deco-orbit" },
];

export const AVATAR_DECORATION_IDS = AVATAR_DECORATION_DEFS.map((d) => d.id);

export const DECORATION_CATEGORIES: { id: "all" | DecorationCategory; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "kawaii", label: "Kawaii" },
  { id: "gaming", label: "Gaming" },
  { id: "seizoen", label: "Seizoen" },
  { id: "elite", label: "Elite" },
];

export function avatarDecorationDef(id: AvatarDecoration): AvatarDecorationDef {
  return AVATAR_DECORATION_DEFS.find((d) => d.id === id) ?? AVATAR_DECORATION_DEFS[0]!;
}

export function avatarDecorationLabel(id: AvatarDecoration): string {
  return avatarDecorationDef(id).label;
}

export function normalizeAvatarDecoration(value: unknown): AvatarDecoration {
  return typeof value === "string" && AVATAR_DECORATION_IDS.includes(value as AvatarDecoration)
    ? (value as AvatarDecoration)
    : "none";
}

/* --------------------------------------------------------------- presence */

export type PresenceStatus = "none" | "online" | "idle" | "dnd" | "focus" | "offline";

export type PresenceDef = {
  id: PresenceStatus;
  label: string;
  /** Kleur van het bolletje rechtsonder de avatar. */
  color: string;
  /** Korte omschrijving in de studio. */
  hint: string;
};

export const PRESENCE_DEFS: PresenceDef[] = [
  { id: "none", label: "Verborgen", color: "transparent", hint: "Geen statusbolletje" },
  { id: "online", label: "Online", color: "#22c55e", hint: "Bereikbaar" },
  { id: "idle", label: "Afwezig", color: "#f59e0b", hint: "Even weg" },
  { id: "dnd", label: "Niet storen", color: "#ef4444", hint: "Geen berichten" },
  { id: "focus", label: "Focus", color: "#8b5cf6", hint: "Diep werk" },
  { id: "offline", label: "Offline", color: "#64748b", hint: "Niet bereikbaar" },
];

export function presenceDef(id: PresenceStatus): PresenceDef {
  return PRESENCE_DEFS.find((p) => p.id === id) ?? PRESENCE_DEFS[0]!;
}

export function normalizePresence(value: unknown): PresenceStatus {
  return typeof value === "string" && PRESENCE_DEFS.some((p) => p.id === value)
    ? (value as PresenceStatus)
    : "none";
}
