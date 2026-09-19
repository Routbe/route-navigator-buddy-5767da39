import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * RPC-laag voor het gratis aliasprofiel (`rout.be/u/<handle>`), dat volledig
 * los van het geverifieerde rootprofiel wordt beheerd.
 */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type AliasProfileDTO = {
  username: string | null;
  displayName: string | null;
  tagline: string | null;
  avatarUrl: string | null;
  faviconUrl: string | null;
  theme: string;
  cardStyle: string;
  blocks: Json[];
  verified: boolean;
  status: string;
  verifiedLegalName: string | null;
  displayPrefs: Record<string, Json>;
  /** Is het gekoppelde account geverifieerd? (Aliaspagina blijft de gratis ruimte.) */
  ownerVerified: boolean;
  /** Roothandle van hetzelfde account, `null` zolang er geen verificatie is. */
  rootUsername: string | null;
  aliasHandle: string | null;
};

export const getAliasProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { readAliasProfile } = await import("./alias-profile.server");
    const profile = await readAliasProfile(context.userId);
    return profile as AliasProfileDTO | null;
  });

export type SaveAliasProfileInput = {
  username: string;
  displayName?: string | null;
  tagline?: string | null;
  avatarUrl?: string | null;
  faviconUrl?: string | null;
  theme?: string | null;
  cardStyle?: string | null;
  blocks?: Json[];
  displayPrefs?: Record<string, Json> | null;
};

export const saveAliasProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: SaveAliasProfileInput) => input)
  .handler(async ({ data, context }) => {
    const { writeAliasProfile } = await import("./alias-profile.server");
    try {
      const profile = (await writeAliasProfile(context.userId, data)) as AliasProfileDTO;
      return { ok: true as const, profile, reason: null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "save_failed";
      return { ok: false as const, profile: null, reason };
    }
  });

export const checkAliasHandle = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { handle: string }) => input)
  .handler(async ({ data, context }) => {
    const { isAliasHandleFree } = await import("./alias-profile.server");
    return isAliasHandleFree(data.handle, context.userId);
  });

/** Publieke read voor de `/u/<handle>`-pagina's — geen auth nodig. */
export const getPublicAliasProfileByHandle = createServerFn({ method: "GET" })
  .inputValidator((input: { handle: string }) => input)
  .handler(async ({ data }) => {
    const { readPublicAliasProfile } = await import("./alias-profile.server");
    const row = await readPublicAliasProfile(data.handle);
    if (!row) return null;
    return row as Record<string, Json>;
  });
