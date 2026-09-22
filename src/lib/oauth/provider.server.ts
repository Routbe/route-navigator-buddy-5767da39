/**
 * "Login met ROUT" — native OAuth 2.1 / OIDC provider.
 *
 * Alles wat geheim is blijft hier: clientsecrets worden uitsluitend gehasht
 * bewaard, autorisatiecodes zijn gehasht, eenmalig en kortlevend, PKCE S256 is
 * verplicht en redirect-URI's worden exact vergeleken. De ondertekensleutel is
 * asymmetrisch (ES256); alleen de publieke helft verlaat de server via JWKS.
 */
import { sql } from "@/lib/neon";
import { canonicalAppUrl } from "@/lib/app-url";

export const SUPPORTED_SCOPES = ["openid", "profile", "email"] as const;
export type Scope = (typeof SUPPORTED_SCOPES)[number];

const CODE_TTL_MS = 60 * 1000;
const ID_TOKEN_TTL_S = 60 * 60;

export type OAuthClient = {
  id: string;
  clientId: string;
  name: string;
  logoUrl: string | null;
  homepageUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  redirectUris: string[];
  scopes: string[];
  status: string;
  hasSecret: boolean;
  createdAt: string;
};

export class OAuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "OAuthError";
  }
}

/* ------------------------------------------------------------------ utils */

const enc = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(new ArrayBuffer(bytes))));
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value) as BufferSource);
  return base64url(new Uint8Array(digest));
}

/** Exacte, letterlijke vergelijking van een redirect-URI tegen de whitelist. */
export function redirectAllowed(client: OAuthClient, redirectUri: string): boolean {
  return client.redirectUris.some((uri) => uri === redirectUri);
}

/** Alleen https in productie; http uitsluitend voor localhost-ontwikkeling. */
export function isValidRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function issuer(): string {
  return (process.env["NEXT_PUBLIC_APP_URL"] || canonicalAppUrl()).replace(/\/$/, "");
}

let tablesReady = false;
/** Vangnet zodat de console ook werkt vóór migratie 42 handmatig is gedraaid. */
export async function ensureTables(): Promise<void> {
  if (tablesReady) return;
  await sql`create table if not exists public.oauth_clients (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null,
    client_id text not null unique,
    secret_hash text,
    name text not null,
    logo_url text,
    homepage_url text,
    privacy_url text,
    terms_url text,
    redirect_uris text[] not null default '{}',
    scopes text[] not null default '{openid,profile}',
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    secret_rotated_at timestamptz
  )`;
  await sql`create table if not exists public.oauth_auth_codes (
    code_hash text primary key,
    client_id text not null,
    user_id uuid not null,
    redirect_uri text not null,
    scopes text[] not null default '{}',
    code_challenge text not null,
    nonce text,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists public.oauth_consents (
    user_id uuid not null,
    client_id text not null,
    scopes text[] not null default '{}',
    granted_at timestamptz not null default now(),
    primary key (user_id, client_id)
  )`;
  await sql`create table if not exists public.oauth_signing_keys (
    kid text primary key,
    private_jwk jsonb not null,
    public_jwk jsonb not null,
    created_at timestamptz not null default now(),
    retired_at timestamptz
  )`;
  tablesReady = true;
}

type Row = Record<string, unknown>;

function toClient(row: Row): OAuthClient {
  return {
    id: String(row["id"]),
    clientId: String(row["client_id"]),
    name: String(row["name"]),
    logoUrl: (row["logo_url"] as string | null) ?? null,
    homepageUrl: (row["homepage_url"] as string | null) ?? null,
    privacyUrl: (row["privacy_url"] as string | null) ?? null,
    termsUrl: (row["terms_url"] as string | null) ?? null,
    redirectUris: (row["redirect_uris"] as string[] | null) ?? [],
    scopes: (row["scopes"] as string[] | null) ?? [],
    status: String(row["status"] ?? "active"),
    hasSecret: Boolean(row["secret_hash"]),
    createdAt: new Date(row["created_at"] as string).toISOString(),
  };
}

/* ----------------------------------------------------------------- client */

export async function listClients(ownerUserId: string): Promise<OAuthClient[]> {
  await ensureTables();
  const rows = (await sql`select * from public.oauth_clients
    where owner_user_id = ${ownerUserId} order by created_at desc`) as Row[];
  return rows.map(toClient);
}

export async function getClientByClientId(clientId: string): Promise<OAuthClient | null> {
  await ensureTables();
  const rows = (await sql`select * from public.oauth_clients
    where client_id = ${clientId} limit 1`) as Row[];
  return rows[0] ? toClient(rows[0]) : null;
}

export type ClientInput = {
  name: string;
  logoUrl?: string | null;
  homepageUrl?: string | null;
  privacyUrl?: string | null;
  termsUrl?: string | null;
  redirectUris: string[];
  scopes: string[];
};

