# Nous

Application web privée pour un couple : un espace partagé à deux pour les lieux, les tâches, le calendrier, les souvenirs, les films, la playlist, les voyages et quelques jeux.

- **Stack** : Next.js 16 (App Router, Server Actions), React 19, TypeScript strict, Tailwind CSS 4, Motion, Zod, PostgreSQL (SQL brut, sans ORM).
- **Déploiement** : Docker Compose (base, migrations, application, worker de rappels).

---

## Sommaire

1. [Démarrage rapide avec Docker](#démarrage-rapide-avec-docker)
2. [Développement local](#développement-local)
3. [Variables d'environnement](#variables-denvironnement)
4. [Base de données, migrations et seed](#base-de-données-migrations-et-seed)
5. [Intégrations : e-mail, films, Spotify, cartes, stockage](#intégrations)
6. [Production](#production)
7. [Architecture](#architecture)
8. [Sécurité](#sécurité)
9. [Tests](#tests)
10. [Fonctionnalités](#fonctionnalités)

---

## Démarrage rapide avec Docker

Prérequis : Docker et Docker Compose v2.

1. Copiez `.env.example` en `.env` et renseignez au minimum les **deux comptes** autorisés :

   ```bash
   ACCOUNTS="Prénom Nom <premiere@exemple.fr>, Prénom Nom <seconde@exemple.fr>"
   ```

   Pour que les e-mails partent vraiment, configurez aussi l'envoi (voir [E-mail](#e-mail), avec un exemple pour Gmail).

2. Lancez l'application :

   ```bash
   docker compose up --build
   ```

L'application démarre sur **http://localhost:3000** :

- PostgreSQL 17 démarre ;
- le service `migrate` applique les migrations, puis s'arrête ;
- `app` (Next.js) et `worker` (rappels par e-mail) démarrent ensuite ;
- un secret `AUTH_SECRET` est généré au premier lancement et conservé dans le volume `data`.

### Comptes et première connexion

Il n'y a **pas d'inscription**. Seuls les deux comptes déclarés dans `ACCOUNTS` existent : ils sont créés automatiquement, déjà réunis dans le même espace. Aucune autre adresse ne peut se connecter.

Pour la première connexion, chacun ouvre la page de connexion, clique sur **« Première connexion ? Choisir mon mot de passe »** et saisit son adresse. Un lien valable une heure arrive par e-mail ; il permet de choisir son mot de passe et ouvre directement l'espace. Le même chemin sert ensuite en cas de mot de passe oublié.

Sans service d'e-mail configuré (`EMAIL_PROVIDER=console`), rien n'est envoyé : le lien est écrit dans les journaux, visibles avec `docker compose logs app`.

Le nom affiché et la photo se modifient dans **Paramètres → Compte**. Les adresses, elles, se changent uniquement dans `ACCOUNTS`, puis redémarrez l'application. Changer une adresse crée un nouveau compte, qui rejoint l'espace et retrouve toutes les données partagées ; l'ancienne adresse perd l'accès.

### Données de démonstration

```bash
docker compose exec app node dist/seed.mjs
```

Le seed ajoute des données fictives à l'espace des deux comptes : lieux, tâches, événements, photos, films, voyage, quiz et défis. Il ne fait rien si l'espace contient déjà des données. Avec `--force`, il **efface d'abord tout le contenu** de l'espace : à réserver à un essai. `--password <motdepasse>` définit en plus ce mot de passe pour les deux comptes, ce qui évite le passage par l'e-mail en local.

### Dépannage

**`service "migrate" didn't complete successfully`, avec `password authentication failed for user "appli"` dans `docker compose logs db`** : PostgreSQL n'applique `POSTGRES_PASSWORD` qu'à la création de la base. Si le mot de passe a changé depuis le premier lancement, par exemple après avoir créé `.env`, la base garde l'ancien.

- Installation neuve, sans données à garder : `docker compose down -v`, puis `docker compose up --build`.
- Sinon : remettez dans `.env` le mot de passe du premier lancement (`appli` si `.env` n'existait pas encore).

### Commandes utiles

| Commande | Effet |
| --- | --- |
| `docker compose up -d --build` | Démarre en arrière-plan |
| `docker compose logs -f app worker` | Suit les journaux |
| `docker compose run --rm migrate` | Réapplique les migrations |
| `docker compose down` | Arrête (les données sont conservées) |
| `docker compose down -v` | Arrête et **supprime toutes les données** |

Volumes :

- `pgdata` : la base de données ;
- `storage` : les photos et les documents (avec le stockage local) ;
- `data` : le secret généré.

---

## Développement local

Prérequis : Node.js 22 ou plus et PostgreSQL 15 ou plus. La version 15 est nécessaire pour `ON DELETE SET NULL (colonne)`.

```bash
# 1. Une base PostgreSQL, par exemple :
docker run -d --name appli-pg -p 5432:5432 \
  -e POSTGRES_USER=appli -e POSTGRES_PASSWORD=changez-moi -e POSTGRES_DB=appli postgres:17-alpine

# 2. Configuration
cp .env.example .env
#    → renseignez AUTH_SECRET : openssl rand -base64 48

# 3. Installation, migrations, données de démo
npm install
npm run db:migrate
npm run db:seed -- --password motdepasse-local   # facultatif

# 4. Lancement
npm run dev        # http://localhost:3000
npm run worker     # dans un autre terminal, pour les rappels par e-mail
```

### Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` / `npm start` | Build de production (sortie `standalone`) et démarrage |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Applique les migrations SQL en attente |
| `npm run db:seed` | Données de démonstration dans l'espace des deux comptes (`-- --force`, `-- --password …`) |
| `npm run worker` | Worker des rappels et du nettoyage des fichiers |
| `npm test` | Tests unitaires et d'intégration (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |

---

## Variables d'environnement

Toutes les variables sont validées au démarrage avec Zod. Une valeur invalide arrête le processus avec un message explicite. Le fichier `.env.example` liste chaque variable avec un commentaire.

| Variable | Défaut | Description |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3000` | URL publique. Sert aux liens des e-mails et au retour OAuth. En `https://`, les cookies passent en `__Host-` et `Secure`. |
| `APP_TIMEZONE` | `Europe/Paris` | Fuseau horaire de l'affichage, des rappels et des dates EXIF. |
| `DATABASE_URL` | — | Chaîne de connexion PostgreSQL. Sous Docker, elle est construite à partir de `POSTGRES_*`. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `appli` | Identifiants du conteneur PostgreSQL. |
| `AUTH_SECRET` | — | Au moins 32 caractères. Sert à signer les URLs de fichiers et à chiffrer les jetons Spotify. Sous Docker, il est généré automatiquement s'il est vide. |
| `ACCOUNTS` | — | **Obligatoire.** Les deux comptes autorisés : `Prénom Nom <adresse>, Prénom Nom <adresse>`. |
| `MAX_UPLOAD_MB` | `25` | Taille maximale d'une photo ou d'un document. |
| `EMAIL_PROVIDER` | `console` | `console`, `smtp` ou `resend`. |
| `EMAIL_FROM` | — | Expéditeur, par exemple `Nous <bonjour@exemple.fr>`. |
| `EMAIL_API_KEY` | — | Clé Resend. |
| `SMTP_URL` | — | `smtps://utilisateur:motdepasse@hote:465` (caractères spéciaux encodés, `@` → `%40`). |
| `MOVIE_API_KEY` | — | Clé API v3 ou jeton de lecture v4 TMDB. |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | — | Application Spotify. |
| `STORAGE_DRIVER` | `local` | `local` ou `s3`. |
| `STORAGE_LOCAL_DIR` | `./storage` | Dossier des fichiers locaux, hors de `public/`. |
| `STORAGE_*` | — | Endpoint, région, bucket, clés et style de chemin pour un stockage S3. |
| `MAP_API_KEY` | — | Clé MapTiler (facultative). |
| `GEOCODING_USER_AGENT` | — | Contact envoyé à Nominatim. |

Les intégrations sont **facultatives**. Sans clé, l'interface l'indique et propose une alternative (saisie manuelle d'un film, collage d'un lien Spotify, journalisation des e-mails), au lieu d'afficher une erreur.

---

## Base de données, migrations et seed

L'accès aux données passe par **SQL brut** sur `pg`, sans ORM. Le module `server/db/sql.ts` fournit un template tagué :

```ts
const tasks = await db.many<Task>(sql`
  SELECT * FROM tasks
  WHERE workspace_id = ${ctx.workspace.id} AND ${sql.and(filters)}
  ORDER BY position
`);
```

- Chaque valeur interpolée devient un paramètre `$n`. Aucune concaténation de chaînes n'est possible par accident.
- Les fragments peuvent s'imbriquer (`sql.join`, `sql.and`). Seul `sql.raw` insère du texte brut, et il est réservé aux identifiants constants.
- Les colonnes sont converties en camelCase. Les colonnes `date` restent des chaînes `AAAA-MM-JJ` (pas de décalage de fuseau), et les `bigint` deviennent des nombres.
- `db.tx(async (tx) => …)` exécute une transaction.

### Migrations

Les migrations sont des fichiers SQL numérotés dans `db/migrations/`. `npm run db:migrate` (ou le service `migrate` sous Docker) :

- les applique dans l'ordre, chacune dans une transaction ;
- enregistre leur empreinte SHA-256 ; un fichier déjà appliqué puis modifié est refusé ;
- prend un verrou consultatif PostgreSQL, ce qui permet de lancer plusieurs instances sans risque.

Pour faire évoluer le schéma, ajoutez un fichier `0002_description.sql`. Ne modifiez jamais une migration déjà appliquée.

### Schéma (résumé)

| Domaine | Tables |
| --- | --- |
| Comptes | `users`, `sessions`, `auth_tokens`, `rate_limits` |
| Espace | `workspaces`, `workspace_members` (un utilisateur appartient à un seul espace) |
| Organisation | `locations`, `task_categories`, `tasks`, `calendar_events`, `reminders` |
| Souvenirs | `albums`, `photos`, `milestones` |
| Films et musique | `movies`, `movie_reviews`, `playlists`, `spotify_connections` |
| Voyages | `trips`, `reservations` |
| Fun | `activities`, `challenges`, `quizzes`, `quiz_questions`, `quiz_answers`, `badges`, `user_badges` |
| Maintenance | `pending_file_deletions` |

Chaque ressource porte un `workspace_id`. Les références entre ressources utilisent des **clés étrangères composites** `(workspace_id, id)`, si bien qu'une tâche ne peut pas, même par erreur, pointer vers un lieu d'un autre espace.

---

## Intégrations

### E-mail

- `console` : les e-mails sont écrits dans les journaux (développement).
- `smtp` : renseignez `SMTP_URL` et `EMAIL_FROM`.
- `resend` : renseignez `EMAIL_API_KEY` et `EMAIL_FROM` (domaine vérifié chez Resend).

L'application envoie :

- le lien de **première connexion** et celui de **mot de passe oublié** ;
- les **rappels** : restaurant demain, anniversaire dans 7 jours, départ en voyage… ;
- les **nouvelles du partenaire** : une tâche qu'il ou elle vous confie, un événement ajouté au calendrier, un nouveau voyage.

Chaque personne peut désactiver les rappels et les nouvelles dans **Paramètres → Notifications**. Le bouton **« Envoyer un e-mail de test »** de la même page vérifie la configuration.

#### Envoyer avec Gmail

1. Sur le compte Google qui enverra les e-mails, activez la validation en deux étapes, puis créez un **mot de passe d'application** sur https://myaccount.google.com/apppasswords (16 lettres).
2. Dans `.env`, remplacez l'adresse et le mot de passe par les vôtres :

   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_URL=smtps://votre.adresse%40gmail.com:abcdefghijklmnop@smtp.gmail.com:465
   EMAIL_FROM="Nous <votre.adresse@gmail.com>"
   ```

   Le `@` de l'adresse s'écrit `%40` dans `SMTP_URL`. Le mot de passe d'application s'écrit sans espaces.
3. Redémarrez (`docker compose up -d`), puis cliquez sur « Envoyer un e-mail de test ». Pensez à regarder dans les indésirables la première fois.

### Rappels (worker)

Le worker (`worker/index.ts`, service `worker` sous Docker) :

- interroge la table `reminders` toutes les minutes ;
- traite les rappels avec `FOR UPDATE SKIP LOCKED`, ce qui permet de lancer plusieurs workers ;
- réessaie avec un délai croissant en cas d'échec ;
- replanifie les rappels annuels (anniversaires) ;
- supprime les fichiers en attente de suppression.

Des rappels sont créés automatiquement pour les événements (« demain », « dans 2 jours »…), les réservations et les départs en voyage.

### Films (TMDB)

1. Créez un compte sur https://www.themoviedb.org.
2. Ouvrez **Paramètres → API** et copiez la clé API v3 ou le jeton de lecture v4.
3. Renseignez `MOVIE_API_KEY`.

Sans clé, les films peuvent être ajoutés manuellement.

### Spotify

1. Créez une application sur https://developer.spotify.com/dashboard.
2. Ajoutez l'URI de redirection `<APP_URL>/api/spotify/callback`, par exemple `http://127.0.0.1:3000/api/spotify/callback` en local, car Spotify n'accepte plus `localhost`.
3. Renseignez `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET`.

Une fois l'intégration configurée, chaque membre peut connecter son compte (jetons chiffrés en AES-GCM en base) et choisir une playlist. Sans configuration, il suffit de coller le lien d'une playlist publique pour l'intégrer au lecteur.

### Cartes

Sans clé, l'application utilise les fonds CARTO (données OpenStreetMap) et la recherche d'adresses Nominatim. Avec `MAP_API_KEY` (MapTiler), elle utilise les fonds et le géocodage MapTiler. Les requêtes de géocodage passent par le serveur (`/api/geocode`), qui les limite en débit.

### Stockage des fichiers

- `local` : les fichiers sont écrits dans `STORAGE_LOCAL_DIR`, sur le volume `storage` sous Docker.
- `s3` : tout service compatible S3 (AWS, Cloudflare R2, Scaleway, MinIO). Renseignez `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY` et `STORAGE_SECRET_KEY`.

Quel que soit le pilote, les fichiers ne sont jamais servis directement. Ils passent par `/api/files/…` (voir [Sécurité](#sécurité)). Les photos importées sont converties en miniature 480 px et en aperçu 2048 px au format WebP. L'original est conservé, et la date et le lieu de prise de vue sont extraits des métadonnées EXIF.

---

## Production

1. Créez un `.env` avec au minimum :
   - `APP_URL=https://votre-domaine` ;
   - un `POSTGRES_PASSWORD` fort ;
   - `AUTH_SECRET` (`openssl rand -base64 48`) ;
   - un vrai fournisseur d'e-mail.
2. Placez l'application derrière un reverse proxy HTTPS (Caddy, Traefik, Nginx) qui transmet `X-Forwarded-For` et `X-Forwarded-Proto`.
3. Lancez `docker compose up -d --build`.
4. Sauvegardez régulièrement la base et les fichiers :

```bash
docker compose exec db pg_dump -U appli appli | gzip > sauvegarde-$(date +%F).sql.gz
docker run --rm -v appli_storage:/data -v "$PWD":/backup alpine tar czf /backup/fichiers-$(date +%F).tgz -C /data .
```

L'image de production est construite en plusieurs étapes à partir de `node:22-alpine` :

- elle s'exécute avec un utilisateur non root ;
- elle utilise la sortie `standalone` de Next.js ;
- un healthcheck interroge `/api/health`, qui vérifie aussi la base ;
- les scripts Node (worker, migrations, seed) sont regroupés avec esbuild dans `dist/`.

En HTTPS, l'application ajoute les en-têtes HSTS. Elle envoie toujours une Content-Security-Policy stricte et `X-Frame-Options: DENY`.

---

## Architecture

```
app/                    Routes (App Router)
  (auth)/               Connexion, première connexion et mot de passe oublié
  (app)/                Application authentifiée : tableau de bord, carte, tâches, calendrier,
                        souvenirs, films, playlist, voyages, fun, paramètres
  api/                  Fichiers, photos, recherche, géocodage, export, Spotify, santé
components/
  ui/                   Composants de base (boutons, champs, modales, menus…)
  <domaine>/            Composants par fonctionnalité
lib/                    Code partagé client/serveur : validation Zod, dates, domaine, hooks
server/                 Code serveur uniquement (import "server-only")
  db/                   Pool PostgreSQL et template SQL
  auth/                 Mots de passe, sessions, jetons, rate limiting, gardes d'accès
  services/             Logique métier et requêtes SQL, toujours filtrées par espace
  actions/              Server Actions : validation Zod, puis appel des services
  storage/              Stockage local ou S3 et URLs signées
  media/                Traitement des images (sharp, EXIF)
  email/                Envoi et modèles d'e-mails
  integrations/         TMDB, Spotify, géocodage
worker/                 Worker des rappels
db/migrations/          Migrations SQL
scripts/                Migrations, seed, build des scripts, entrypoint Docker
tests/                  Vitest (unitaires et intégration) et Playwright (e2e)
proxy.ts                Redirection des visiteurs non connectés (contrôle optimiste)
```

Chaque mutation suit le même chemin :

1. un composant client appelle une **Server Action** ;
2. `workspaceAction(schema, handler)` valide l'entrée avec Zod et résout la session et l'espace **côté serveur** ;
3. le service exécute un SQL toujours filtré par `workspace_id = ctx.workspace.id` ;
4. le composant reçoit `{ ok, data }` ou `{ ok: false, error, fieldErrors }`.

---

## Sécurité

- **Mots de passe** : hachés en Argon2id, au moins 10 caractères, comparaison en temps constant.
- **Sessions** :
  - stockées en base ; le cookie contient un jeton aléatoire de 256 bits, et la base n'en garde que le hachage SHA-256 ;
  - cookie `HttpOnly` et `SameSite=Lax`, avec `Secure` et le préfixe `__Host-` en HTTPS ;
  - expiration glissante de 30 jours ;
  - révocation de toutes les sessions lors d'un changement ou d'une réinitialisation de mot de passe.
- **Comptes fixes** : seules les adresses de `ACCOUNTS` peuvent se connecter ou recevoir un lien ; il n'existe aucun formulaire d'inscription. Un compte sans mot de passe ne peut pas se connecter tant que son ou sa titulaire n'en a pas choisi un via le lien reçu par e-mail.
- **Jetons à usage unique** (choix et réinitialisation du mot de passe) : aléatoires, stockés hachés et valables une heure. La demande de lien ne révèle pas si une adresse correspond à un compte.
- **Rate limiting** en base sur la connexion, les demandes de lien, les e-mails, le géocodage et les imports.
- **Isolation des espaces** :
  - l'identifiant d'espace n'est **jamais** lu depuis le client ; il est dérivé de la session à chaque requête (`requireWorkspace`, `getApiContext`) ;
  - chaque requête SQL filtre par `workspace_id` ;
  - les clés étrangères composites empêchent toute référence entre espaces ;
  - un utilisateur appartient à un seul espace, et l'espace réunit les deux comptes de `ACCOUNTS` (au plus deux).
- **Fichiers privés** :
  - jamais dans `public/` ;
  - URLs signées par HMAC et à durée limitée ;
  - `/api/files` vérifie aussi que la session appartient à l'espace propriétaire du fichier, si bien qu'une URL signée qui a fuité reste inutilisable par quelqu'un d'autre.
- **Imports** : type vérifié par le contenu (sharp, signature PDF), taille limitée, ré-encodage des images (ce qui supprime les métadonnées des versions affichées).
- **Server Actions** : protection CSRF native de Next.js (vérification de l'origine) et validation Zod systématique.
- **Redirections** : le paramètre `next` n'accepte que des chemins internes.
- **En-têtes** : CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production.
- **RGPD** :
  - export complet en ZIP (JSON, photos originales et documents) ;
  - effacement du contenu de l'espace ;
  - pour supprimer un compte, retirez-le de `ACCOUNTS` (il ne peut plus se connecter), puis supprimez la ligne `users` correspondante si besoin.
- **Secrets** : uniquement dans `.env`, ignoré par Git. `.env.example` ne contient aucune vraie clé.

---

## Tests

```bash
# Unitaires et intégration. La base de test est recréée et migrée à chaque lancement :
# par défaut postgresql://appli:appli@localhost:5432/appli_test, modifiable avec TEST_DATABASE_URL.
npm test

# Bout en bout : démarre un serveur de développement sur le port 3200.
npm run test:e2e
# Ou contre une instance déjà lancée :
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

Les tests e2e utilisent deux comptes fictifs (`alice@exemple.fr`, `bruno@exemple.fr`, modifiables avec `E2E_ACCOUNTS`) : le serveur testé doit avoir les mêmes dans `ACCOUNTS`. Ils écrivent dans la base indiquée par `DATABASE_URL` et vident la table `rate_limits` au démarrage. Ne les lancez pas contre une base de production.

Couverture :

- **Unitaires** : générateur SQL (paramétrage, fragments imbriqués), dates et fuseaux, signatures d'URL, redirections sûres, schémas de validation.
- **Intégration (PostgreSQL réel)** :
  - étanchéité entre deux espaces : lecture, modification et suppression refusées, clés étrangères entre espaces rejetées ;
  - comptes fixes : création des deux comptes dans le même espace, idempotence, ajout d'un compte, première connexion ;
  - jetons à usage unique et rate limiting.
- **E2E (Chromium, desktop et mobile)** :
  - parcours complet : première connexion des deux comptes, espace commun, données partagées ;
  - absence d'inscription, et refus des adresses absentes de `ACCOUNTS` ;
  - redirection des pages protégées ;
  - échec de connexion.

---

## Fonctionnalités

- **Comptes** :
  - deux comptes fixes (`ACCOUNTS`), sans inscription ;
  - première connexion et mot de passe oublié par lien e-mail ; changement de mot de passe ;
  - avatar ; les autres sessions sont fermées à chaque changement de mot de passe.
- **Espace à deux** : créé automatiquement pour les deux comptes ; nom de l'espace et date de début de la relation modifiables.
- **E-mails** : rappels, nouvelles du partenaire, e-mail de test.
- **Tableau de bord** : nombre de jours ensemble, prochain voyage avec compte à rebours, prochain événement et prochaine réservation, tâches à faire, film suggéré pour ce soir, activité suggérée, dernier souvenir.
- **Carte** :
  - lieux visités ou à découvrir, avec catégories, notes et filtres ;
  - recherche d'adresse et ajout par clic sur la carte.
- **Tâches** :
  - vue liste et vue tableau (glisser-déposer) ;
  - catégories, priorités, échéances, assignation ;
  - archives.
- **Calendrier** : vues mois, semaine et agenda ; événements récurrents (anniversaires) ; rappels.
- **Souvenirs** :
  - import multiple par glisser-déposer avec progression ;
  - albums et visionneuse ;
  - timeline avec dates marquantes ; téléchargement de l'original.
- **Films** : recherche TMDB, liste « à voir », films vus avec deux notes et deux avis, filtres et tri.
- **Playlist** : connexion Spotify ou lien de playlist, lecteur intégré.
- **Voyages** : voyages avec couverture, budget et notes ; réservations (hôtel, transport, restaurant, activité) avec documents PDF ou images ; ajout automatique au calendrier.
- **Fun** :
  - quiz créés par l'un et joués par l'autre ;
  - « Qui de nous deux ? » ;
  - tirage au sort d'activités et roue ;
  - défis ; badges débloqués automatiquement.
- **Recherche globale** (Ctrl/⌘ K) dans tous les contenus, avec actions rapides.
- **Paramètres** : compte, couple, notifications, apparence (clair, sombre, système), confidentialité (export, effacement du contenu).
- **Interface** :
  - responsive, avec navigation mobile ;
  - mode sombre dédié ;
  - navigation au clavier, focus visibles, libellés ARIA ;
  - animations respectant `prefers-reduced-motion`.
