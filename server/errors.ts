import "server-only";

/** Erreur attendue, dont le message peut être affiché tel quel à l'utilisateur. */
export class UserError extends Error {
  constructor(message: string, readonly fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "UserError";
  }
}

/** Ressource introuvable ou n'appartenant pas à l'espace courant (même message dans les deux cas). */
export class NotFoundError extends UserError {
  constructor(what = "Élément") {
    super(`${what} introuvable.`);
    this.name = "NotFoundError";
  }
}
