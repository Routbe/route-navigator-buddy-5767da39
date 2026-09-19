/**
 * Client-veilige helpers voor het "Totaal bereik"-systeem: types en
 * getalformattering. Geen netwerk- of databasecode.
 */

import type { SocialPlatform } from "./social-verify";

export type ReachAccount = {
  id: string;
  platform: SocialPlatform;
  username: string;
  followerCount: number;
  autoSyncEnabled: boolean;
  lastSyncedAt: string | null;
};

export type ReachSettings = {
  showTotalReach: boolean;
  totalReachCount: number;
  manualCount: number | null;
  lastSyncedAt: string | null;
  accounts: ReachAccount[];
};

/** 1200 -> "1.2K", 1050000 -> "1.05M", 980 -> "980". */
export function formatReach(count: number | null | undefined): string {
  if (count === null || count === undefined || !Number.isFinite(count) || count <= 0) return "0";
  const n = Math.round(count);
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const value = n / 1000;
    return `${trim(value < 100 ? value.toFixed(1) : value.toFixed(0))}K`;
  }
  const value = n / 1_000_000;
  return `${trim(value < 100 ? value.toFixed(2) : value.toFixed(0))}M`;
}

function trim(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

/** "Laatst bijgewerkt: 3 uur geleden" — compacte NL relatieve tijd. */
export function relativeTimeNl(iso: string | null | undefined): string {
  if (!iso) return "nog niet gesynchroniseerd";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "nog niet gesynchroniseerd";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  return `${days} dag${days === 1 ? "" : "en"} geleden`;
}