function sanitize(input: ClientInput) {
  const uris = [...new Set(input.redirectUris.map((u) => u.trim()).filter(Boolean))];
  const bad = uris.find((u) => !isValidRedirectUri(u));
  if (bad) throw new OAuthError("invalid_redirect_uri", `Ongeldige redirect-URI: ${bad}`);
  const scopes = [...new Set(input.scopes.filter((s) => SUPPORTED_SCOPES.includes(s as Scope)))];
  if (!scopes.includes("openid")) scopes.unshift("openid");
  const name = input.name.trim();
  if (!name) throw new OAuthError("invalid_name", "Geef je app een naam.");
  return { name, uris, scopes };
}

export async function createClient(
  ownerUserId: string,
  input: ClientInput,
): Promise<{ client: OAuthClient; clientSecret: string }> {
  await ensureTables();
  const { name, uris, scopes } = sanitize(input);
  const clientId = `rout_${randomToken(16)}`;
  const clientSecret = `routsec_${randomToken(32)}`;
  const secretHash = await sha256Base64Url(clientSecret);
  const rows = (await sql`insert into public.oauth_clients
    (owner_user_id, client_id, secret_hash, name, logo_url, homepage_url, privacy_url, terms_url, redirect_uris, scopes)
    values (${ownerUserId}, ${clientId}, ${secretHash}, ${name}, ${input.logoUrl ?? null},
            ${input.homepageUrl ?? null}, ${input.privacyUrl ?? null}, ${input.termsUrl ?? null},
            ${uris}, ${scopes})
    returning *`) as Row[];
  return { client: toClient(rows[0]!), clientSecret };
}

export async function updateClient(
  ownerUserId: string,
  id: string,
  input: ClientInput,
): Promise<OAuthClient> {
  await ensureTables();
  const { name, uris, scopes } = sanitize(input);
  const rows = (await sql`update public.oauth_clients set
      name = ${name}, logo_url = ${input.logoUrl ?? null},
      homepage_url = ${input.homepageUrl ?? null}, privacy_url = ${input.privacyUrl ?? null},
      terms_url = ${input.termsUrl ?? null}, redirect_uris = ${uris}, scopes = ${scopes},
      updated_at = now()
    where id = ${id} and owner_user_id = ${ownerUserId} returning *`) as Row[];
  if (!rows[0]) throw new OAuthError("not_found", "Deze app bestaat niet (meer).");
  return toClient(rows[0]);
}

export async function deleteClient(ownerUserId: string, id: string): Promise<void> {
  await ensureTables();
  await sql`delete from public.oauth_clients where id = ${id} and owner_user_id = ${ownerUserId}`;
}

export async function rotateClientSecret(ownerUserId: string, id: string): Promise<string> {
  await ensureTables();
  const clientSecret = `routsec_${randomToken(32)}`;
  const secretHash = await sha256Base64Url(clientSecret);
  const rows = (await sql`update public.oauth_clients
    set secret_hash = ${secretHash}, secret_rotated_at = now(), updated_at = now()
    where id = ${id} and owner_user_id = ${ownerUserId} returning id`) as Row[];
  if (!rows[0]) throw new OAuthError("not_found", "Deze app bestaat niet (meer).");
  return clientSecret;
}

/* ------------------------------------------------------------------ codes */

export async function issueAuthorizationCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  nonce?: string | null;
}): Promise<string> {
  await ensureTables();
  const code = randomToken(32);
  const hash = await sha256Base64Url(code);
  const expires = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await sql`insert into public.oauth_auth_codes
    (code_hash, client_id, user_id, redirect_uri, scopes, code_challenge, nonce, expires_at)
    values (${hash}, ${input.clientId}, ${input.userId}, ${input.redirectUri},
            ${input.scopes}, ${input.codeChallenge}, ${input.nonce ?? null}, ${expires})`;
  return code;
}

export async function rememberConsent(userId: string, clientId: string, scopes: string[]) {
  await sql`insert into public.oauth_consents (user_id, client_id, scopes)
    values (${userId}, ${clientId}, ${scopes})
    on conflict (user_id, client_id) do update set scopes = excluded.scopes, granted_at = now()`;
}

async function consumeCode(code: string) {
  const hash = await sha256Base64Url(code);
  const rows = (await sql`update public.oauth_auth_codes set consumed_at = now()
    where code_hash = ${hash} and consumed_at is null and expires_at > now()
    returning *`) as Row[];
  if (!rows[0]) throw new OAuthError("invalid_grant", "Deze autorisatiecode is ongeldig of al gebruikt.");
  return rows[0];
}

/* ----------------------------------------------------------- signing keys */

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type KeyRecord = { kid: string; privateJwk: Jwk; publicJwk: Jwk };

