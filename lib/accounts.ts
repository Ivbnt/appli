export type ConfiguredAccount = { name: string; email: string };

export const MAX_ACCOUNTS = 2;

/**
 * Lit la liste des comptes autorisés, au format
 * « Prénom Nom <adresse@exemple.fr>, Prénom Nom <autre@exemple.fr> »
 * (séparateurs acceptés : virgule, point-virgule ou retour à la ligne).
 */
export function parseAccounts(raw: string): ConfiguredAccount[] {
  const entries = raw
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) throw new Error("ACCOUNTS ne contient aucun compte.");
  if (entries.length > MAX_ACCOUNTS) throw new Error(`ACCOUNTS contient ${entries.length} comptes : ${MAX_ACCOUNTS} au maximum.`);

  const accounts = entries.map((entry) => {
    const match = /^(.+?)\s*<\s*([^<>\s]+@[^<>\s]+\.[^<>\s]+)\s*>$/.exec(entry);
    if (!match) throw new Error(`Compte mal écrit dans ACCOUNTS : « ${entry} » (format attendu : Prénom Nom <adresse@exemple.fr>).`);
    const name = match[1]!.trim().replace(/^["']|["']$/g, "");
    if (name.length > 60) throw new Error(`Nom trop long dans ACCOUNTS : « ${name} » (60 caractères au maximum).`);
    return { name, email: match[2]!.toLowerCase() };
  });

  if (new Set(accounts.map((a) => a.email)).size !== accounts.length) throw new Error("ACCOUNTS contient deux fois la même adresse.");
  return accounts;
}

/** Prénoms des comptes, pour nommer l'espace : « Léa & Hugo ». */
export const defaultWorkspaceName = (accounts: ConfiguredAccount[]) =>
  accounts.map((a) => a.name.split(/\s+/)[0]).join(" & ").slice(0, 60);
