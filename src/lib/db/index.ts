import "server-only";
import { neon, types as pgTypes } from "@neondatabase/serverless";
import { privyUserFromRequest } from "@/lib/auth/privy";
import { createDbClient, type DbClient, type DbRow, type Executor } from "./builder";

const NUMERIC = 1700;
const INT8 = 20;

/** numeric and bigint columns come back as JSON numbers, as the pages expect. Everything else keeps the default parser. */
const numberTypes = {
  getTypeParser: (id: number, format?: "text" | "binary") => (id === NUMERIC || id === INT8 ? (v: string) => Number(v) : pgTypes.getTypeParser(id, format)),
};

let client: DbClient | null = null;

/** True when the Neon connection string is present. Pages and routes degrade to an empty state when it is not. */
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Database client. Uses Neon's HTTP driver, which opens no long lived connection and suits serverless
 * functions. Point DATABASE_URL at the pooled Neon endpoint. The connection is created on first use,
 * never at import or build time.
 */
export function getDb(): DbClient {
  if (!dbConfigured()) throw new Error("Database is not configured");
  if (!client) {
    const sql = neon(process.env.DATABASE_URL!);
    const exec: Executor = async (text, params) => (await sql.query(text, params, { types: numberTypes })) as DbRow[];
    client = createDbClient(exec);
  }
  return client;
}

/**
 * Resolve the signed-in user. Identity comes from Privy and the database stores only its id.
 * The returned id is the Privy DID and is what every owner column stores.
 */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  return privyUserFromRequest(req);
}

export type { DbClient };
