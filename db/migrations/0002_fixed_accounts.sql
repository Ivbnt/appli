-- ─────────────────────────────────────────────────────────────
-- Comptes fixes
--
-- Les deux comptes sont déclarés dans la configuration (ACCOUNTS) et créés
-- automatiquement, déjà réunis dans le même espace : plus d'inscription ni
-- d'invitation. Un compte n'a pas de mot de passe tant que son ou sa titulaire
-- ne l'a pas choisi via le lien « Première connexion » reçu par e-mail.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

DROP TABLE invitations;

DELETE FROM auth_tokens WHERE type = 'email_verification';
ALTER TABLE auth_tokens DROP CONSTRAINT auth_tokens_type_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_type_check CHECK (type IN ('password_reset'));
