/**
 * Worker de tâches de fond (conteneur `worker` de docker-compose).
 *
 * Toutes les minutes :
 *  - envoie les rappels par e-mail arrivés à échéance ;
 *  - supprime du stockage les fichiers en attente de suppression.
 * Toutes les heures : nettoie les sessions, jetons et compteurs expirés.
 */
import { env } from "@/server/env";
import { pool } from "@/server/db";
import { processFileDeletions } from "@/server/storage";
import { cleanupExpired, processDueReminders } from "@/server/services/reminders";

const MINUTE = 60_000;
let running = true;
let lastCleanup = 0;

async function tick() {
  try {
    const reminders = await processDueReminders();
    if (reminders.sent || reminders.failed) console.info(`[worker] rappels envoyés : ${reminders.sent}, échecs : ${reminders.failed}`);
    const files = await processFileDeletions();
    if (files.deleted || files.failed) console.info(`[worker] fichiers supprimés : ${files.deleted}, échecs : ${files.failed}`);
    if (Date.now() - lastCleanup > 60 * MINUTE) {
      lastCleanup = Date.now();
      const cleaned = await cleanupExpired();
      console.info(`[worker] nettoyage : ${cleaned.sessions} session(s), ${cleaned.limits} compteur(s)`);
    }
  } catch (error) {
    console.error("[worker] erreur", error);
  }
}

async function main() {
  env(); // valide la configuration au démarrage
  console.info(`[worker] démarré (fuseau ${env().APP_TIMEZONE}, e-mails : ${env().EMAIL_PROVIDER})`);
  while (running) {
    const started = Date.now();
    await tick();
    const wait = Math.max(5_000, MINUTE - (Date.now() - started));
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.info(`[worker] arrêt (${signal})`);
    running = false;
    await pool().end().catch(() => undefined);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[worker] arrêt sur erreur", error);
  process.exit(1);
});
