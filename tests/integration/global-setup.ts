import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

/** Recrée une base de test vierge et y applique toutes les migrations SQL. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://appli:appli@localhost:5432/appli_test";
  const target = new URL(url);
  const database = target.pathname.slice(1);

  const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: "/postgres" }).toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const dir = path.resolve(import.meta.dirname, "../../db/migrations");
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    await client.query(await readFile(path.join(dir, file), "utf8"));
  }
  await client.end();
}
