/**
 * Referral capture — client-safe.
 *
 * A visitor arriving on `rout.be/r/<handle>` is tagged with the inviter's
 * handle. The tag survives the whole sign-up detour (e-mail confirmation,
 * OAuth round-trip) because it lives in both localStorage and a first-party
 * cookie, and it is only consumed once the new member is actually signed in.
 */

export const REFERRAL_KEY = "rout_invited_by";
/** Oudere sleutel — blijft leesbaar zodat lopende uitnodigingen niet sneuvelen. */
export const LEGACY_REFERRAL_KEY = "rout_ref";
export const REFERRAL_TTL_DAYS = 30;

export function referralPath(username: string): string {
  return `/r/${username.replace(/^@/, "").toLowerCase()}`;
}

export function referralUrl(username: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "https://rout.be");
  return `${base}${referralPath(username)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Normaliseert een `ref`-code naar de databasehandle: `u_jona` (gratis lid) en
 * `jona` (Pro) verwijzen naar dezelfde inviter.
 */
export function normalizeReferralCode(raw: string): string {
  return raw.replace(/^@/, "").replace(/^u_/i, "").trim().toLowerCase();
}

/** Remember the inviter. First tag wins, so an inviter is never overwritten. */
export function storeReferrer(username: string): void {
  const handle = normalizeReferralCode(username);
  if (!handle) return;
  if (readReferrer()) return;
  try {
    window.localStorage.setItem(REFERRAL_KEY, handle);
  } catch {
    /* storage blocked — the cookie below still carries the tag */
  }
  if (typeof document !== "undefined") {
    const maxAge = REFERRAL_TTL_DAYS * 24 * 60 * 60;
    document.cookie = `${REFERRAL_KEY}=${encodeURIComponent(handle)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

/**
 * Leest `?ref=` van de huidige URL en bewaart de code 30 dagen. Wordt op
 * `/`, `/signup` en de referral-landingspagina aangeroepen.
 */
export function captureReferralFromUrl(search?: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(search ?? window.location.search);
  const ref = params.get("ref");
  if (!ref) return null;
  const handle = normalizeReferralCode(ref);
  if (!handle) return null;
  storeReferrer(handle);
  return handle;
}

export function readReferrer(): string | null {
  for (const key of [REFERRAL_KEY, LEGACY_REFERRAL_KEY]) {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) return stored;
    } catch {
      /* fall through to the cookie */
    }
    const cookie = readCookie(key);
    if (cookie) return cookie;
  }
  return null;
}

export function clearReferrer(): void {
  for (const key of [REFERRAL_KEY, LEGACY_REFERRAL_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
    }
  }
}
