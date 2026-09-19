import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileUploadInput } from "@/components/FileUploadInput";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AvatarFramePicker } from "@/components/studio/AvatarFramePicker";
import { AvatarDecorationPicker } from "@/components/studio/AvatarDecorationPicker";
import { FaviconUploader } from "@/components/studio/FaviconUploader";
import { VisitEffectPicker } from "@/components/studio/VisitEffectPicker";
import {
  DesignButtonsTypographySection,
  DesignFooterSection,
  DesignPresetSection,
  DesignWallpaperSection,
} from "@/components/dashboard/DesignTabEditor";
import { avatarFrameLabel } from "@/lib/avatar-frames";
import { cn } from "@/lib/utils";
import {
  AVATAR_FRAMES,
  BACKGROUND_STYLES,
  BANNER_DIRECTIONS,
  BANNER_STYLES,
  NAME_ACCENTS,
  TYPOGRAPHY_STYLES,
  type ProfileDisplayPrefs,
} from "@/lib/profile-display";
import { CARD_STYLES, PROFILE_THEMES, themeOf } from "@/lib/profile";

interface ProfileThemePickerProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  tagline: string;
  onTaglineChange: (value: string) => void;
  avatarUrl: string;
  onAvatarUrlChange: (value: string) => void;
  faviconUrl: string;
  onFaviconUrlChange: (value: string) => void;
  theme: string;
  onThemeChange: (value: string) => void;
  cardStyle: string;
  onCardStyleChange: (value: string) => void;
  prefs: ProfileDisplayPrefs;
  setPref: <K extends keyof ProfileDisplayPrefs>(key: K, value: ProfileDisplayPrefs[K]) => void;
  verified: boolean;
}

/**
 * Uiterlijk van het profiel: avatar/frame, presets, kleuren, typografie en
 * achtergrond/visuele effecten. Dekt volledig het tabblad "Design & styling".
 */
