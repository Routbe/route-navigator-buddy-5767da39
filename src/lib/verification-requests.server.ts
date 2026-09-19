/**
 * Bedrijfs- en influencerverificatie — beide met manuele goedkeuring.
 *
 *  • Bedrijf     → zwarte badge, pagina op de officiële domeinnaam
 *                  (rout.be/rout.be, rout.be/lovable.dev)
 *  • Influencer  → roze badge, één van vier gewenste handles
 *                  € 70, of gratis wanneer het account al geverifieerd is
 *
 * Server-only: nooit rechtstreeks importeren vanuit componenten.
 */

import { sql } from "@/lib/neon";

type Row = Record<string, unknown>;

export const INFLUENCER_FEE_CENTS = 7000;

let tablesReady = false;

/** Maakt de tabellen aan wanneer migratie 41 nog niet liep. */
async function ensureTables() {
  if (tablesReady) return;
  await sql`
    create table if not exists public.business_verifications (
      id             uuid primary key default gen_random_uuid(),
      user_id        uuid not null,
      company_name   text not null,
      legal_form     text,
      vat_number     text not null,
      address        text,
      country        text,
      website_domain text not null,
      contact_name   text,
      contact_email  text,
      status         text not null default 'pending',
      admin_note     text,
      created_at     timestamptz not null default now(),
      reviewed_at    timestamptz,
      reviewed_by    uuid
    )
  `;
  await sql`
    create table if not exists public.influencer_requests (
      id             uuid primary key default gen_random_uuid(),
      user_id        uuid not null,
      handle_choices text[] not null default '{}',
      social_links   jsonb not null default '[]'::jsonb,
      motivation     text,
      fee_cents      integer not null default 7000,
      paid           boolean not null default false,
      status         text not null default 'pending',
      granted_handle text,
      admin_note     text,
      created_at     timestamptz not null default now(),
      reviewed_at    timestamptz,
      reviewed_by    uuid
    )
  `;
  await sql`
    alter table public.profiles
      add column if not exists is_business boolean not null default false,
      add column if not exists business_name text,
      add column if not exists business_vat text,
      add column if not exists is_influencer boolean not null default false
  `;
  tablesReady = true;
}

/** Domeinnaam opschonen: `https://ROUT.be/` → `rout.be`. */
export function normalizeDomain(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

const VAT_RE = /^[A-Z]{2}[0-9A-Z.\- ]{6,16}$/i;

export type BusinessInput = {
  companyName: string;
  legalForm?: string | null;
  vatNumber: string;
  address?: string | null;
  country?: string | null;
  websiteDomain: string;
  contactName?: string | null;
  contactEmail?: string | null;
};

/** Dient een bedrijfsaanvraag in (of vervangt de openstaande aanvraag). */
export async function submitBusinessRequest(userId: string, input: BusinessInput) {
  await ensureTables();
  const company = input.companyName.trim();
  const vat = input.vatNumber.trim().toUpperCase().replace(/\s+/g, "");
  const domain = normalizeDomain(input.websiteDomain);

  if (company.length < 2) return { ok: false as const, reason: "Vul de bedrijfsnaam in." };
  if (!VAT_RE.test(vat)) return { ok: false as const, reason: "Vul een geldig btw-nummer in." };
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    return { ok: false as const, reason: "Vul een geldige domeinnaam in, bv. rout.be." };
  }

  await sql`
    delete from public.business_verifications where user_id = ${userId} and status = 'pending'
  `;
  const rows = (await sql`
    insert into public.business_verifications
      (user_id, company_name, legal_form, vat_number, address, country,
       website_domain, contact_name, contact_email)
    values (${userId}, ${company}, ${input.legalForm ?? null}, ${vat},
            ${input.address ?? null}, ${input.country ?? null}, ${domain},
            ${input.contactName ?? null}, ${input.contactEmail ?? null})
    returning id, status, created_at
  `) as Row[];
  return { ok: true as const, request: rows[0] ?? null };
}

