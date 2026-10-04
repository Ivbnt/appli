import "server-only";
import pg from "pg";
import { compile, Sql } from "./sql";

export { sql } from "./sql";

// Types PostgreSQL → JavaScript :
// - bigint (COUNT…) en nombre ;
// - date (AAAA-MM-JJ) conservée en chaîne : une date calendaire n'a pas de fuseau horaire ;
// - numeric (prix) conservé en chaîne pour ne jamais perdre de précision.
pg.types.setTypeParser(20, (value) => Number.parseInt(value, 10));
pg.types.setTypeParser(1082, (value) => value);

type Queryable = Pick<pg.Pool | pg.PoolClient, "query">;

const camelCache = new Map<string, string>();
function toCamel(key: string): string {
  let cached = camelCache.get(key);
  if (!cached) {
    cached = key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
    camelCache.set(key, cached);
  }
  return cached;
}

function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key in row) result[toCamel(key)] = row[key];
  return result as T;
}

/** Exécuteur de requêtes : les colonnes snake_case sont renvoyées en camelCase. */
export class Database {
  constructor(private readonly executor: () => Queryable) {}

  async many<T>(query: Sql): Promise<T[]> {
    const { text, values } = compile(query);
    const result = await this.executor().query(text, values);
    return result.rows.map((row) => mapRow<T>(row));
  }

  async maybe<T>(query: Sql): Promise<T | null> {
    const rows = await this.many<T>(query);
    return rows[0] ?? null;
  }

  async one<T>(query: Sql): Promise<T> {
    const row = await this.maybe<T>(query);
    if (row === null) throw new Error("La requête n'a renvoyé aucune ligne");
    return row;
  }

  /** Requête sans résultat attendu : renvoie le nombre de lignes affectées. */
  async exec(query: Sql): Promise<number> {
    const { text, values } = compile(query);
    const result = await this.executor().query(text, values);
    return result.rowCount ?? 0;
  }

  async count(query: Sql): Promise<number> {
    const row = await this.maybe<{ count: number }>(query);
    return Number(row?.count ?? 0);
  }
}

export type Tx = Database;

class PoolDatabase extends Database {
  constructor(private readonly getPool: () => pg.Pool) {
    super(getPool);
  }

  /** Transaction : COMMIT si la fonction réussit, ROLLBACK sinon. */
  async tx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(new Database(() => client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

const globalForDb = globalThis as unknown as { pgPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL est requis");
    globalForDb.pgPool = new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
    globalForDb.pgPool.on("error", (error) => console.error("[db] erreur du pool", error));
  }
  return globalForDb.pgPool;
}

/** Point d'accès unique à PostgreSQL (pool réutilisé entre les rechargements à chaud). */
export const db = new PoolDatabase(pool);

/** Code d'erreur PostgreSQL d'une violation de contrainte unique. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = error as { code?: string; constraint?: string };
  return e?.code === "23505" && (!constraint || e.constraint === constraint);
}
