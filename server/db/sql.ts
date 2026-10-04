/**
 * Petit constructeur de requêtes SQL paramétrées.
 *
 *   sql`SELECT * FROM tasks WHERE workspace_id = ${workspaceId}`
 *
 * Chaque valeur interpolée devient un paramètre ($1, $2…) : aucune concaténation
 * de chaînes, donc aucune injection SQL possible. Les fragments `sql` peuvent être
 * imbriqués ; `sql.raw` n'est réservé qu'à des identifiants écrits en dur dans le code.
 */
export class Sql {
  constructor(
    readonly strings: readonly string[],
    readonly values: readonly unknown[],
  ) {}
}

class Raw {
  constructor(readonly text: string) {}
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Sql {
  return new Sql(strings, values);
}

sql.raw = (text: string): Raw => new Raw(text);

sql.empty = new Sql([""], []);

/** Assemble plusieurs fragments avec un séparateur (`, ` par défaut). */
sql.join = (fragments: Sql[], separator: Sql | string = ", "): Sql => {
  if (fragments.length === 0) return sql.empty;
  const sep = typeof separator === "string" ? new Raw(separator) : separator;
  const values: unknown[] = [];
  fragments.forEach((fragment, index) => {
    if (index > 0) values.push(sep);
    values.push(fragment);
  });
  return new Sql(new Array<string>(values.length + 1).fill(""), values);
};

/** Combine des conditions avec AND (renvoie TRUE si la liste est vide). */
sql.and = (conditions: (Sql | false | null | undefined | "")[]): Sql => {
  const parts = conditions.filter((c): c is Sql => c instanceof Sql);
  return parts.length === 0 ? sql`TRUE` : sql.join(parts.map((p) => sql`(${p})`), " AND ");
};

export function compile(query: Sql): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const walk = (fragment: Sql): string => {
    let text = fragment.strings[0] ?? "";
    fragment.values.forEach((value, index) => {
      if (value instanceof Sql) text += walk(value);
      else if (value instanceof Raw) text += value.text;
      else {
        values.push(value === undefined ? null : value);
        text += `$${values.length}`;
      }
      text += fragment.strings[index + 1] ?? "";
    });
    return text;
  };
  return { text: walk(query), values };
}
