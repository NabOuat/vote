-- Module Système de vote — schéma initial.
-- Voir cahier-des-charges-systeme-vote.md et le plan d'implémentation pour le
-- raisonnement détaillé, en particulier sur l'anonymat (vote_receipts vs ballots).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN_VOTE','VOTER')),
  full_name TEXT NOT NULL,
  poste TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  rounds_count INTEGER NOT NULL CHECK (rounds_count IN (1,2)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Une période par tour ; le tour 2 (le cas échéant) a sa période définie dès la
-- création du vote, pour que le passage automatique n'exige aucune saisie admin.
-- results_published_at est ICI (par tour, pas par vote) : publier le tour 1 ne
-- doit jamais exposer un dépouillement du tour 2 s'il est encore en cours.
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id INTEGER NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  tour_number INTEGER NOT NULL CHECK (tour_number IN (1,2)),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING','ONGOING','CLOSED')),
  activated_at TEXT,
  closed_at TEXT,
  results_published_at TEXT,
  UNIQUE(vote_id, tour_number)
);
CREATE INDEX IF NOT EXISTS idx_tours_status_window ON tours(status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  poste TEXT,
  photo_path TEXT NOT NULL,
  program TEXT,
  -- Jeton unique permettant au candidat lui-même de renseigner son programme
  -- sans compte (lien envoyé par l'admin) — cf. db.js pour les bases déjà
  -- créées avant l'ajout de cette colonne.
  edit_token TEXT,
  -- Renseigné uniquement pour les candidats copiés automatiquement au tour 2.
  qualified_from_candidate_id INTEGER REFERENCES candidates(id)
);

-- Preuve de participation : QUI a voté, pour QUEL tour. Aucune colonne de choix.
-- C'est cette contrainte UNIQUE qui applique la règle "un vote par personne par tour".
CREATE TABLE IF NOT EXISTS vote_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  voter_id INTEGER NOT NULL REFERENCES users(id),
  voted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tour_id, voter_id)
);

-- Zone d'attente durable pour les bulletins fraîchement déposés : reçoit le choix
-- immédiatement (résiste à un crash serveur) mais N'EST JAMAIS lue pour le
-- dépouillement. Un job périodique mélange (Fisher-Yates) puis migre ces lignes
-- vers `ballots`, cassant toute corrélation d'ordre/timestamp avec vote_receipts.
CREATE TABLE IF NOT EXISTS ballots_staging (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id)
);

-- Bulletins définitifs, utilisés pour le dépouillement. Ne contient jamais de
-- voter_id ni de timestamp précis — volontairement.
CREATE TABLE IF NOT EXISTS ballots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id)
);
CREATE INDEX IF NOT EXISTS idx_ballots_tour_candidate ON ballots(tour_id, candidate_id);
