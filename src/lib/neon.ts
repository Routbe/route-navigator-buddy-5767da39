import { neon as neonSql, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Server-only Neon Postgres client for ROUT.
 *
 * The driver is created lazily so a missing DATABASE_URL never crashes module
 * evaluation. Only use inside server functions or route handlers; DATABASE_URL
 * never reaches the client bundle. Authentication is handled by our own
 * Better Auth server (see `better-auth.server.ts`), not by this module.
 */

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for the Neon database connection.");
  }
  client = neonSql(connectionString);
  return client;
}

export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply: (_target, _thisArg, args) =>
    (getClient() as unknown as (...queryArgs: unknown[]) => unknown)(...args),
  get: (_target, property) => {
    const value = (getClient() as unknown as Record<string | symbol, unknown>)[property];
    return typeof value === "function" ? value.bind(getClient()) : value;
  },
}) as NeonQueryFunction<false, false>;
