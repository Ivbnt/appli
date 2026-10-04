-- ─────────────────────────────────────────────────────────────
-- Schéma initial
--
-- Principes :
--  • toute donnée métier porte un workspace_id (l'espace du couple) ;
--  • les références entre tables métier utilisent des clés étrangères composites
--    (workspace_id, id) : la base elle-même interdit qu'une tâche pointe vers la
--    catégorie, la photo ou le voyage d'un autre espace ;
--  • les jetons (sessions, e-mails, invitations) ne sont stockés que sous forme de hash.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Comptes ──────────────────────────────────────────────────

CREATE TABLE users (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  email                    text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash            text NOT NULL,
  email_verified_at        timestamptz,
  avatar_key               text,
  theme_preference         text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  email_notifications      boolean NOT NULL DEFAULT true,
  reminder_emails          boolean NOT NULL DEFAULT true,
  default_reminder_minutes integer DEFAULT 1440 CHECK (default_reminder_minutes IS NULL OR default_reminder_minutes BETWEEN 0 AND 43200),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- L'identifiant d'une session est le hash SHA-256 du jeton présent dans le cookie.
CREATE TABLE sessions (
  id           text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent   text,
  ip_address   text
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE auth_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_type_idx ON auth_tokens (user_id, type);

CREATE TABLE rate_limits (
  key      text PRIMARY KEY,
  count    integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX rate_limits_reset_at_idx ON rate_limits (reset_at);

-- ── Espace partagé ───────────────────────────────────────────

CREATE TABLE workspaces (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  together_since date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Un utilisateur appartient à un seul espace : l'espace courant se déduit toujours
-- de la session, jamais d'un paramètre envoyé par le navigateur.
CREATE TABLE workspace_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workspace_members_workspace_idx ON workspace_members (workspace_id);

CREATE TABLE invitations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  email          text CHECK (email IS NULL OR email = lower(email)),
  token_hash     text NOT NULL UNIQUE,
  invited_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  accepted_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  expires_at     timestamptz NOT NULL,
  accepted_at    timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_workspace_idx ON invitations (workspace_id);

-- ── Voyages ──────────────────────────────────────────────────

CREATE TABLE trips (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title         text NOT NULL,
  destination   text NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  description   text,
  cover_key     text,
  latitude      double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude     double precision CHECK (longitude BETWEEN -180 AND 180),
  created_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  CHECK (end_date >= start_date)
);
CREATE INDEX trips_workspace_start_idx ON trips (workspace_id, start_date);
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Lieux ────────────────────────────────────────────────────

CREATE TABLE locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name          text NOT NULL,
  address       text,
  latitude      double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude     double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  category      text NOT NULL DEFAULT 'other' CHECK (category IN ('restaurant', 'cafe', 'bar', 'hotel', 'travel', 'activity', 'other')),
  status        text NOT NULL DEFAULT 'want_to_visit' CHECK (status IN ('visited', 'want_to_visit')),
  visited_at    date,
  rating        smallint CHECK (rating BETWEEN 1 AND 5),
  notes         text,
  external_url  text,
  trip_id       uuid,
  created_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, trip_id) REFERENCES trips (workspace_id, id) ON DELETE SET NULL (trip_id)
);
CREATE INDEX locations_workspace_status_idx ON locations (workspace_id, status);
CREATE INDEX locations_workspace_category_idx ON locations (workspace_id, category);
CREATE INDEX locations_trip_idx ON locations (trip_id);
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Tâches ───────────────────────────────────────────────────

CREATE TABLE task_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name         text NOT NULL,
  slug         text NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  UNIQUE (workspace_id, slug),
  UNIQUE (workspace_id, id)
);

CREATE TABLE tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  category_id    uuid,
  priority       text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status         text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date       date,
  assigned_to_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  position       double precision NOT NULL DEFAULT 0,
  completed_at   timestamptz,
  archived_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, category_id) REFERENCES task_categories (workspace_id, id) ON DELETE SET NULL (category_id)
);
CREATE INDEX tasks_board_idx ON tasks (workspace_id, archived_at, status, position);
CREATE INDEX tasks_workspace_due_idx ON tasks (workspace_id, due_date);
CREATE INDEX tasks_category_idx ON tasks (category_id);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Réservations ─────────────────────────────────────────────

CREATE TABLE reservations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  trip_id             uuid,
  title               text NOT NULL,
  type                text NOT NULL DEFAULT 'other' CHECK (type IN ('flight', 'train', 'hotel', 'restaurant', 'concert', 'activity', 'rental', 'other')),
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz,
  has_time            boolean NOT NULL DEFAULT true,
  location            text,
  origin              text,
  destination         text,
  provider            text,
  confirmation_number text,
  price               numeric(10, 2) CHECK (price IS NULL OR price >= 0),
  currency            char(3) NOT NULL DEFAULT 'EUR',
  document_key        text,
  document_name       text,
  document_mime       text,
  document_size       integer,
  url                 text,
  notes               text,
  add_to_calendar     boolean NOT NULL DEFAULT true,
  created_by_id       uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, trip_id) REFERENCES trips (workspace_id, id) ON DELETE SET NULL (trip_id),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX reservations_workspace_start_idx ON reservations (workspace_id, starts_at);
