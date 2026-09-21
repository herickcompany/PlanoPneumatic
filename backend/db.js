const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

const database = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/plano_pneumatic",
  max: Number(process.env.DATABASE_POOL_SIZE || 10)
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'operator',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(40) NOT NULL UNIQUE,
    client VARCHAR(180) NOT NULL,
    type VARCHAR(40) NOT NULL CHECK (type IN ('Pedido de venda', 'Base de troca', 'Garantia')),
    status VARCHAR(60) NOT NULL,
    responsible VARCHAR(120) NOT NULL,
    client_document VARCHAR(40),
    product VARCHAR(180),
    product_code VARCHAR(80),
    quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
    document_reference VARCHAR(120),
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS case_events (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event_type VARCHAR(60) NOT NULL,
    description TEXT NOT NULL,
    responsible VARCHAR(120) NOT NULL,
    actor_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS user_audit_log (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id),
    target_user_id INTEGER REFERENCES users(id),
    action VARCHAR(60) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
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
  CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS cases_created_by_idx ON cases(created_by);
  CREATE INDEX IF NOT EXISTS cases_assigned_to_idx ON cases(assigned_to);
  CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
  CREATE INDEX IF NOT EXISTS case_events_case_id_idx ON case_events(case_id);
  CREATE INDEX IF NOT EXISTS user_audit_log_target_idx ON user_audit_log(target_user_id);
  CREATE INDEX IF NOT EXISTS case_comments_case_id_idx ON case_comments(case_id);
  CREATE INDEX IF NOT EXISTS case_attachments_case_id_idx ON case_attachments(case_id);
  CREATE INDEX IF NOT EXISTS case_checklist_case_id_idx ON case_checklist_items(case_id);
  CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, read_at);
`;

async function runMigrations() {
  await database.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(120) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const migrationsDirectory = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDirectory)) return;
  const migrations = fs.readdirSync(migrationsDirectory).filter((file) => file.endsWith(".sql")).sort();
  for (const migration of migrations) {
    const { rows } = await database.query("SELECT 1 FROM schema_migrations WHERE version = $1", [migration]);
    if (rows.length) continue;
    await database.query(fs.readFileSync(path.join(migrationsDirectory, migration), "utf8"));
    await database.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration]);
  }
}

async function waitForDatabase(retries = 30) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try { await database.query("SELECT 1"); return; }
    catch (error) { if (attempt === retries) throw error; await new Promise((resolve) => setTimeout(resolve, 1000)); }
  }
}

async function initializeDatabase() {
  await waitForDatabase();
  await database.query("BEGIN");
  try {
    await database.query(schema);
    await runMigrations();
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const adminName = process.env.SEED_ADMIN_NAME || "Administrador";
    if (!adminEmail || !adminPassword) throw new Error("SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD sao obrigatorios.");
    await database.query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin') ON CONFLICT (email) DO NOTHING`, [adminName, adminEmail, bcrypt.hashSync(adminPassword, 12)]);
    const operatorEmail = process.env.SEED_OPERATOR_EMAIL;
    const operatorPassword = process.env.SEED_OPERATOR_PASSWORD;
    const operatorName = process.env.SEED_OPERATOR_NAME || "Operador de Triagem";
    if (!operatorEmail || !operatorPassword) throw new Error("SEED_OPERATOR_EMAIL e SEED_OPERATOR_PASSWORD sao obrigatorios.");
    await database.query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'operator') ON CONFLICT (email) DO NOTHING`, [operatorName, operatorEmail, bcrypt.hashSync(operatorPassword, 12)]);
    const { rows: users } = await database.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
    const adminId = users[0].id;
    const { rows: countRows } = await database.query("SELECT COUNT(*)::int AS count FROM cases");
    if (countRows[0].count === 0) {
      const seedCases = [["GAR-2026-0045", "Auto Viacao ABC Ltda.", "Garantia", "Em analise", "Renato"], ["TRO-2026-0018", "Transportes Horizonte", "Base de troca", "Aguardando documento", "Leonardo"], ["PV-2026-0187", "Oficina Central", "Pedido de venda", "Aprovado", "Mariana"]];
      for (const [number, client, type, status, responsible] of seedCases) await database.query(`INSERT INTO cases (case_number, client, type, status, responsible, created_by, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $6)`, [number, client, type, status, responsible, adminId]);
    }
    await database.query(`
      INSERT INTO case_events (case_id, event_type, description, responsible, actor_id)
      SELECT cases.id, 'ABERTURA', 'Caso importado para o ambiente operacional', cases.responsible, cases.created_by
      FROM cases
      WHERE NOT EXISTS (SELECT 1 FROM case_events WHERE case_events.case_id = cases.id)
    `);
    await database.query("COMMIT");
  } catch (error) { await database.query("ROLLBACK"); throw error; }
}

module.exports = { database, initializeDatabase };

if (require.main === module) initializeDatabase().then(() => database.end()).catch(async (error) => { console.error(error); await database.end(); process.exitCode = 1; });
