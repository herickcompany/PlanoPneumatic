ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS users_manager_id_idx ON users(manager_id);

CREATE TABLE IF NOT EXISTS user_activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(40) NOT NULL,
  path VARCHAR(200),
  label VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_activity_log_user_idx ON user_activity_log(user_id, created_at);
