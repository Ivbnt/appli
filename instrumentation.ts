/** Au démarrage du serveur : crée les deux comptes de ACCOUNTS (et leur espace) s'ils n'existent pas. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureAccountsOnce } = await import("./server/services/accounts");
  try {
    await ensureAccountsOnce();
  } catch (error) {
    // Configuration incomplète ou base indisponible : l'erreur réapparaîtra, explicite, à la connexion.
    console.error("[accounts] comptes non créés au démarrage :", error instanceof Error ? error.message : error);
  }
}
