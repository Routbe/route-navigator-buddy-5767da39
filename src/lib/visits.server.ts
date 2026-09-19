import { sql } from "@/lib/neon";

/**
 * Bezoekregistratie voor publieke profielen (root én alias).
 *
 * Privacyvriendelijk: geen cookies, geen IP-opslag. Unieke bezoekers worden
 * geteld via een dag-gebonden hash van ip + user-agent + salt, zodat niemand
 * over dagen heen gevolgd kan worden.
 */

type Row = Record<string, unknown>;

export type VisitSpace = "root" | "alias";

export type RecordVisitInput = {
  handle: string;
  space: VisitSpace;
  path?: string | null;
  locale?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  country?: string | null;
};

let tableReady: Promise<void> | null = null;

/** Zorgt dat migratie 40 aanwezig is, ook op databases zonder migratierun. */
async function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await sql`
      create table if not exists public.profile_visits (
        id              bigserial primary key,
        profile_user_id uuid,
        handle          text not null,
        space           text not null default 'alias',
        path            text,
        locale          text,
        country         text,
        device          text,
        visitor_hash    text,
        created_at      timestamptz not null default now()
      )
    `;
    await sql`
      create index if not exists profile_visits_user_time_idx
        on public.profile_visits (profile_user_id, created_at desc)
    `;
    await sql`
      create index if not exists profile_visits_handle_time_idx
        on public.profile_visits (lower(handle), created_at desc)
    `;
  })().catch((error) => {
    tableReady = null;
    throw error;
  });
  return tableReady;
}