CREATE INDEX reservations_trip_idx ON reservations (trip_id);
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Calendrier & rappels ─────────────────────────────────────

CREATE TABLE calendar_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  start_date       timestamptz NOT NULL,
  end_date         timestamptz,
  all_day          boolean NOT NULL DEFAULT false,
  location         text,
  type             text NOT NULL DEFAULT 'other' CHECK (type IN ('appointment', 'birthday', 'important_date', 'trip', 'restaurant', 'concert', 'activity', 'reservation', 'other')),
  recurrence       text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'yearly')),
  reminder_minutes integer CHECK (reminder_minutes IS NULL OR reminder_minutes BETWEEN 0 AND 43200),
  created_by_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  -- Événements générés automatiquement depuis une réservation ou un voyage.
  reservation_id   uuid UNIQUE,
  trip_id          uuid UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, reservation_id) REFERENCES reservations (workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, trip_id) REFERENCES trips (workspace_id, id) ON DELETE CASCADE,
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX calendar_events_workspace_start_idx ON calendar_events (workspace_id, start_date);
CREATE INDEX calendar_events_workspace_recurrence_idx ON calendar_events (workspace_id, recurrence);
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE reminders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  event_id      uuid NOT NULL,
  occurrence_at timestamptz NOT NULL,
  remind_at     timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts      integer NOT NULL DEFAULT 0,
  last_error    text,
  sent_at       timestamptz,
  locked_until  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, occurrence_at),
  FOREIGN KEY (workspace_id, event_id) REFERENCES calendar_events (workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX reminders_due_idx ON reminders (status, remind_at);
CREATE INDEX reminders_workspace_idx ON reminders (workspace_id);

-- ── Souvenirs ────────────────────────────────────────────────

CREATE TABLE albums (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  cover_photo_id uuid,
  created_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);
CREATE INDEX albums_workspace_created_idx ON albums (workspace_id, created_at);
CREATE TRIGGER albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  album_id       uuid,
  storage_key    text NOT NULL,
  thumbnail_key  text NOT NULL,
  preview_key    text NOT NULL,
  original_name  text NOT NULL,
  mime_type      text NOT NULL,
  size_bytes     integer NOT NULL,
  width          integer,
  height         integer,
  dominant_color text,
  description    text,
  taken_at       timestamptz,
  location       text,
  latitude       double precision,
  longitude      double precision,
  place_id       uuid,
  trip_id        uuid,
  created_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, album_id) REFERENCES albums (workspace_id, id) ON DELETE SET NULL (album_id),
  FOREIGN KEY (workspace_id, place_id) REFERENCES locations (workspace_id, id) ON DELETE SET NULL (place_id),
  FOREIGN KEY (workspace_id, trip_id) REFERENCES trips (workspace_id, id) ON DELETE SET NULL (trip_id)
);
CREATE INDEX photos_workspace_taken_idx ON photos (workspace_id, (COALESCE(taken_at, created_at)) DESC);
CREATE INDEX photos_album_idx ON photos (album_id);
CREATE INDEX photos_place_idx ON photos (place_id);
CREATE INDEX photos_trip_idx ON photos (trip_id);

ALTER TABLE albums
  ADD FOREIGN KEY (workspace_id, cover_photo_id) REFERENCES photos (workspace_id, id) ON DELETE SET NULL (cover_photo_id);

CREATE TABLE milestones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  date          date NOT NULL,
  photo_id      uuid,
  created_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, photo_id) REFERENCES photos (workspace_id, id) ON DELETE SET NULL (photo_id)
);
CREATE INDEX milestones_workspace_date_idx ON milestones (workspace_id, date);
CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Films ────────────────────────────────────────────────────

CREATE TABLE movies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  external_id  text,
  title        text NOT NULL,
  poster_url   text,
  backdrop_url text,
  year         integer CHECK (year IS NULL OR year BETWEEN 1870 AND 2200),
  genres       text[] NOT NULL DEFAULT '{}',
  runtime      integer CHECK (runtime IS NULL OR runtime > 0),
  overview     text,
  status       text NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watched')),
  watched_at   date,
  -- Moyenne des notes des deux membres, recalculée à chaque avis.
  rating       real,
  notes        text,
  added_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, external_id)
);
CREATE INDEX movies_workspace_status_idx ON movies (workspace_id, status, created_at DESC);
CREATE TRIGGER movies_updated_at BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE movie_reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id   uuid NOT NULL REFERENCES movies (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, user_id)
);
CREATE INDEX movie_reviews_user_idx ON movie_reviews (user_id);
CREATE TRIGGER movie_reviews_updated_at BEFORE UPDATE ON movie_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Spotify ──────────────────────────────────────────────────

