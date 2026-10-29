import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { cache } from "react";
import { databaseUrl } from "@/lib/config";
import * as schema from "./schema";
import { seedLevels, seedDemoData } from "./seed";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/** True inside Cloudflare Workers (the production host), false under Node (`next dev` / `next start` / tests). */
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

async function postgresDb(url: string, max: number): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // prepare:false is required behind Supabase's transaction pooler.
  return drizzle(postgres(url, { prepare: false, max }), { schema });
}

async function connect(): Promise<Db> {
  const url = databaseUrl();
  if (url) {
    // Levels come from migration 0003 (applied before each deploy), so a cold start doesn't re-upsert them.
    return postgresDb(url, 5);
  }
  // Hosted deployments have no writable disk for the demo database (it would crash on mkdir).
  if (process.env.VERCEL) {
    throw new Error("No database configured. Set DATABASE_URL (or connect Supabase, which sets POSTGRES_URL) in the Vercel project.");
  }

  // Local demo mode: embedded Postgres (WASM) persisted to .data/pglite.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (!dataDir.startsWith("memory://")) mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const pg = drizzle(client, { schema });
  await migrate(pg, { migrationsFolder: MIGRATIONS });
  // The pglite and postgres-js drivers expose the same query builder API.
  const db = pg as unknown as Db;
  await seedLevels(db);
  if (process.env.SEED_DEMO !== "false") await seedDemoData(db);
  return db;
}

/**
 * Workers can't reuse a socket opened by another request, so each request gets its own client
 * (memoized for the request by React's cache). Levels come from a migration, not a startup upsert.
 */
const workerDb = cache(async (): Promise<Db> => {
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. On Cloudflare the app needs a Postgres database such as Supabase; the built-in demo database only runs locally.",
    );
  }
  return postgresDb(url, 3);
});

// Survive Next.js dev hot reloads: PGlite allows a single open handle per data dir.
const globalForDb = globalThis as unknown as { __testerDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (onWorkers) return workerDb();
  globalForDb.__testerDb ??= connect().catch((err) => {
    globalForDb.__testerDb = undefined;
    throw err;
  });
  return globalForDb.__testerDb;
}

export { schema };
