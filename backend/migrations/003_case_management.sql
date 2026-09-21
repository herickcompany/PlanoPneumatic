CREATE TABLE IF NOT EXISTS case_comments (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS case_attachments (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  file_name VARCHAR(180) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS case_checklist_items (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label VARCHAR(180) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by INTEGER REFERENCES users(id),
  completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS case_sla_config (
  type VARCHAR(40) PRIMARY KEY,
  days INTEGER NOT NULL CHECK (days > 0),
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  kind VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_comments_case_id_idx ON case_comments(case_id);
CREATE INDEX IF NOT EXISTS case_attachments_case_id_idx ON case_attachments(case_id);
CREATE INDEX IF NOT EXISTS case_checklist_case_id_idx ON case_checklist_items(case_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, read_at);