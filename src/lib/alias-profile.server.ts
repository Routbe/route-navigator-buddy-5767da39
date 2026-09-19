import { sql } from "@/lib/neon";
import { isReservedHandle, normalizeHandle } from "@/lib/profile";
import { normalizeHandleForStorage } from "@/lib/handle-rules";
import { strictHandleIssue } from "@/lib/handle-validation";
import { isHandleBlock, normalizeSocialHandle } from "./social-handles";

/**
 * Neon-datalaag voor het gratis aliasprofiel (`rout.be/u/<handle>`).
 *
 * Dit profiel staat volledig los van het geverifieerde rootprofiel in
 * `public.profiles`: eigen handle, naam, thema, blokken en voorkeuren, zodat
 * een gebruiker beide profielen apart kan beheren.
 */

type Row = Record<string, unknown>;

export type AliasProfile = {
  username: string | null;
  displayName: string | null;
  tagline: string | null;
  avatarUrl: string | null;
  faviconUrl: string | null;
  theme: string;
  cardStyle: string;
  blocks: unknown[];
  /** Aliasprofielen zijn nooit geverifieerd — het vinkje hangt aan de rootnamespace. */
  verified: boolean;
  status: string;
  verifiedLegalName: string | null;
  displayPrefs: Record<string, unknown>;
  /** Is het gekoppelde account geverifieerd? Bepaalt de mens-badge en Pro-opties. */
  ownerVerified: boolean;
  /** `profiles.username` — de roothandle van hetzelfde account (indien geverifieerd). */
  rootUsername: string | null;
  aliasHandle: string | null;
};

function toAliasProfile(row: Row): AliasProfile {
  const handle = (row["handle"] as string | null) ?? null;
  return {
    username: handle,
    displayName: (row["display_name"] as string | null) ?? null,
    tagline: (row["tagline"] as string | null) ?? null,
    avatarUrl: (row["avatar_url"] as string | null) ?? null,
    faviconUrl: (row["favicon_url"] as string | null) ?? null,
    theme: (row["theme"] as string | null) ?? "noir",
    cardStyle: (row["card_style"] as string | null) ?? "bordered",
    blocks: Array.isArray(row["blocks"]) ? (row["blocks"] as unknown[]) : [],
    verified: false,
    status: row["enabled"] === false ? "disabled" : "active",
    verifiedLegalName: null,
    displayPrefs:
      row["display_prefs"] && typeof row["display_prefs"] === "object"
        ? (row["display_prefs"] as Record<string, unknown>)
        : {},
    ownerVerified: Boolean(row["owner_verified"]),
    rootUsername: (row["root_username"] as string | null) ?? null,
    aliasHandle: handle,
  };
}

/**
 * Zorgt dat `public.alias_profiles` bestaat (migratie 38). Zo lukt het aanmaken
 * van een eigen profielpagina ook op databases waar de migratie nog niet is
 * uitgevoerd — anders faalde het opslaan met "relation does not exist".
 */
let tableReady: Promise<void> | null = null;
async function ensureAliasTable(): Promise<void> {
  tableReady ??= (async () => {
    await sql`
      create table if not exists public.alias_profiles (
        user_id        uuid primary key references public.profiles(id) on delete cascade,
        handle         text not null,
        display_name   text,
        tagline        text,
        bio            text,
        avatar_url     text,
        favicon_url    text,
        theme          text not null default 'noir',
        card_style     text not null default 'bordered',
        blocks         jsonb not null default '[]'::jsonb,
        display_prefs  jsonb not null default '{}'::jsonb,
        enabled        boolean not null default true,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now()
      )
    `;
    await sql`
      create unique index if not exists alias_profiles_handle_ci_key
        on public.alias_profiles (lower(handle))
    `;
  })().catch((error) => {
    tableReady = null;
    throw error;
  });
  return tableReady;
}

export async function readAliasProfile(userId: string): Promise<AliasProfile | null> {
  await ensureAliasTable();
  // Ook de rootgegevens meelezen: de Studio moet weten dat dit aliasprofiel bij
  // een geverifieerd account hoort (mens-badge, Pro-opties, tweede adres).
  const rows = (await sql`
    select a.handle, a.display_name, a.tagline, a.avatar_url, a.favicon_url, a.theme,
           a.card_style, a.blocks, a.display_prefs, a.enabled,
           coalesce(p.verified, false) as owner_verified,
           p.username as root_username
      from public.alias_profiles a
      join public.profiles p on p.id = a.user_id
     where a.user_id = ${userId}
     limit 1
  `) as Row[];
  const row = rows[0];
  return row ? toAliasProfile(row) : null;
}

export type AliasProfileInput = {
  username: string;
  displayName?: string | null;
  tagline?: string | null;
  avatarUrl?: string | null;
  faviconUrl?: string | null;
  theme?: string | null;
  cardStyle?: string | null;
  blocks?: unknown[];
  displayPrefs?: Record<string, unknown> | null;
};

function normalizeBlockHandles(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const b = block as Record<string, unknown>;
    const kind = typeof b["kind"] === "string" ? (b["kind"] as string) : "";
    const value = typeof b["value"] === "string" ? (b["value"] as string) : "";
    if (!kind || !value || !isHandleBlock(kind)) return block;
    return { ...b, value: normalizeSocialHandle(value) };
  });
}

/**
 * Is deze aliashandle vrij? Eén gedeelde naamruimte: botst niet met
 * rootprofielen, root-domeinnamen of andere aliassen.
 */
