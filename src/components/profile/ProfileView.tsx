import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Mail, UserPlus, Users } from "lucide-react";
import {
  blockHref,
  isPromoBlock,
  isWidgetBlock,
  scheduledBlocks,
  themeOf,
  type ProfileRecord,
} from "@/lib/profile";
import {
  BookingBlock,
  NewsletterBlock,
  PromoBlock,
  isBookingUrl,
} from "@/components/profile/ProfileWidgets";
import { BookingCard } from "@/components/profile/BookingCard";
import { parseBookingConfig } from "@/lib/booking";
import { GalleryCard } from "@/components/profile/GalleryCard";
import { MediaEmbedCard } from "@/components/profile/MediaEmbedCard";
import { ContactFormCard } from "@/components/profile/ContactFormCard";
import { EventListCard } from "@/components/profile/EventListCard";
import { PollCard } from "@/components/profile/PollCard";
import { FaqCard } from "@/components/profile/FaqCard";
import { MapCard } from "@/components/profile/MapCard";
import { parseContactFormConfig } from "@/lib/contact-form";
import { parseEventListConfig } from "@/lib/events";
import { parseFaqConfig, parseMapConfig, parsePollConfig } from "@/lib/interactions";

import { parseGalleryConfig } from "@/lib/gallery";
import { SocialPlatformIcon } from "@/lib/social-icons";
import { PLATFORM_LABEL, formatFollowers } from "@/lib/social-verify";
import { formatReach } from "@/lib/total-reach";
import { FavoritesShowcase } from "@/components/profile/FavoritesShowcase";
import { BadgeShowcase } from "@/components/profile/BadgeShowcase";
import { VerifiedInfoDialog } from "@/components/profile/VerifiedInfoDialog";
import { monthYear } from "@/components/profile/VerifiedBadgePopover";
import { ProfileBadge } from "@/components/profile/ProfileBadge";
import type { BadgeType } from "@/lib/profile-display";
import { EarlyBelieverBadge } from "@/components/profile/EarlyBelieverBadge";
import {
  backgroundLayers,
  bannerStyleOf,
  blockButtonStyle,
  FONT_FAMILY,
  nameAccentStyle,
  parseDisplayPrefs,
  shouldShowWatermark,
  availableBioLocales,
  bioForLocale,
  BIO_LOCALE_LABEL,
  type BioLocale,
  designButtonStyle,
  footerBlockStyle,
  fontPairingOf,
  wallpaperImageLayerStyle,
  wallpaperOverlayStyle,
  wallpaperStyle,
  avatarShapeStyle,
} from "@/lib/profile-display";
import {
  isVisitEffect,
  runVisitEffect,
  VISIT_EFFECT_TEST_EVENT,
} from "@/lib/visit-effects";
import { AvatarFrameWrapper } from "@/components/profile/AvatarFrameWrapper";
import { downloadVCard } from "@/lib/vcard";

import { useI18n } from "@/lib/i18n";
import { initialsFrom } from "@/components/UserAvatar";

/** Swaps the browser tab icon for the profile's own favicon (or avatar). */
function useProfileFavicon(url?: string | null) {
  useEffect(() => {
    if (!url || typeof document === "undefined") return;
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = url;
    document.head.appendChild(link);
    return () => link.remove();
  }, [url]);
}