/** De meest recente bedrijfsaanvraag van dit account. */
export async function myBusinessRequest(userId: string) {
  await ensureTables();
  const rows = (await sql`
    select id, company_name, vat_number, website_domain, status, admin_note, created_at, reviewed_at
      from public.business_verifications
     where user_id = ${userId}
     order by created_at desc
     limit 1
  `) as Row[];
  return rows[0] ?? null;
}

export type InfluencerInput = {
  /** Vier handles in volgorde van voorkeur; de eerste is verplicht. */
  handleChoices: string[];
  socialLinks: string[];
  motivation?: string | null;
};

/**
 * Dient een influenceraanvraag in. Een al geverifieerd account betaalt niets;
 * anders blijft de aanvraag op `awaiting_payment` staan tot de € 70 binnen is.
 */
export async function submitInfluencerRequest(userId: string, input: InfluencerInput) {
  await ensureTables();
  const { normalizeHandleForStorage } = await import("./handle-rules");
  const choices = input.handleChoices
    .map((h) => normalizeHandleForStorage(h))
    .filter(Boolean)
    .slice(0, 4);
  const links = input.socialLinks.map((l) => l.trim()).filter(Boolean).slice(0, 8);

  if (choices.length === 0) return { ok: false as const, reason: "Geef minstens één naam op." };
  if (links.length === 0) {
    return { ok: false as const, reason: "Geef minstens één sociale link op." };
  }

  const profile = (await sql`
    select coalesce(verified, false) as verified from public.profiles where id = ${userId} limit 1
  `) as Row[];
  const verified = Boolean(profile[0]?.["verified"]);
  const fee = verified ? 0 : INFLUENCER_FEE_CENTS;

  await sql`
    delete from public.influencer_requests
     where user_id = ${userId} and status in ('pending', 'awaiting_payment')
  `;
  const rows = (await sql`
    insert into public.influencer_requests
      (user_id, handle_choices, social_links, motivation, fee_cents, paid, status)
    values (${userId}, ${choices}, ${JSON.stringify(links)}::jsonb,
            ${input.motivation ?? null}, ${fee}, ${fee === 0},
            ${fee === 0 ? "pending" : "awaiting_payment"})
    returning id, status, fee_cents, created_at
  `) as Row[];
  return { ok: true as const, feeCents: fee, request: rows[0] ?? null };
}

export async function myInfluencerRequest(userId: string) {
  await ensureTables();
  const rows = (await sql`
    select id, handle_choices, social_links, status, fee_cents, paid, granted_handle,
           admin_note, created_at, reviewed_at
      from public.influencer_requests
     where user_id = ${userId}
     order by created_at desc
     limit 1
  `) as Row[];
  return rows[0] ?? null;
}

/* ─────────────────────────── beheer ─────────────────────────── */

export async function listBusinessRequests(status = "pending") {
  await ensureTables();
  return (await sql`
    select b.*, p.username, p.display_name
      from public.business_verifications b
      left join public.profiles p on p.id = b.user_id
     where b.status = ${status}
     order by b.created_at desc
     limit 100
  `) as Row[];
}

export async function listInfluencerRequests(status = "pending") {
  await ensureTables();
  return (await sql`
    select i.*, p.username, p.display_name, coalesce(p.verified, false) as verified
      from public.influencer_requests i
      left join public.profiles p on p.id = i.user_id
     where i.status = ${status}
     order by i.created_at desc
     limit 100
  `) as Row[];
}

/**
 * Keurt een bedrijf goed: zwarte badge, bedrijfsgegevens op het profiel en de
 * pagina verhuist naar de officiële domeinnaam (rout.be/<domein>). De oude
 * naam blijft als gratis /u/-pagina bestaan.
 */
