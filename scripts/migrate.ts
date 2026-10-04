/**
 * Applique les migrations SQL de `db/migrations` dans l'ordre alphabétique.
 *
 * - chaque fichier est exécuté dans une transaction (tout ou rien) ;
 * - un verrou consultatif PostgreSQL empêche deux exécutions simultanées ;
 * - une empreinte SHA-256 détecte toute modification d'une migration déjà appliquée.
 *
 * Usage : npm run db:migrate   (ou `node dist/migrate.mjs` dans l'image Docker)
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "db/migrations");
const LOCK_ID = 727_001;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL est requis");

  const client = new pg.Client({ connectionString });
  await connectWithRetry(client);

  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        checksum   text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const applied = new Map(
      (await client.query<{ version: string; checksum: string }>("SELECT version, checksum FROM schema_migrations")).rows.map(
        (row) => [row.version, row.checksum],
      ),
    );

    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
    let count = 0;

    for (const file of files) {
      const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const checksum = createHash("sha256").update(content).digest("hex");
      const known = applied.get(file);

      if (known) {
        if (known !== checksum) {
          throw new Error(`La migration ${file} a été modifiée après avoir été appliquée. Créez une nouvelle migration.`);
        }
        continue;
      }

      process.stdout.write(`→ ${file} … `);
      await client.query("BEGIN");
      try {
        await client.query(content);
        await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [file, checksum]);
        await client.query("COMMIT");
        count++;
        process.stdout.write("ok\n");
      } catch (error) {
        await client.query("ROLLBACK");
        process.stdout.write("échec\n");
        throw error;
      }
    }

    console.log(count === 0 ? "Base de données à jour." : `${count} migration(s) appliquée(s).`);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => undefined);
    await client.end();
  }
}

/** Au démarrage de Docker, PostgreSQL peut mettre quelques secondes à accepter les connexions. */
async function connectWithRetry(client: pg.Client, attempts = 30) {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.connect();
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

main().catch((error) => {
  console.error("Migration impossible :", error instanceof Error ? error.message : error);
  process.exit(1);
});