export async function isAliasHandleFree(rawHandle: string, userId: string | null) {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return { ok: false, reason: "invalid" as const };
  if (isReservedHandle(handle)) return { ok: false, reason: "reserved" as const };
  await ensureAliasTable();

  const { isHandleAvailableFor } = await import("./handle-namespace.server");
  if (!(await isHandleAvailableFor(handle, userId)))
    return { ok: false, reason: "taken" as const };

  return { ok: true, reason: null };
}

export async function writeAliasProfile(userId: string, input: AliasProfileInput) {
  await ensureAliasTable();
  const handle = normalizeHandleForStorage(input.username);
  if (!handle) throw new Error("handle_invalid");
  // Serverzijde spiegel van de aliasregel: minstens 5 tekens én 2 cijfers.
  if (strictHandleIssue(handle, { alias: true })) throw new Error("handle_invalid");
  if (isReservedHandle(handle)) throw new Error("handle_reserved");

  const free = await isAliasHandleFree(handle, userId);
  if (!free.ok) throw new Error(free.reason === "reserved" ? "handle_reserved" : "handle_taken");

  const blocks = normalizeBlockHandles(input.blocks ?? []);

  const rows = (await sql`
    insert into public.alias_profiles (
      user_id, handle, display_name, tagline, avatar_url, favicon_url,
      theme, card_style, blocks, display_prefs, updated_at
    ) values (
      ${userId}, ${handle}, ${input.displayName ?? null}, ${input.tagline ?? null},
      ${input.avatarUrl ?? null}, ${input.faviconUrl ?? null},
      ${input.theme ?? "noir"}, ${input.cardStyle ?? "bordered"},
      ${JSON.stringify(blocks)}::jsonb,
      ${JSON.stringify(input.displayPrefs ?? {})}::jsonb, now()
    )
    on conflict (user_id) do update set
      handle = excluded.handle,
      display_name = excluded.display_name,
      tagline = excluded.tagline,
      avatar_url = excluded.avatar_url,
      favicon_url = excluded.favicon_url,
      theme = excluded.theme,
      card_style = excluded.card_style,
      blocks = excluded.blocks,
      display_prefs = excluded.display_prefs,
      updated_at = now()
    returning handle, display_name, tagline, avatar_url, favicon_url, theme, card_style,
              blocks, display_prefs, enabled
  `) as Row[];

  return toAliasProfile(rows[0]!);
}

/**
 * Publieke lookup voor `/u/<handle>`. Levert een rij in hetzelfde formaat als
 * `readPublicProfile`, maar altijd als niet-geverifieerd gratis profiel.
 */
export async function readPublicAliasProfile(rawHandle: string) {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;
  await ensureAliasTable();
  const rows = (await sql`
    select a.user_id as id, a.handle as username, a.display_name, a.tagline, a.bio,
           a.avatar_url, a.favicon_url, a.theme, a.card_style, a.blocks,
           a.display_prefs, a.created_at,
           coalesce(p.is_banned, false) as is_banned,
           coalesce(p.is_suspended, false) as is_suspended,
           coalesce(p.verified, false) as owner_verified,
           p.verified_at as owner_verified_at
      from public.alias_profiles a
      join public.profiles p on p.id = a.user_id
     where lower(a.handle) = ${handle}
       and a.enabled = true
       and coalesce(p.is_banned, false) = false
     limit 1
  `) as Row[];
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    verified: false,
    // Het blauwe vinkje blijft bij het rootprofiel; het aliasprofiel toont het
    // mens-symbool wanneer het gekoppelde account geverifieerd is.
    human_linked: Boolean(row["owner_verified"]),
    verified_at: (row["owner_verified_at"] as string | null) ?? null,
    verified_legal_name: null,
    is_early_believer: false,
    status: "active",
    url_style: "u",
    show_total_reach: false,
    total_reach_count: 0,
    social_links: [],
  } as Row;
}

/**
 * Bewaart de gratis handle wanneer een account naar een geverifieerde
 * roothandle verhuist.
 *
 * Zonder dit verdween `rout.be/u/<oude naam>` zodra `profiles.username`
 * werd hernoemd naar de geclaimde/geverifieerde naam. De oude (gratis) naam
 * blijft nu bestaan als aliasprofiel, zodat een account altijd twee adressen
 * houdt: `rout.be/u/user12` (gratis) en `rout.be/voornaam.achternaam`
 * (geverifieerd).
 *
 * Idempotent: bestaat er al een aliasprofiel, dan blijft dat ongemoeid.
 */
export async function preserveFreeAliasHandle(
  userId: string,
  previousHandle: string | null | undefined,
): Promise<{ ok: boolean; handle: string | null }> {
  const handle = normalizeHandleForStorage(String(previousHandle ?? ""));
  if (!handle) return { ok: false, handle: null };
  if (isReservedHandle(handle)) return { ok: false, handle: null };

  try {
    await ensureAliasTable();

    const mine = (await sql`
      select handle from public.alias_profiles where user_id = ${userId} limit 1
    `) as Row[];
    if (mine[0]) return { ok: true, handle: (mine[0]["handle"] as string | null) ?? null };

    const taken = (await sql`
      select user_id from public.alias_profiles
       where lower(handle) = ${handle} and user_id <> ${userId} limit 1
    `) as Row[];
    if (taken[0]) return { ok: false, handle: null };

    await sql`
      insert into public.alias_profiles (user_id, handle, updated_at)
      values (${userId}, ${handle}, now())
      on conflict (user_id) do nothing
    `;
    return { ok: true, handle };
  } catch {
    return { ok: false, handle: null };
  }
}
