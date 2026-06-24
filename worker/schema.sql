CREATE TABLE IF NOT EXISTS users (
  id   TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name  TEXT
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token      TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  local_id    INTEGER NOT NULL,
  user_id     TEXT    NOT NULL,
  day_id      INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  started_at  INTEGER NOT NULL,
  completed_at INTEGER,
  PRIMARY KEY (local_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS set_logs (
  local_id    INTEGER NOT NULL,
  user_id     TEXT    NOT NULL,
  session_id  INTEGER NOT NULL,
  exercise_id TEXT    NOT NULL,
  set_number  INTEGER NOT NULL,
  weight      REAL    NOT NULL,
  reps        INTEGER NOT NULL,
  PRIMARY KEY (local_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  local_id    INTEGER NOT NULL,
  user_id     TEXT    NOT NULL,
  session_id  INTEGER NOT NULL,
  exercise_id TEXT    NOT NULL,
  difficulty  TEXT,
  PRIMARY KEY (local_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Combines exerciseMuscles + exerciseDetails into one server-side table
CREATE TABLE IF NOT EXISTS exercise_metadata (
  exercise_id       TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  primary_muscle    TEXT,
  secondary_muscle1 TEXT,
  secondary_muscle2 TEXT,
  secondary_muscle3 TEXT,
  workout_type      TEXT,
  equipment         TEXT,
  weight_type       TEXT,
  PRIMARY KEY (exercise_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_programs (
  user_id        TEXT PRIMARY KEY,
  program_json   TEXT NOT NULL,
  exercises_json TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