export function ProfileThemePicker({
  displayName,
  onDisplayNameChange,
  tagline,
  onTaglineChange,
  avatarUrl,
  onAvatarUrlChange,
  faviconUrl,
  onFaviconUrlChange,
  theme,
  onThemeChange,
  cardStyle,
  onCardStyleChange,
  prefs,
  setPref,
  verified,
}: ProfileThemePickerProps) {
  // AVATAR_FRAMES is currently unused directly here (delegated to AvatarFramePicker)
  // but kept imported for parity with legacy usage / future presets.
  void AVATAR_FRAMES;
  return (
    <>
      {/* 1 — Avatar, header & kaders */}
      <AccordionItem
        value="avatar_header"
        className="rounded-2xl border border-border bg-card px-4 sm:px-5"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex flex-1 items-center justify-between gap-3 pr-2">
            <span className="text-base font-medium">👤 Avatar, Header &amp; Frames</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              {avatarFrameLabel(prefs.avatarFrame)}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-5">
          <div className="space-y-2">
            <label className="input-label" htmlFor="p-name">
              Display Name
            </label>
            <Input
              id="p-name"
              value={displayName}
              maxLength={60}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              className="input-field h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="input-label" htmlFor="p-tag">
              Bio / Tagline
            </label>
            <Input
              id="p-tag"
              value={tagline}
              maxLength={120}
              placeholder="Sovereign QR infrastructure"
              onChange={(e) => onTaglineChange(e.target.value)}
              className="input-field h-11 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <FileUploadInput type="image" value={avatarUrl} onValueChange={onAvatarUrlChange} />
            </div>
            {avatarUrl && (
              <Button variant="ghost" size="sm" onClick={() => onAvatarUrlChange("")}>
                Remove
              </Button>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="input-label">Avatarkader / rand (24 presets)</p>
            <AvatarFramePicker
              value={prefs.avatarFrame}
              onChange={(f) => setPref("avatarFrame", f)}
              avatarUrl={avatarUrl}
              theme={themeOf(theme)}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="input-label">Avatardecoratie &amp; status</p>
            <p className="text-xs text-muted-foreground">
              Oortjes, halo, koptelefoon &hellip; bovenop je avatar, plus een statusbolletje.
            </p>
            <AvatarDecorationPicker
              value={prefs.avatarDecoration}
              onChange={(d) => setPref("avatarDecoration", d)}
              presence={prefs.presence}
              onPresenceChange={(v) => setPref("presence", v)}
              avatarUrl={avatarUrl}
              frame={prefs.avatarFrame}
              theme={themeOf(theme)}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="input-label">Naamaccent</p>
            <div className="flex flex-wrap gap-2">
              {NAME_ACCENTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPref("nameAccent", o.id)}
                  className={cn(
                    "h-10 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                    prefs.nameAccent === o.id ? "border-primary/50 bg-primary/10" : "border-border",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="input-label">Statuslijn</p>
            <Input
              value={prefs.statusLine ?? ""}
              maxLength={60}
              onChange={(e) => setPref("statusLine", e.target.value || null)}
              placeholder="Beschikbaar voor werk"
              className="h-10 text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Max. 60 tekens, verschijnt onder je handle.
            </p>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <label className="input-label">Favicon (optioneel)</label>
            <FaviconUploader value={faviconUrl} onChange={onFaviconUrlChange} />
          </div>
        </AccordionContent>
      </AccordionItem>


      {/* 3 — Knoppen & typografie */}
      <AccordionItem
        value="buttons_typography"
        className="rounded-2xl border border-border bg-card px-4 sm:px-5"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex flex-1 items-center justify-between gap-3 pr-2">
            <span className="text-base font-medium">🔘 Knoppen &amp; Typografie</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              {CARD_STYLES.find((c) => c.id === cardStyle)?.label ?? cardStyle}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-5">
          <p className="input-label">Knopvorm</p>
          <div className="flex flex-wrap gap-2">
            {CARD_STYLES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCardStyleChange(c.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                  cardStyle === c.id ? "border-primary/50 bg-primary/10" : "border-border",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="input-label pt-2">Typografie</p>
          <div className="flex flex-wrap gap-2">
            {TYPOGRAPHY_STYLES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPref("typography", t.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                  prefs.typography === t.id ? "border-primary/50 bg-primary/10" : "border-border",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">&ldquo;Contact opslaan&rdquo;-knop</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bezoekers bewaren je profiel als contactkaart (vCard).
              </p>
            </div>
            <Switch
              aria-label="Contact opslaan-knop tonen"
              checked={prefs.showVcardButton}
              onCheckedChange={(v) => setPref("showVcardButton", v)}
            />
          </div>

          {/* Welke gegevens de bezoeker in zijn adresboek krijgt. */}
          {prefs.showVcardButton && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Opschrift van de knop</p>
                <Input
                  value={prefs.vcardLabel ?? ""}
                  maxLength={40}
                  placeholder="Contact opslaan"
                  onChange={(e) => setPref("vcardLabel", e.target.value || null)}
                />
              </div>
              {(
                [
                  ["vcardIncludeAvatar", "Profielfoto meesturen"],
                  ["vcardIncludeBio", "Bio / tagline als notitie"],
                  ["vcardIncludeEmail", "E-mailadres"],
                  ["vcardIncludeLinks", "Links & socials"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{label}</span>
                  <Switch
                    aria-label={label}
                    checked={prefs[key]}
                    onCheckedChange={(v) => setPref(key, v)}
                  />
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Telefoon (optioneel)</p>
                  <Input
                    value={prefs.vcardPhone ?? ""}
                    maxLength={40}
                    placeholder="+32 470 00 00 00"
                    onChange={(e) => setPref("vcardPhone", e.target.value || null)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Organisatie (optioneel)
                  </p>
                  <Input
                    value={prefs.vcardOrg ?? ""}
                    maxLength={80}
                    placeholder="ROUT"
                    onChange={(e) => setPref("vcardOrg", e.target.value || null)}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">&ldquo;Made with ROUT&rdquo;-voetnoot</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {verified
                  ? "Als geverifieerd lid is je profiel standaard white-label."
                  : "Gratis profielen tonen de subtiele ROUT-voetnoot."}
              </p>
            </div>
            <Switch
              aria-label="Made with ROUT tonen"
              disabled={!verified}
              checked={verified ? (prefs.showWatermark ?? false) : true}
              onCheckedChange={(v) => setPref("showWatermark", v)}
            />
          </div>
          <div className="border-t border-border pt-4">
            <DesignButtonsTypographySection prefs={prefs} setPref={setPref} theme={theme} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 4 — Footer & branding */}
      <AccordionItem
        value="footer_branding"
        className="rounded-2xl border border-border bg-card px-4 sm:px-5"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex flex-1 items-center justify-between gap-3 pr-2">
            <span className="text-base font-medium">🏷️ Footer &amp; Branding</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <DesignFooterSection
            prefs={prefs}
            setPref={setPref}
            theme={theme}
            verified={verified}
          />
        </AccordionContent>
      </AccordionItem>

      {/* 5 — Achtergrond & visual FX */}
      <AccordionItem
        value="background_effects"
        className="rounded-2xl border border-border bg-card px-4 sm:px-5"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex flex-1 items-center justify-between gap-3 pr-2">
            <span className="text-base font-medium">🖼️ Achtergrond &amp; Visual FX</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              {BACKGROUND_STYLES.find((o) => o.id === prefs.backgroundStyle)?.label ??
                prefs.backgroundStyle}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-5">
          <DesignPresetSection
            prefs={prefs}
            setPref={setPref}
            theme={theme}
            setTheme={onThemeChange}
            setCardStyle={onCardStyleChange}
          />
          <p className="input-label border-t border-border pt-4">Themapreset</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROFILE_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onThemeChange(t.id)}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors",
                  theme === t.id ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                <span
                  className="block h-10 w-full rounded-lg border border-border"
                  style={{ background: t.bg }}
                  aria-hidden
                />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-4" />
          <DesignWallpaperSection prefs={prefs} setPref={setPref} theme={theme} />
          <div className="border-t border-border pt-4" />
          <VisitEffectPicker
            value={prefs.visitEffect}
            onChange={(id) => setPref("visitEffect", id)}
          />
          <p className="input-label pt-2">Achtergrondstijl</p>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_STYLES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setPref("backgroundStyle", o.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                  prefs.backgroundStyle === o.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="input-label pt-2">Banner</p>
          <div className="flex flex-wrap gap-2">
            {BANNER_STYLES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setPref("bannerStyle", o.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                  prefs.bannerStyle === o.id ? "border-primary/50 bg-primary/10" : "border-border",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {prefs.bannerStyle === "gradient" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="input-label">Van</p>
                  <input
                    type="color"
                    aria-label="Bannerkleur van"
                    value={prefs.bannerFrom ?? "#1a1a1a"}
                    onChange={(e) => setPref("bannerFrom", e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="input-label">Naar</p>
                  <input
                    type="color"
                    aria-label="Bannerkleur naar"
                    value={prefs.bannerTo ?? "#c9a84c"}
                    onChange={(e) => setPref("bannerTo", e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  />
                </div>
              </div>
              <p className="input-label pt-2">Richting van het verloop</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BANNER_DIRECTIONS.map((d) => {
                  const from = prefs.bannerFrom ?? "#1a1a1a";
                  const to = prefs.bannerTo ?? "#c9a84c";
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={prefs.bannerDirection === d.id}
                      onClick={() => setPref("bannerDirection", d.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 text-left text-[11px] font-medium transition-colors",
                        prefs.bannerDirection === d.id
                          ? "border-primary/50 bg-primary/10"
                          : "border-border",
                      )}
                    >
                      <span
                        aria-hidden
                        className="h-7 w-10 shrink-0 rounded-md border border-border"
                        style={{
                          backgroundImage:
                            d.id === "radial"
                              ? `radial-gradient(circle at 50% 50%, ${from}, ${to})`
                              : `linear-gradient(${d.id}, ${from}, ${to})`,
                        }}
                      />
                      <span className="truncate">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {prefs.bannerStyle === "image" && (
            <div className="space-y-1.5">
              <p className="input-label">Afbeeldings-URL (https)</p>
              <Input
                value={prefs.bannerImageUrl ?? ""}
                onChange={(e) => setPref("bannerImageUrl", e.target.value || null)}
                placeholder="https://…/banner.jpg"
                spellCheck={false}
                className="h-10 text-xs"
              />
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </>
  );
}
