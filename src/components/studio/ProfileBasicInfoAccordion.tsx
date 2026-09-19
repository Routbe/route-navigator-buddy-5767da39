import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, MapPin, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { styledProfilePath, type UrlStyle } from "@/lib/profile-url";
import { SocialPlatformIcon } from "@/lib/social-icons";
import { extractHandle } from "@/lib/social-handles";
import { AVATAR_SHAPES, type AvatarShape, type ProfileDisplayPrefs } from "@/lib/profile-display";
import { BLOCK_KINDS, newBlockId, type ProfileBlock } from "@/lib/profile";
import { cn } from "@/lib/utils";

/** Tekens die de studio hard afdwingt (de server knipt ook nog eens af). */
export const MAX_DISPLAY_NAME = 50;
export const MAX_BIO = 160;

/** Snelkiezer met emoji's die vaak in een bio of locatiebadge terugkomen. */
const EMOJI_QUICK_PICK = [
  "✨",
  "🚀",
  "🎯",
  "💡",
  "🎨",
  "🎧",
  "📍",
  "🌍",
  "☕",
  "🔥",
  "🧠",
  "❤️",
  "🛠️",
  "📸",
  "🌱",
];

/** De zeven primaire kanalen die als compacte pillenrij onder de bio staan. */
const PRIMARY_SOCIALS: { kind: string; label: string }[] = [
  { kind: "bluesky", label: "Bluesky" },
  { kind: "x", label: "X / Twitter" },
  { kind: "github", label: "GitHub" },
  { kind: "linkedin", label: "LinkedIn" },
  { kind: "instagram", label: "Instagram" },
  { kind: "mastodon", label: "Mastodon" },
  { kind: "email", label: "E-mail" },
];

interface Props {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  tagline: string;
  onTaglineChange: (value: string) => void;
  avatarUrl: string;
  onAvatarUrlChange: (value: string) => void;
  normalized: string;
  urlStyle: UrlStyle;
  onEditHandle: () => void;
  prefs: ProfileDisplayPrefs;
  setPref: <K extends keyof ProfileDisplayPrefs>(key: K, value: ProfileDisplayPrefs[K]) => void;
  blocks: ProfileBlock[];
  onBlocksChange: (next: ProfileBlock[]) => void;
  /** Autosave-status: toont "✓ Opgeslagen" in de accordeonkop. */
  saving?: boolean;
  savedAt?: number | null;
}

/** Gravatar accepteert sinds 2024 een SHA-256 van het e-mailadres. */
async function gravatarUrl(email: string): Promise<string> {
  const clean = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(clean);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://gravatar.com/avatar/${hex}?s=512&d=404`;
}

/**
 * 👤 Profiel Basisinformatie.
 *
 * Alles wat een bezoeker als eerste ziet: naam, bio, locatiebadge, avatar
 * (inclusief vorm) en de primaire sociale kanalen. Elke wijziging gaat direct
 * naar de live preview; de bovenliggende studio bewaart met debounce.
 */