async function dailyVisitorHash(ip: string, userAgent: string): Promise<string> {
  const salt = process.env["CONTACT_HASH_SALT"] ?? "rout-visits";
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${salt}:${day}:${ip}:${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function deviceFrom(userAgent: string): string {
  if (/iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) return "mobile";
  if (/ipad|tablet|android/i.test(userAgent)) return "tablet";
  if (!userAgent) return "unknown";
  return "desktop";
}

/** Kortstondige de-duplicatie: één bezoek per bezoeker/handle per 30 minuten. */
const DEDUPE_MS = 30 * 60 * 1000;
const recent = new Map<string, number>();

export async function recordVisit(input: RecordVisitInput): Promise<{ recorded: boolean }> {
  const handle = input.handle.trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { recorded: false };

  const userAgent = (input.userAgent ?? "").slice(0, 400);
  // Bots tellen niet mee als bezoek.
  if (/bot|crawler|spider|preview|curl|wget|monitor|lighthouse/i.test(userAgent)) {
    return { recorded: false };
  }

  const visitorHash = await dailyVisitorHash(input.ip ?? "", userAgent);
  const key = `${visitorHash}:${handle}:${input.space}`;
  const now = Date.now();
  const seen = recent.get(key);
  if (seen && now - seen < DEDUPE_MS) return { recorded: false };
  recent.set(key, now);
  if (recent.size > 5000) {
    for (const [k, at] of recent) if (now - at > DEDUPE_MS) recent.delete(k);
  }

  await ensureTable();

  const ownerRows = (await sql`
    select id from public.profiles where lower(username) = ${handle} limit 1
  `) as Row[];
  let ownerId = (ownerRows[0]?.["id"] as string | undefined) ?? null;
  if (!ownerId) {
    try {
      const aliasRows = (await sql`
        select user_id from public.alias_profiles where lower(handle) = ${handle} limit 1
      `) as Row[];
      ownerId = (aliasRows[0]?.["user_id"] as string | undefined) ?? null;
    } catch {
      ownerId = null;
    }
  }
  if (!ownerId) {
    const rootRows = (await sql`
      select id from public.profiles
       where lower(coalesce(subdomain_alias, '')) = ${handle} limit 1
    `) as Row[];
    ownerId = (rootRows[0]?.["id"] as string | undefined) ?? null;
  }

  await sql`
    insert into public.profile_visits
      (profile_user_id, handle, space, path, locale, country, device, visitor_hash)
    values (
      ${ownerId}, ${handle}, ${input.space === "root" ? "root" : "alias"},
      ${(input.path ?? "").slice(0, 200) || null},
      ${(input.locale ?? "").slice(0, 10).toLowerCase() || null},
      ${(input.country ?? "").slice(0, 2).toUpperCase() || null},
      ${deviceFrom(userAgent)},
      ${visitorHash}
    )
  `;
  return { recorded: true };
}

export type VisitStats = {
  days: number;
  total: number;
  unique: number;
  bySpace: { root: number; alias: number };
  perDay: Array<{ date: string; visits: number }>;
  perLanguage: Array<{ locale: string; visits: number }>;
  perCountry: Array<{ country: string; visits: number }>;
  recent: Array<{
    at: string;
    handle: string;
    space: VisitSpace;
    locale: string | null;
    country: string | null;
    device: string | null;
    path: string | null;
  }>;
};

const EMPTY: VisitStats = {
  days: 30,
  total: 0,
  unique: 0,
  bySpace: { root: 0, alias: 0 },
  perDay: [],
  perLanguage: [],
  perCountry: [],
  recent: [],
};

/** Volledig bezoekersoverzicht voor één account. `space` filtert op namespace. */
export async function readVisitStats(
  userId: string,
  options: { days?: number; space?: VisitSpace | "all" } = {},
): Promise<VisitStats> {
  const days = Math.min(Math.max(options.days ?? 30, 1), 365);
  const space = options.space ?? "all";

  try {
    await ensureTable();
  } catch {
    return { ...EMPTY, days };
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const spaceFilter = space === "all" ? null : space;

  const [totals, perDayRows, perLangRows, perCountryRows, recentRows] = await Promise.all([
    sql`
      select count(*)::int as total,
             count(distinct visitor_hash)::int as unique_visitors,
             count(*) filter (where space = 'root')::int as root_visits,
             count(*) filter (where space = 'alias')::int as alias_visits
        from public.profile_visits
       where profile_user_id = ${userId}
         and created_at >= ${since}
         and (${spaceFilter}::text is null or space = ${spaceFilter})
    ` as Promise<Row[]>,
    sql`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
             count(*)::int as visits
        from public.profile_visits
       where profile_user_id = ${userId}
         and created_at >= ${since}
         and (${spaceFilter}::text is null or space = ${spaceFilter})
       group by 1 order by 1 asc
    ` as Promise<Row[]>,
    sql`
      select coalesce(locale, 'unknown') as locale, count(*)::int as visits
        from public.profile_visits
       where profile_user_id = ${userId}
         and created_at >= ${since}
         and (${spaceFilter}::text is null or space = ${spaceFilter})
       group by 1 order by 2 desc limit 12
    ` as Promise<Row[]>,
    sql`
      select coalesce(country, '??') as country, count(*)::int as visits
        from public.profile_visits
       where profile_user_id = ${userId}
         and created_at >= ${since}
         and (${spaceFilter}::text is null or space = ${spaceFilter})
       group by 1 order by 2 desc limit 12
    ` as Promise<Row[]>,
    sql`
      select created_at, handle, space, locale, country, device, path
        from public.profile_visits
       where profile_user_id = ${userId}
         and created_at >= ${since}
         and (${spaceFilter}::text is null or space = ${spaceFilter})
       order by created_at desc limit 50
    ` as Promise<Row[]>,
  ]);

  const t = totals[0] ?? {};
  return {
    days,
    total: Number(t["total"] ?? 0),
    unique: Number(t["unique_visitors"] ?? 0),
    bySpace: {
      root: Number(t["root_visits"] ?? 0),
      alias: Number(t["alias_visits"] ?? 0),
    },
    perDay: perDayRows.map((r) => ({
      date: String(r["date"]),
      visits: Number(r["visits"] ?? 0),
    })),
    perLanguage: perLangRows.map((r) => ({
      locale: String(r["locale"]),
      visits: Number(r["visits"] ?? 0),
    })),
    perCountry: perCountryRows.map((r) => ({
      country: String(r["country"]),
      visits: Number(r["visits"] ?? 0),
    })),
    recent: recentRows.map((r) => ({
      at: new Date(String(r["created_at"])).toISOString(),
      handle: String(r["handle"]),
      space: (r["space"] === "root" ? "root" : "alias") as VisitSpace,
      locale: (r["locale"] as string | null) ?? null,
      country: (r["country"] as string | null) ?? null,
      device: (r["device"] as string | null) ?? null,
      path: (r["path"] as string | null) ?? null,
    })),
  };
}