CREATE TABLE playlists (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  spotify_id     text NOT NULL,
  url            text NOT NULL,
  name           text NOT NULL,
  description    text,
  image_url      text,
  owner_name     text,
  track_count    integer,
  -- Instantané des métadonnées des morceaux (jamais d'audio).
  tracks         jsonb,
  last_synced_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, spotify_id)
);
CREATE TRIGGER playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Jetons OAuth chiffrés au repos (AES-256-GCM).
CREATE TABLE spotify_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL UNIQUE REFERENCES workspaces (id) ON DELETE CASCADE,
  spotify_user_id   text NOT NULL,
  display_name      text,
  access_token_enc  text NOT NULL,
  refresh_token_enc text NOT NULL,
  expires_at        timestamptz NOT NULL,
  scope             text NOT NULL,
  connected_by_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER spotify_connections_updated_at BEFORE UPDATE ON spotify_connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Fun ──────────────────────────────────────────────────────

CREATE TABLE activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  label        text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  pool         text NOT NULL CHECK (pool IN ('tonight', 'wheel')),
  done_count   integer NOT NULL DEFAULT 0,
  last_done_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activities_workspace_pool_idx ON activities (workspace_id, pool);

CREATE TABLE challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  difficulty    text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration      text,
  reward        text,
  status        text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  started_at    timestamptz,
  completed_at  timestamptz,
  created_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenges_workspace_status_idx ON challenges (workspace_id, status);
CREATE TRIGGER challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE quizzes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('couple_quiz', 'who_of_us')),
  title         text NOT NULL,
  description   text,
  created_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quizzes_workspace_kind_idx ON quizzes (workspace_id, kind);
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE quiz_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       uuid NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  prompt        text NOT NULL,
  -- Choix proposés (quiz de couple) ; vide pour « Qui de nous deux ? ».
  options       text[] NOT NULL DEFAULT '{}',
  position      integer NOT NULL DEFAULT 0,
  created_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_questions_quiz_idx ON quiz_questions (quiz_id, position);

CREATE TABLE quiz_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Quiz : le choix retenu. « Qui de nous deux ? » : l'id du membre désigné.
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);
CREATE INDEX quiz_answers_user_idx ON quiz_answers (user_id);
CREATE TRIGGER quiz_answers_updated_at BEFORE UPDATE ON quiz_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Catalogue global des badges.
CREATE TABLE badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL,
  metric      text NOT NULL,
  threshold   integer NOT NULL CHECK (threshold > 0),
  position    integer NOT NULL DEFAULT 0
);

-- Badge obtenu par un espace (le couple).
CREATE TABLE user_badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id     uuid NOT NULL REFERENCES badges (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  user_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  awarded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, badge_id)
);

INSERT INTO badges (slug, name, description, icon, metric, threshold, position) VALUES
  ('first-trip',     'Premier voyage',    'Votre premier voyage ensemble.',            'plane',      'trips',             1,   0),
  ('ten-places',     'Explorateurs',      '10 lieux visités ensemble.',                'map-pin',    'places_visited',    10,  1),
  ('ten-restaurants','10 restaurants',    '10 restaurants testés ensemble.',           'utensils',   'restaurants',       10,  2),
  ('ten-movies',     'Cinéphiles',        '10 films regardés ensemble.',               'clapperboard','movies_watched',   10,  3),
  ('25-movies',      '25 films',          '25 films regardés ensemble.',               'film',       'movies_watched',    25,  4),
  ('ten-activities', '10 activités',      '10 activités réalisées ensemble.',          'sparkles',   'activities_done',   10,  5),
  ('five-recipes',   '5 recettes',        '5 recettes cuisinées ensemble.',            'chef-hat',   'recipes_done',      5,   6),
  ('first-photos',   'Premiers souvenirs','10 photos partagées.',                      'image',      'photos',            10,  7),
  ('100-photos',     '100 photos',        '100 photos partagées.',                     'images',     'photos',            100, 8),
  ('five-challenges','Défis relevés',     '5 défis terminés ensemble.',                'flag',       'challenges_done',   5,   9),
  ('fifty-tasks',    'Bien organisés',    '50 tâches terminées.',                      'check',      'tasks_done',        50,  10);

-- Fichiers à supprimer du stockage (traités par le worker, avec réessais).
CREATE TABLE pending_file_deletions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pending_file_deletions_created_idx ON pending_file_deletions (created_at);