export function ProfileBasicInfoAccordion({
  displayName,
  onDisplayNameChange,
  tagline,
  onTaglineChange,
  avatarUrl,
  onAvatarUrlChange,
  normalized,
  urlStyle,
  onEditHandle,
  prefs,
  setPref,
  blocks,
  onBlocksChange,
  saving = false,
  savedAt = null,
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [avatarSource, setAvatarSource] = useState("");
  const [fetching, setFetching] = useState(false);

  const socialValues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const block of blocks) {
      if (!map[block.kind]) map[block.kind] = block.value;
    }
    return map;
  }, [blocks]);

  /** Zet de handle in het juiste blok (of ruimt het lege blok op). */
  const setSocial = (kind: string, raw: string) => {
    const value = raw.trim() ? extractHandle(kind, raw) : "";
    const existing = blocks.find((b) => b.kind === kind);
    if (!value) {
      onBlocksChange(existing ? blocks.filter((b) => b.id !== existing.id) : blocks);
      return;
    }
    if (existing) {
      onBlocksChange(blocks.map((b) => (b.id === existing.id ? { ...b, value } : b)));
      return;
    }
    const def = BLOCK_KINDS.find((k) => k.kind === kind);
    onBlocksChange([
      ...blocks,
      { id: newBlockId(), kind, label: def?.label ?? kind, value },
    ]);
  };

  const applyAvatarSource = async () => {
    const raw = avatarSource.trim();
    if (!raw) return;
    setFetching(true);
    try {
      if (raw.includes("@") && !raw.startsWith("http")) {
        const url = await gravatarUrl(raw);
        const res = await fetch(url, { method: "GET", mode: "cors" }).catch(() => null);
        if (!res || !res.ok) {
          toast.error("Geen Gravatar gevonden voor dit e-mailadres.");
          return;
        }
        onAvatarUrlChange(url);
        toast.success("Gravatar overgenomen.");
        return;
      }
      if (!/^https?:\/\//i.test(raw)) {
        toast.error("Gebruik een volledige https-link of een e-mailadres.");
        return;
      }
      onAvatarUrlChange(raw);
      toast.success("Avatar bijgewerkt.");
    } finally {
      setFetching(false);
    }
  };

  const savedRecently = Boolean(savedAt) && Date.now() - (savedAt ?? 0) < 60_000;

  return (
    <AccordionItem
      value="profile_info"
      className="rounded-2xl border border-border bg-card px-4 sm:px-5"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex flex-1 items-center justify-between gap-3 pr-2">
          <span className="text-base font-medium">👤 Profiel Basisinformatie</span>
          <span className="text-[11px] text-muted-foreground">
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Opslaan…
              </span>
            ) : savedRecently ? (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <Check className="h-3 w-3" aria-hidden /> Opgeslagen
              </span>
            ) : null}
          </span>
        </span>
      </AccordionTrigger>

      <AccordionContent className="space-y-4 pb-5">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-full space-y-3 sm:max-w-xs">
              <AvatarUpload
                value={avatarUrl || null}
                name={displayName}
                onChange={(url) => onAvatarUrlChange(url ?? "")}
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Of haal op via Gravatar / eigen URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={avatarSource}
                    placeholder="jij@voorbeeld.be of https://…"
                    onChange={(e) => setAvatarSource(e.target.value)}
                    className="input-field h-9 rounded-xl text-xs"
                    aria-label="Gravatar-e-mail of afbeeldings-URL"
                  />
                  <button
                    type="button"
                    disabled={fetching}
                    onClick={() => void applyAvatarSource()}
                    className="shrink-0 rounded-xl border border-border px-3 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {fetching ? "…" : "Ophalen"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Avatarvorm</label>
                <div className="flex gap-2">
                  {AVATAR_SHAPES.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setPref("avatarShape", shape.id as AvatarShape)}
                      aria-pressed={prefs.avatarShape === shape.id}
                      className={cn(
                        "flex-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors",
                        prefs.avatarShape === shape.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Weergavenaam
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {displayName.length}/{MAX_DISPLAY_NAME}
                  </span>
                </div>
                <Input
                  value={displayName}
                  maxLength={MAX_DISPLAY_NAME}
                  placeholder="Jona Zeno"
                  onChange={(e) => onDisplayNameChange(e.target.value.slice(0, MAX_DISPLAY_NAME))}
                  className="input-field h-10 rounded-xl"
                  aria-label="Weergavenaam"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Bio / elevator pitch
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {tagline.length}/{MAX_BIO}
                  </span>
                </div>
                <Textarea
                  value={tagline}
                  maxLength={MAX_BIO}
                  rows={3}
                  placeholder="Open-source developer & designer die privacyvriendelijke tools bouwt."
                  onChange={(e) => onTaglineChange(e.target.value.slice(0, MAX_BIO))}
                  className="input-field rounded-xl"
                  aria-label="Bio"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-muted"
                    aria-expanded={emojiOpen}
                  >
                    <Smile className="h-3 w-3" aria-hidden /> Emoji
                  </button>
                  {emojiOpen &&
                    EMOJI_QUICK_PICK.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          onTaglineChange(`${tagline}${emoji}`.slice(0, MAX_BIO))
                        }
                        className="rounded-lg border border-border px-1.5 py-0.5 text-sm hover:bg-muted"
                        aria-label={`Emoji ${emoji} toevoegen`}
                      >
                        {emoji}
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden /> Locatiebadge
                  </label>
                  <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    Zichtbaar
                    <Switch
                      checked={prefs.locationVisible}
                      onCheckedChange={(v) => setPref("locationVisible", v)}
                      aria-label="Locatiebadge tonen"
                    />
                  </span>
                </div>
                <Input
                  value={prefs.locationBadge ?? ""}
                  maxLength={60}
                  placeholder="📍 Brussel, België of 🌐 Remote"
                  onChange={(e) => setPref("locationBadge", e.target.value || null)}
                  className="input-field h-10 rounded-xl"
                  aria-label="Locatiebadge"
                />
              </div>
            </div>
          </div>

          {/* Primaire sociale kanalen: compacte pillenrij onder de bio. */}
          <div className="space-y-2 rounded-xl border border-border bg-background p-3">
            <h3 className="text-[11px] font-medium text-muted-foreground">
              Primaire kanalen — typ je @handle, wij maken de link
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIMARY_SOCIALS.map(({ kind, label }) => (
                <div
                  key={kind}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-2"
                >
                  <SocialPlatformIcon source={kind} className="h-4 w-4 shrink-0" />
                  <Input
                    value={socialValues[kind] ?? ""}
                    placeholder={
                      kind === "email"
                        ? "hallo@rout.be"
                        : `@${BLOCK_KINDS.find((k) => k.kind === kind)?.placeholder ?? "handle"}`
                    }
                    onChange={(e) => setSocial(kind, e.target.value)}
                    className="input-field h-9 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                    aria-label={label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
              rout.be{styledProfilePath(normalized || "handle", urlStyle)}
            </span>
            <button
              type="button"
              onClick={onEditHandle}
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
            >
              Handle wijzigen
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `https://rout.be${styledProfilePath(normalized || "handle", urlStyle)}`,
                );
                toast.success("Link gekopieerd!");
              }}
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
            >
              Kopieer link
            </button>
          </div>
        </section>
      </AccordionContent>
    </AccordionItem>
  );
}