export async function approveBusinessRequest(requestId: string, adminId: string) {
  await ensureTables();
  const rows = (await sql`
    select * from public.business_verifications where id = ${requestId} limit 1
  `) as Row[];
  const request = rows[0];
  if (!request) return { ok: false as const, reason: "Aanvraag niet gevonden." };

  const userId = request["user_id"] as string;
  const domain = normalizeDomain(request["website_domain"] as string);

  const { isHandleAvailableFor } = await import("./handle-namespace.server");
  const free = await isHandleAvailableFor(domain, userId);

  if (free) {
    const current = (await sql`
      select username from public.profiles where id = ${userId} limit 1
    `) as Row[];
    const { preserveFreeAliasHandle } = await import("./alias-profile.server");
    await preserveFreeAliasHandle(userId, (current[0]?.["username"] as string | null) ?? null);
    await sql`update public.profiles set username = ${domain} where id = ${userId}`;
  }

  await sql`
    update public.profiles
       set is_business = true,
           business_name = ${request["company_name"] as string},
           business_vat = ${request["vat_number"] as string},
           verified = true,
           verified_at = coalesce(verified_at, now())
     where id = ${userId}
  `;
  await sql`
    update public.business_verifications
       set status = 'approved', reviewed_at = now(), reviewed_by = ${adminId}
     where id = ${requestId}
  `;
  return { ok: true as const, handle: free ? domain : null };
}

export async function rejectBusinessRequest(
  requestId: string,
  adminId: string,
  note?: string | null,
) {
  await ensureTables();
  await sql`
    update public.business_verifications
       set status = 'rejected', admin_note = ${note ?? null},
           reviewed_at = now(), reviewed_by = ${adminId}
     where id = ${requestId}
  `;
  return { ok: true as const };
}

/**
 * Keurt een influencer goed. `handle` is één van de vier voorkeuren (of een
 * naam die de beheerder zelf kiest); is die vrij, dan wordt het de roothandle.
 */
export async function approveInfluencerRequest(
  requestId: string,
  adminId: string,
  handle?: string | null,
) {
  await ensureTables();
  const rows = (await sql`
    select * from public.influencer_requests where id = ${requestId} limit 1
  `) as Row[];
  const request = rows[0];
  if (!request) return { ok: false as const, reason: "Aanvraag niet gevonden." };

  const userId = request["user_id"] as string;
  const choices = (request["handle_choices"] as string[] | null) ?? [];
  const { normalizeHandleForStorage } = await import("./handle-rules");
  const wanted = [handle, ...choices]
    .filter(Boolean)
    .map((h) => normalizeHandleForStorage(String(h)));

  const { isHandleAvailableFor } = await import("./handle-namespace.server");
  let granted: string | null = null;
  for (const candidate of wanted) {
    if (candidate && (await isHandleAvailableFor(candidate, userId))) {
      granted = candidate;
      break;
    }
  }

  if (granted) {
    const current = (await sql`
      select username from public.profiles where id = ${userId} limit 1
    `) as Row[];
    const { preserveFreeAliasHandle } = await import("./alias-profile.server");
    await preserveFreeAliasHandle(userId, (current[0]?.["username"] as string | null) ?? null);
    await sql`update public.profiles set username = ${granted} where id = ${userId}`;
  }

  await sql`
    update public.profiles
       set is_influencer = true, verified = true, verified_at = coalesce(verified_at, now())
     where id = ${userId}
  `;
  await sql`
    update public.influencer_requests
       set status = 'approved', granted_handle = ${granted},
           reviewed_at = now(), reviewed_by = ${adminId}
     where id = ${requestId}
  `;
  return { ok: true as const, handle: granted };
}

export async function rejectInfluencerRequest(
  requestId: string,
  adminId: string,
  note?: string | null,
) {
  await ensureTables();
  await sql`
    update public.influencer_requests
       set status = 'rejected', admin_note = ${note ?? null},
           reviewed_at = now(), reviewed_by = ${adminId}
     where id = ${requestId}
  `;
  return { ok: true as const };
}

/** Rechtstreekse toekenning door een beheerder, zonder aanvraag. */
export async function setInfluencerFlag(userId: string, value: boolean) {
  await ensureTables();
  await sql`update public.profiles set is_influencer = ${value} where id = ${userId}`;
  return { ok: true as const };
}
