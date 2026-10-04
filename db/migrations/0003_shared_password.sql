-- ─────────────────────────────────────────────────────────────
-- Mot de passe commun
--
-- Plus de mot de passe par compte ni de lien envoyé par e-mail : on se connecte
-- avec l'une des deux adresses de ACCOUNTS et le mot de passe commun APP_PASSWORD,
-- tous deux définis dans .env.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users DROP COLUMN password_hash;

DROP TABLE auth_tokens;

-- Empreinte du mot de passe commun : quand APP_PASSWORD change, toutes les sessions
-- sont fermées au démarrage suivant.
CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
