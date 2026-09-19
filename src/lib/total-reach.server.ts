import { sql } from "@/lib/neon";
import type { SocialPlatform } from "@/lib/social-verify";
import type { ReachAccount, ReachSettings } from "@/lib/total-reach";

/**
 * Server-only laag voor het totale bereik. Volgeraantallen worden 0-kost
 * opgehaald: open API's (GitHub, Bluesky, Mastodon) of publieke OpenGraph
 * metadata (Instagram, TikTok, X, YouTube, Spotify). Mislukt een platform,
 * dan blijft de gecachte of handmatig ingestelde waarde staan.
 */

type Row = Record<string, unknown>;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toAccount(row: Row): ReachAccount {
  return {
    id: row["id"] as string,
    platform: row["platform"] as SocialPlatform,
    username: row["username"] as string,
    followerCount: Number(row["follower_count"] ?? 0) || 0,
    autoSyncEnabled: row["auto_sync_enabled"] !== false,
    lastSyncedAt: toIso(row["last_synced_at"]),
  };
}

async function readAccounts(profileId: string): Promise<ReachAccount[]> {
  const rows = (await sql`
    select id, platform, username, coalesce(follower_count, 0) as follower_count,
           coalesce(auto_sync_enabled, true) as auto_sync_enabled, last_synced_at
      from public.social_links
     where profile_id = ${profileId}
     order by position asc, created_at asc
  `) as Row[];
  return rows.map(toAccount);
}

/** Herberekent en bewaart het totaal (handmatige waarde heeft voorrang). */
export async function recomputeTotalReach(profileId: string): Promise<number> {
  const rows = (await sql`
    select coalesce(total_reach_manual, null) as manual from public.profiles
     where id = ${profileId} limit 1
  `) as Row[];
  const manual = rows[0]?.["manual"] as number | null | undefined;

  const accounts = await readAccounts(profileId);
  const summed = accounts
    .filter((a) => a.autoSyncEnabled)
    .reduce((total, a) => total + (a.followerCount || 0), 0);
  const total = manual !== null && manual !== undefined ? Number(manual) : summed;

  await sql`
    update public.profiles
       set total_reach_count = ${total}, reach_last_synced_at = now()
     where id = ${profileId}
  `;
  return total;
}

export async function readReachSettings(profileId: string): Promise<ReachSettings> {
  const rows = (await sql`
    select coalesce(show_total_reach, false) as show_total_reach,
           coalesce(total_reach_count, 0) as total_reach_count,
           total_reach_manual, reach_last_synced_at
      from public.profiles where id = ${profileId} limit 1
  `) as Row[];
  const row = rows[0] ?? {};
  const manualRaw = row["total_reach_manual"];
  return {
    showTotalReach: row["show_total_reach"] === true,
    totalReachCount: Number(row["total_reach_count"] ?? 0) || 0,
    manualCount: manualRaw === null || manualRaw === undefined ? null : Number(manualRaw) || 0,
    lastSyncedAt: toIso(row["reach_last_synced_at"]),
    accounts: await readAccounts(profileId),
  };
}

export type ReachSettingsInput = {
  showTotalReach?: boolean;
  manualCount?: number | null;
  accounts?: { id: string; autoSyncEnabled: boolean }[];
};

export async function saveReachSettings(
  profileId: string,
  input: ReachSettingsInput,
): Promise<ReachSettings> {
  if (typeof input.showTotalReach === "boolean") {
    await sql`
      update public.profiles set show_total_reach = ${input.showTotalReach}
       where id = ${profileId}
    `;
  }
  if (input.manualCount !== undefined) {
    const manual = input.manualCount === null ? null : Math.max(0, Math.round(input.manualCount));
    await sql`
      update public.profiles set total_reach_manual = ${manual} where id = ${profileId}
    `;
  }
  for (const account of input.accounts ?? []) {
    await sql`
      update public.social_links
         set auto_sync_enabled = ${account.autoSyncEnabled}
       where id = ${account.id} and profile_id = ${profileId}
    `;
  }
  await recomputeTotalReach(profileId);
  return readReachSettings(profileId);
}

/**
 * Haalt voor elk meegerekend account het publieke volgeraantal op en
 * herberekent daarna het totaal.
 */
export async function syncFollowersForProfile(profileId: string): Promise<ReachSettings> {
  const { fetchSnapshot } = await import("./social-verify.server");
  const accounts = await readAccounts(profileId);

  for (const account of accounts) {
    if (!account.autoSyncEnabled) continue;
    try {
      const snapshot = await fetchSnapshot(account.platform, account.username);
      if (snapshot.followerCount !== null) {
        await sql`
          update public.social_links
             set follower_count = ${snapshot.followerCount},
                 last_synced_at = now(), last_error = null
           where id = ${account.id} and profile_id = ${profileId}
        `;
      } else {
        await sql`
          update public.social_links
             set last_synced_at = now(), last_error = 'no_follower_count'
           where id = ${account.id} and profile_id = ${profileId}
        `;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "fetch_failed";
      await sql`
        update public.social_links
           set last_synced_at = now(), last_error = ${message}
         where id = ${account.id} and profile_id = ${profileId}
      `;
    }
  }

  await recomputeTotalReach(profileId);
  return readReachSettings(profileId);
}

/** Achtergrond-cron: ververst profielen die bereik tonen, oudste eerst. */
export async function syncFollowersBatch(limit = 50) {
  const rows = (await sql`
    select id from public.profiles
     where coalesce(show_total_reach, false) = true
       and (reach_last_synced_at is null or reach_last_synced_at < now() - interval '12 hours')
     order by reach_last_synced_at asc nulls first
     limit ${limit}
  `) as Row[];

  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await syncFollowersForProfile(row["id"] as string);
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { profiles: rows.length, synced, failed };
}
