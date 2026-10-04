// Configuration de test : base dédiée, secret fixe, stockage temporaire, e-mails non envoyés.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://appli:appli@localhost:5432/appli_test";
process.env.AUTH_SECRET = "test-secret-0123456789abcdef0123456789abcdef";
process.env.APP_URL = "http://localhost:3000";
process.env.APP_TIMEZONE = "Europe/Paris";
process.env.EMAIL_PROVIDER = "console";
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = "/tmp/appli-test-storage";
process.env.ACCOUNTS = "Alice Martin <alice@exemple.fr>, Bruno Petit <bruno@exemple.fr>";
process.env.APP_PASSWORD = "mot-de-passe-de-test";