/** Renders a public ROUT link hub for both the /@handle and /u/@handle namespaces. */
export function ProfileView({
  profile,
  free = false,
  layout = "auto",
}: {
  profile: ProfileRecord;
  free?: boolean;
  /** "wide" toont links in twee kolommen (desktopvoorbeeld / brede schermen). */
  layout?: "auto" | "wide";
}) {
  const { t: tr, locale } = useI18n();
  const t = themeOf(profile.theme);
  const prefs = parseDisplayPrefs(profile.display_prefs);
  const blocks = scheduledBlocks(profile.blocks).filter(
    (b) =>
      b.value.trim() !== "" ||
      b.kind === "newsletter" ||
      b.kind === "booking_request" ||
      b.kind === "spacer",
  );
  /** Accent-animatie op de gekozen hoofdlink (glow, pulse of shimmer). */
  const ctaClass = (blockId: string) => {
    if (prefs.ctaBlockId !== blockId || prefs.ctaEffect === "none") return "";
    if (prefs.ctaEffect === "pulse") return "animate-pulse";
    if (prefs.ctaEffect === "shimmer") return "animate-[pulse_2.4s_ease-in-out_infinite] brightness-110";
    return "shadow-[0_0_24px_-6px_currentColor] ring-1 ring-current";
  };
  const fonts = fontPairingOf(prefs.fontPairing);
  const buttonStyle = designButtonStyle(prefs, t) ?? blockButtonStyle(profile.card_style, t);
  /** Eigen canvas- en patroonkleuren overschrijven het thema, indien gekozen. */
  const canvas = {
    ...t,
    bg: prefs.canvasColor ?? t.bg,
    border: prefs.patternColor ?? t.border,
    accent: prefs.patternColor ?? t.accent,
  };
  const surface = wallpaperStyle(prefs, canvas) ?? backgroundLayers(prefs.backgroundStyle, canvas);
  const imageLayer = wallpaperImageLayerStyle(prefs);
  const overlay = wallpaperOverlayStyle(prefs);
  const banner = bannerStyleOf(prefs, t);
  const nameStyle = nameAccentStyle(prefs.nameAccent, t);
  const avatarShape = avatarShapeStyle(prefs.avatarShape);

  // Het blauwe vinkje hoort uitsluitend bij het geverifieerde account op de
  // schone namespace (`rout.be/<handle>`). De aliasruimte (`rout.be/u/…`) van
  // datzelfde geverifieerde lid toont het mens-symbool: bewijs dat dit account
  // aan een geverifieerd, menselijk account gekoppeld is — zonder echte naam.
  // Aliasprofiel: het mens-symbool verschijnt wanneer het gekoppelde account
  // geverifieerd is (`human_linked`) en de eigenaar de badge niet uitzette.
  // Een via DNS geclaimde domeinnaam (`rout.be/example.be`) mag de zwarte
  // domeinbadge dragen.
  const claimedDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(profile.subdomain_alias ?? "")
    ? (profile.subdomain_alias as string)
    : null;
  const showBadge = free
    ? Boolean(profile.human_linked) && prefs.humanBadgeVisible
    : Boolean(profile.verified) && prefs.badgeVisible && prefs.badgeType !== "none";
  /**
   * Beide badges zijn vrij te kiezen: een geverifieerd lid mag het blauwe
   * vinkje (identiteit + land) of het privacy-schild (enkel "echte mens")
   * tonen, of de zwarte domeinbadge wanneer een domein geclaimd is — of niets.
   */
  const badgeType: BadgeType = free
    ? "human"
    : prefs.badgeType === "domain" && !claimedDomain
      ? "verified"
      : prefs.badgeType;
  const showWatermark =
    shouldShowWatermark(Boolean(profile.verified), prefs) &&
    (profile.verified ? prefs.showRoutBadge : true);
  const wide = layout === "wide";
  const earlyBeliever = Boolean(profile.is_early_believer);
  const [showVerifyInfo, setShowVerifyInfo] = useState(false);
  /** Taalpil: auto-detect via de sitetaal, bezoeker mag zelf wisselen. */
  const bioLocales = availableBioLocales(prefs);
  const [bioLocale, setBioLocale] = useState<BioLocale | null>(null);
  const shownBio = bioForLocale(prefs, profile.bio, bioLocale ?? locale ?? "nl");
  const aliasEmail =
    profile.show_email_publicly && earlyBeliever && profile.username
      ? `${profile.username}@rout.be`
      : null;

  const memberSince = monthYear(profile.created_at ?? null, locale || "nl");

  const socialRow = (profile.social_links ?? []).length > 0 && (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {(profile.social_links ?? []).map((link) => {
        const followers = formatFollowers(link.followerCount);
        const username = (link as { username?: string | null }).username ?? null;
        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="me noopener noreferrer"
            title={`${PLATFORM_LABEL[link.platform]} — geverifieerd`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${t.border}`, color: t.muted }}
          >
            {username ? (
              <>
                <SocialPlatformIcon source={link.url} className="h-3.5 w-3.5 text-current" />
                <span>@{username.replace(/^@/, "")}</span>
                <BadgeCheck className="h-3 w-3 text-emerald-500" aria-hidden />
              </>
            ) : (
              <span className="relative inline-flex">
                <SocialPlatformIcon source={link.url} className="h-3.5 w-3.5 text-current" />
                <BadgeCheck
                  className="absolute -right-1 -top-1 z-10 h-2.5 w-2.5 text-emerald-500"
                  aria-hidden
                />
              </span>
            )}
            {followers && <span>{followers} volgers</span>}
          </a>
        );
      })}
    </div>
  );

  const mainRef = useRef<HTMLElement | null>(null);
  const stopTestRef = useRef<(() => void) | null>(null);

  useProfileFavicon(profile.favicon_url ?? profile.avatar_url);

  // Entree-effect: exact één keer bij het betreden van het profiel, en nooit
  // wanneer het besturingssysteem minder beweging vraagt. Het effect speelt
  // binnen deze pagina zelf, dus ook netjes binnen de Studio-preview.
  useEffect(() => {
    if (prefs.visitEffect === "none") return;
    const stop = runVisitEffect(prefs.visitEffect, { container: mainRef.current });
    return stop;
  }, [prefs.visitEffect]);

  // "Test effect" in de Studio: speel het af in deze preview, niet over de
  // volledige studiopagina.
  useEffect(() => {
    const onTest = (event: Event) => {
      const detail = (event as CustomEvent<{ effect?: string; handled?: boolean }>).detail;
      const effect = isVisitEffect(detail?.effect) ? detail.effect : prefs.visitEffect;
      if (effect === "none") return;
      if (detail) detail.handled = true;
      stopTestRef.current?.();
      stopTestRef.current = runVisitEffect(effect, {
        force: true,
        container: mainRef.current,
      });
    };
    window.addEventListener(VISIT_EFFECT_TEST_EVENT, onTest);
    return () => {
      window.removeEventListener(VISIT_EFFECT_TEST_EVENT, onTest);
      stopTestRef.current?.();
    };
  }, [prefs.visitEffect]);

  return (
    <main
      ref={mainRef}
      className={`relative isolate min-h-screen w-full overflow-hidden px-4 pb-12 ${banner ? "pt-0" : "pt-12"}`}
      style={{
        ...surface,
        color: t.text,
        fontFamily: prefs.customDesign ? fonts.body : FONT_FAMILY[prefs.typography],
        fontSize: prefs.customDesign ? `${prefs.fontScale}%` : undefined,
      }}
    >
      {/* Achtergrondafbeelding + verduistering blijven binnen deze pagina:
          blur werkt op de afbeelding zelf, nooit op wat erachter staat. */}
      {imageLayer && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={imageLayer} />
      )}
      {overlay && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={overlay} />
      )}
      {banner && (
        <div
          aria-hidden
          className="-mx-4 mb-[-2.5rem] h-32 w-[calc(100%+2rem)] sm:h-40"
          style={{ ...banner, borderBottom: `1px solid ${t.border}` }}
        />
      )}
      <div
        className={`relative mx-auto flex w-full flex-col items-center ${wide ? "max-w-3xl" : "max-w-md"}`}
      >
        <AvatarFrameWrapper
          frame={prefs.avatarFrame}
          theme={t}
          decoration={prefs.avatarDecoration}
          presence={prefs.presence}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || `@${profile.username}`}
              className={`h-20 w-20 object-cover ${avatarShape.className}`}
              style={{ border: `1px solid ${t.border}`, ...(avatarShape.style ?? {}) }}
              loading="lazy"
            />
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center text-xl font-medium ${avatarShape.className}`}
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                ...(avatarShape.style ?? {}),
              }}
            >
              {initialsFrom(profile.display_name || profile.username)}
            </div>
          )}
        </AvatarFrameWrapper>

        <h1
          className="mt-4 flex items-center gap-1.5 break-words text-center font-display text-2xl"
          style={prefs.customDesign ? { fontFamily: fonts.heading } : undefined}
        >
          <span
            style={prefs.customDesign && prefs.titleColor ? { color: prefs.titleColor } : nameStyle}
          >
            {profile.display_name || `@${profile.username}`}
          </span>
          {showBadge && (
            <ProfileBadge
              type={badgeType}
              legalName={
                free ? null : (profile.verified_legal_name ?? profile.display_name ?? null)
              }
              country={free ? null : (profile.country_code ?? null)}
              domain={claimedDomain}
              nameFormat={prefs.badgeNameFormat}
              backdrop={prefs.badgeBackdrop}
              backdropColor={prefs.badgeBackdropColor}
              verifiedAt={profile.verified_at ?? null}
              size={earlyBeliever ? "md" : "sm"}
              cardBg={t.card}
              cardBorder={t.border}
              textColor={t.text}
              mutedColor={t.muted}
            />
          )}
        </h1>

        {earlyBeliever && (
          <EarlyBelieverBadge
            onClick={() => setShowVerifyInfo(true)}
            borderColor={t.border}
            textColor={t.text}
          />
        )}

        <VerifiedInfoDialog
          open={showVerifyInfo}
          onClose={() => setShowVerifyInfo(false)}
          username={profile.username}
          createdAt={profile.created_at ?? null}
          verified={Boolean(profile.verified)}
          earlyBeliever={earlyBeliever}
        />
        {/* Gratis leden tonen hun alias-namespace, Pro-leden hun schone handle.
            De subtitel is een subtiele link naar het live profiel. */}
        <a
          href={
            free ? `https://rout.be/u/${profile.username}` : `https://rout.be/${profile.username}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 break-all text-center text-sm underline-offset-4 transition-opacity hover:underline hover:opacity-80"
          style={{ color: t.muted }}
        >
          {free ? `rout.be/u/${profile.username}` : `rout.be/${profile.username}`}
        </a>
        {prefs.locationVisible && prefs.locationBadge && (
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ border: `1px solid ${t.border}`, color: t.muted }}
          >
            {prefs.locationBadge}
          </span>
        )}
        {prefs.statusLine && (
          <p className="mt-1 text-center text-xs font-medium" style={{ color: t.text }}>
            {prefs.statusLine}
          </p>
        )}

        {memberSince && (
          <p className="mt-1 text-center text-xs" style={{ color: t.muted }}>
            {tr("profile.member_since")} {memberSince}
          </p>
        )}
        {aliasEmail && (
          <a
            href={`mailto:${aliasEmail}`}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${t.border}`, color: t.text }}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden /> Contact via {aliasEmail}
          </a>
        )}
        {(shownBio || profile.tagline) && (
          <p className="mt-3 max-w-sm text-balance text-center text-sm" style={{ color: t.muted }}>
            {shownBio || profile.tagline}
          </p>
        )}

        {profile.show_total_reach && (profile.total_reach_count ?? 0) > 0 && (
          <span
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ border: `1px solid ${t.border}`, color: t.text }}
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            {formatReach(profile.total_reach_count ?? 0)} bereik
          </span>
        )}

        {bioLocales.length > 1 && (
          <div className="mt-2 flex items-center gap-1">
            {bioLocales.map((l) => {
              const active = (bioLocale ?? locale) === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setBioLocale(l)}
                  aria-pressed={active}
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-widest transition-opacity hover:opacity-80"
                  style={{
                    border: `1px solid ${t.border}`,
                    background: active ? t.text : "transparent",
                    color: active ? t.bg : t.muted,
                  }}
                >
                  {BIO_LOCALE_LABEL[l]}
                </button>
              );
            })}
          </div>
        )}

        {/* vCard: bezoekers bewaren het profiel meteen in hun adresboek. */}
        {prefs.showVcardButton && (
          <button
            type="button"

            onClick={() =>
              downloadVCard({
                handle: profile.username ?? "",
                displayName: profile.display_name,
                tagline: profile.tagline,
                bio: prefs.vcardIncludeBio ? shownBio : null,
                avatarUrl: prefs.vcardIncludeAvatar ? profile.avatar_url : null,
                email: prefs.vcardIncludeEmail ? aliasEmail : null,
                phone: prefs.vcardPhone,
                org: prefs.vcardOrg,
                profileUrl:
                  typeof window === "undefined"
                    ? `https://rout.be/${profile.username ?? ""}`
                    : window.location.href,
                links: prefs.vcardIncludeLinks
                  ? blocks
                      .filter((b) => /^https?:\/\//.test(blockHref(b)))
                      .map((b) => ({ label: b.kind, url: blockHref(b) }))
                  : [],
              })
            }
            className="group mt-3 inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-xs font-medium shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
            style={{ border: `1px solid ${t.border}`, color: t.text }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full transition-transform group-hover:scale-105"
              style={{ backgroundColor: t.border, color: t.text }}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
            </span>
            {prefs.vcardLabel?.trim() || "Contact opslaan"}
          </button>
        )}

        {prefs.badgeShowcaseVisible && <BadgeShowcase userId={profile.id} theme={t} />}

        <FavoritesShowcase favorites={prefs.favorites} theme={t} layout={prefs.favoritesLayout} />

        {/* Geverifieerde socials met gecachte volgeraantallen (0 externe calls).
            Mode 1 = icoon + gebruikersnaam met vinkje ernaast; mode 2 = alleen
            het icoon met een micro-vinkje over de rechterbovenhoek. */}
        {prefs.socialPosition === "top" && socialRow}

        <div className={`mt-8 grid w-full gap-3 ${wide ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {blocks.length === 0 && (
            <p className="text-center text-sm" style={{ color: t.muted }}>
              No links yet.
            </p>
          )}
          {blocks.map((b) =>
            b.kind === "spacer" ? (
              <div key={b.id} className="h-6 w-full" aria-hidden />
            ) : b.kind === "text" ? (
              <p
                key={b.id}
                className="w-full whitespace-pre-line px-2 py-1 text-center text-sm leading-relaxed"
                style={{ color: t.muted }}
              >
                {b.value}
              </p>
            ) : isPromoBlock(b.kind) ? (
              <PromoBlock
                key={b.id}
                href={blockHref(b)}
                label={b.label}
                badge={b.badge}
                expiresAt={b.expiresAt}
                style={buttonStyle}
                accent={t.accent ?? t.border ?? "currentColor"}
              />
            ) : isWidgetBlock(b.kind) || isBookingUrl(blockHref(b)) ? (
              b.kind === "media_gallery" ? (
                <GalleryCard key={b.id} config={parseGalleryConfig(b.value)} style={buttonStyle} />
              ) : b.kind === "media_embed" ? (
                <MediaEmbedCard key={b.id} value={b.value} style={buttonStyle} />
              ) : b.kind === "contact_form" ? (
                <ContactFormCard
                  key={b.id}
                  handle={profile.username ?? ""}
                  config={parseContactFormConfig(b.value)}
                  style={buttonStyle}
                />
              ) : b.kind === "event_list" ? (
                <EventListCard
                  key={b.id}
                  config={parseEventListConfig(b.value)}
                  style={buttonStyle}
                />
              ) : b.kind === "live_poll" ? (
                <PollCard
                  key={b.id}
                  pollKey={`${profile.username ?? "anon"}:${b.id}`}
                  config={parsePollConfig(b.value)}
                  style={buttonStyle}
                />
              ) : b.kind === "faq_accordion" ? (
                <FaqCard key={b.id} config={parseFaqConfig(b.value)} style={buttonStyle} />
              ) : b.kind === "map_embed" ? (
                <MapCard key={b.id} config={parseMapConfig(b.value)} style={buttonStyle} />
              ) : b.kind === "booking_request" ? (
                <BookingCard
                  key={b.id}
                  handle={profile.username ?? ""}
                  config={parseBookingConfig(b.value)}
                  style={buttonStyle}
                />
              ) : b.kind === "newsletter" ? (
                <NewsletterBlock
                  key={b.id}
                  handle={profile.username ?? ""}
                  label={b.label}
                  style={buttonStyle}
                />
              ) : (
                <BookingBlock key={b.id} href={blockHref(b)} label={b.label} style={buttonStyle} />
              )
            ) : (
              <a
                key={b.id}
                href={blockHref(b)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80",
                  ctaClass(b.id),
                )}
                style={buttonStyle}
              >
                {b.thumbnailUrl ? (
                  <img
                    src={b.thumbnailUrl}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <SocialPlatformIcon
                    source={blockHref(b) || b.kind}
                    className="h-4 w-4 text-current"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-center">{b.label}</span>
                <span className="h-4 w-4 shrink-0" aria-hidden />
              </a>
            ),
          )}
        </div>

        {prefs.socialPosition === "bottom" && socialRow}

        <footer
          className="mt-10 flex w-full flex-col items-center gap-2"
          style={footerBlockStyle(prefs.footerStyle, prefs.footerAccent, {
            border: t.border,
            card: t.card,
            muted: t.muted,
          })}
        >
          {prefs.socialPosition === "footer" && socialRow}
          {prefs.footerTagline &&
            (prefs.footerStyle === "ticker" ? (
              <div className="w-full overflow-hidden">
                <p
                  className="rout-footer-ticker whitespace-nowrap text-[11px] tracking-widest"
                  style={{ color: prefs.footerAccent ?? t.muted }}
                >
                  {`${prefs.footerTagline} \u00b7 `.repeat(6)}
                </p>
              </div>
            ) : (
              <p
                className="text-center text-[11px]"
                style={{ color: prefs.footerAccent ?? t.muted }}
              >
                {prefs.footerTagline}
              </p>
            ))}
          {showWatermark && (
            <a
              href="/about?ref=watermark"
              className="text-[11px] uppercase tracking-widest transition-opacity hover:opacity-70"
              style={{ color: t.muted }}
            >
              Powered by ROUT
            </a>
          )}
        </footer>
      </div>
    </main>
  );
}

export function ProfileMissing({ username, free }: { username: string; free?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
      <h1 className="font-display text-2xl">@{username} is still available</h1>
      <p className="text-sm text-muted-foreground">
        This handle has not been claimed {free ? "in the community namespace" : "or verified"} yet.
      </p>
      <a href="/auth?mode=signup" className="mt-2 text-sm font-medium underline">
        Claim it on ROUT →
      </a>
    </div>
  );
}

/**
 * Shown when the database lookup itself failed. Never conflate this with an
 * unclaimed handle: telling a member their own profile is "available" because
 * a query timed out is worse than showing an honest error.
 */
export function ProfileLookupError({
  username,
  onRetry,
}: {
  username: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
      <h1 className="font-display text-2xl">We couldn&apos;t load @{username}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The profile lookup failed, so we can&apos;t tell whether this handle is taken. This is a
        connection or server problem — not a missing profile.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium underline underline-offset-4"
        >
          Try again
        </button>
      )}
    </div>
  );
}