async function activeKey(): Promise<KeyRecord> {
  await ensureTables();
  const rows = (await sql`select * from public.oauth_signing_keys
    where retired_at is null order by created_at desc limit 1`) as Row[];
  if (rows[0]) {
    return {
      kid: String(rows[0]["kid"]),
      privateJwk: rows[0]["private_jwk"] as Jwk,
      publicJwk: rows[0]["public_jwk"] as Jwk,
    };
  }
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const kid = randomToken(8);
  const withMeta: Jwk = { ...publicJwk, kid, alg: "ES256", use: "sig" };
  await sql`insert into public.oauth_signing_keys (kid, private_jwk, public_jwk)
    values (${kid}, ${JSON.stringify({ ...privateJwk, kid })}, ${JSON.stringify(withMeta)})`;
  return { kid, privateJwk: { ...privateJwk, kid }, publicJwk: withMeta };
}

export async function publicJwks(): Promise<{ keys: Jwk[] }> {
  await ensureTables();
  const rows = (await sql`select public_jwk from public.oauth_signing_keys
    where retired_at is null order by created_at desc`) as Row[];
  if (rows.length === 0) return { keys: [(await activeKey()).publicJwk] };
  return { keys: rows.map((r) => r["public_jwk"] as Jwk) };
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const key = await activeKey();
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key.privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = { alg: "ES256", typ: "JWT", kid: key.kid };
  const body = `${base64url(enc.encode(JSON.stringify(header)))}.${base64url(enc.encode(JSON.stringify(payload)))}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      enc.encode(body) as BufferSource,
    ),
  );
  return `${body}.${base64url(signature)}`;
}

/* ------------------------------------------------------------ token grant */

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  clientSecret?: string | null;
  redirectUri: string;
  codeVerifier: string;
}) {
  const client = await getClientByClientId(input.clientId);
  if (!client || client.status !== "active") {
    throw new OAuthError("invalid_client", "Onbekende app.");
  }
  const stored = (await sql`select secret_hash from public.oauth_clients
    where client_id = ${input.clientId} limit 1`) as Row[];
  const secretHash = (stored[0]?.["secret_hash"] as string | null) ?? null;
  if (secretHash) {
    const provided = input.clientSecret ? await sha256Base64Url(input.clientSecret) : "";
    if (provided !== secretHash) throw new OAuthError("invalid_client", "Clientsecret klopt niet.");
  }

  const row = await consumeCode(input.code);
  if (String(row["client_id"]) !== input.clientId) {
    throw new OAuthError("invalid_grant", "Deze code hoort bij een andere app.");
  }
  if (String(row["redirect_uri"]) !== input.redirectUri) {
    throw new OAuthError("invalid_grant", "De redirect-URI komt niet overeen.");
  }
  const challenge = await sha256Base64Url(input.codeVerifier);
  if (challenge !== String(row["code_challenge"])) {
    throw new OAuthError("invalid_grant", "PKCE-controle mislukt.");
  }

  const userId = String(row["user_id"]);
  const scopes = (row["scopes"] as string[] | null) ?? [];
  const claims = await identityClaims(userId, scopes);
  const now = Math.floor(Date.now() / 1000);
  const idToken = await signJwt({
    iss: issuer(),
    sub: userId,
    aud: input.clientId,
    iat: now,
    exp: now + ID_TOKEN_TTL_S,
    ...(row["nonce"] ? { nonce: String(row["nonce"]) } : {}),
    ...claims,
  });
  const accessToken = await signJwt({
    iss: issuer(),
    sub: userId,
    aud: input.clientId,
    scope: scopes.join(" "),
    iat: now,
    exp: now + ID_TOKEN_TTL_S,
  });
  return {
    access_token: accessToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: ID_TOKEN_TTL_S,
    scope: scopes.join(" "),
  };
}

/** Claims volgens de toegestane scopes; `sub` blijft het interne gebruikers-id. */
export async function identityClaims(
  userId: string,
  scopes: string[],
): Promise<Record<string, unknown>> {
  const rows = (await sql`select u.email, u.email_confirmed_at, p.username, p.display_name, p.avatar_url
    from public.users u left join public.profiles p on p.user_id = u.id
    where u.id = ${userId} limit 1`) as Row[];
  const row = rows[0];
  if (!row) return {};
  const claims: Record<string, unknown> = {};
  if (scopes.includes("profile")) {
    claims["preferred_username"] = row["username"] ?? null;
    claims["name"] = row["display_name"] ?? null;
    claims["picture"] = row["avatar_url"] ?? null;
  }
  if (scopes.includes("email")) {
    claims["email"] = row["email"] ?? null;
    claims["email_verified"] = Boolean(row["email_confirmed_at"]);
  }
  return claims;
}
