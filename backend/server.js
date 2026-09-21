const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const bcrypt = require("bcryptjs");
const { database, initializeDatabase } = require("./db");

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
const frontendDirectory = path.join(__dirname, "..", "frontend");
const sessionDurationInDays = 7;
app.use(express.json());
app.use(express.static(frontendDirectory));

app.get(["/health", "/api/health"], async (request, response) => {
	try {
		await database.query("SELECT 1");
		return response.json({ status: "ok", database: "ok" });
	} catch (error) {
		return response.status(503).json({ status: "degraded", database: "unavailable" });
	}
});

function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
async function createSession(userId) { const token = crypto.randomBytes(32).toString("hex"); const expiresAt = new Date(Date.now() + sessionDurationInDays * 86400000); await database.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [userId, hashToken(token), expiresAt]); return { token, expiresAt: expiresAt.toISOString() }; }
async function getSessionUser(request) { const authorization = request.get("authorization") || ""; const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null; if (!token) return null; const { rows } = await database.query("SELECT users.id, users.name, users.email, users.role, sessions.token_hash, sessions.expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = $1 AND users.active = TRUE", [hashToken(token)]); const session = rows[0]; if (!session || new Date(session.expires_at) <= new Date()) { if (session) await database.query("DELETE FROM sessions WHERE token_hash = $1", [session.token_hash]); return null; } return { id: session.id, name: session.name, email: session.email, role: session.role }; }
async function requireAuth(request, response, next) { try { const user = await getSessionUser(request); if (!user) return response.status(401).json({ message: "Sessao invalida ou expirada." }); request.user = user; return next(); } catch (error) { return next(error); } }
function canViewCase(user, item) { return user.role === "admin" || user.role === "supervisor" || item.created_by === user.id || item.assigned_to === user.id; }
function formatCase(item) { return { id: item.case_number, client: item.client, type: item.type, status: item.status, responsible: item.responsible, clientDocument: item.client_document || "", product: item.product || "Nao informado", productCode: item.product_code || "Nao informado", quantity: item.quantity || 0, documentReference: item.document_reference || "", notes: item.notes || "", updatedAt: new Date(item.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) }; }

app.post("/api/auth/login", async (request, response, next) => { try { const email = String(request.body.email || "").trim().toLowerCase(); const password = String(request.body.password || ""); if (!email || !password) return response.status(400).json({ message: "Informe usuario e senha." }); const { rows } = await database.query("SELECT id, name, email, password_hash, role FROM users WHERE email = $1 AND active = TRUE", [email]); const user = rows[0]; if (!user || !bcrypt.compareSync(password, user.password_hash)) return response.status(401).json({ message: "Usuario ou senha invalidos." }); return response.json({ ...(await createSession(user.id)), user: { id: user.id, name: user.name, email: user.email, role: user.role } }); } catch (error) { return next(error); } });
app.post("/api/auth/logout", requireAuth, async (request, response, next) => { try { await database.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(request.get("authorization").slice(7))]); return response.status(204).send(); } catch (error) { return next(error); } });
app.get("/api/auth/me", requireAuth, (request, response) => response.json({ user: request.user }));

app.get("/api/dashboard/summary", requireAuth, async (request, response, next) => { try { const scope = request.user.role === "admin" || request.user.role === "supervisor" ? "TRUE" : "(created_by = $1 OR assigned_to = $1)"; const values = scope === "TRUE" ? [] : [request.user.id]; const { rows: cases } = await database.query(`SELECT case_number, client, type, status, responsible, product, product_code, quantity, notes, updated_at FROM cases WHERE ${scope} ORDER BY updated_at DESC LIMIT 10`, values); const { rows: indicators } = await database.query(`SELECT COUNT(*)::int AS open_cases, COUNT(*) FILTER (WHERE status = 'Em analise')::int AS in_analysis, COUNT(*) FILTER (WHERE status ILIKE '%documento%' OR status ILIKE '%pendente%')::int AS critical_pending, COUNT(*) FILTER (WHERE status IN ('Aprovado', 'Concluido', 'Encerrado'))::int AS completed FROM cases WHERE ${scope}`, values); const item = indicators[0]; return response.json({ indicators: [{ label: "Casos abertos", value: item.open_cases, tone: "blue" }, { label: "Em analise", value: item.in_analysis, tone: "orange" }, { label: "Pendencias criticas", value: item.critical_pending, tone: "red" }, { label: "Concluidos no mes", value: item.completed, tone: "green" }], recentCases: cases.map(formatCase) }); } catch (error) { return next(error); } });

app.post("/api/cases", requireAuth, async (request, response, next) => { try { const client = String(request.body.client || "").trim(); const type = String(request.body.type || "").trim(); const product = String(request.body.product || "").trim(); const productCode = String(request.body.productCode || "").trim(); const quantity = Number(request.body.quantity); if (!client || !product || !productCode || !Number.isInteger(quantity) || quantity < 1 || !["Pedido de venda", "Base de troca", "Garantia"].includes(type)) return response.status(400).json({ message: "Informe cliente, produto, codigo e uma quantidade valida." }); const prefix = type === "Pedido de venda" ? "PV" : type === "Base de troca" ? "TRO" : "GAR"; const { rows: sequenceRows } = await database.query("SELECT COUNT(*)::int AS count FROM cases WHERE type = $1", [type]); const caseNumber = `${prefix}-${new Date().getFullYear()}-${String(sequenceRows[0].count + 1).padStart(4, "0")}`; const { rows: inserted } = await database.query("INSERT INTO cases (case_number, client, type, status, responsible, client_document, product, product_code, quantity, document_reference, notes, created_by, assigned_to) VALUES ($1,$2,$3,'Criado',$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *", [caseNumber, client, type, request.user.name, request.body.clientDocument || null, product, productCode, quantity, request.body.documentReference || null, request.body.notes || null, request.user.id]); await database.query("INSERT INTO case_events (case_id, event_type, description, responsible, actor_id) VALUES ($1, 'ABERTURA', 'Caso criado na triagem', $2, $3)", [inserted[0].id, request.user.name, request.user.id]); return response.status(201).json({ case: formatCase(inserted[0]) }); } catch (error) { return next(error); } });

app.get("/api/cases/:caseNumber", requireAuth, async (request, response, next) => { try { const { rows } = await database.query("SELECT * FROM cases WHERE case_number = $1", [request.params.caseNumber]); const item = rows[0]; if (!item || !canViewCase(request.user, item)) return response.status(404).json({ message: "Processo nao encontrado." }); const { rows: events } = await database.query("SELECT event_type AS type, description, responsible, created_at AS \"createdAt\" FROM case_events WHERE case_id = $1 ORDER BY created_at DESC", [item.id]); return response.json({ case: { ...formatCase(item), clientDocument: item.client_document || "", documentReference: item.document_reference || "", events } }); } catch (error) { return next(error); } });

app.patch("/api/cases/:caseNumber", requireAuth, async (request, response, next) => {
	try {
		const client = String(request.body.client || "").trim();
		const clientDocument = String(request.body.clientDocument || "").trim();
		const product = String(request.body.product || "").trim();
		const productCode = String(request.body.productCode || "").trim();
		const quantity = Number(request.body.quantity);
		const documentReference = String(request.body.documentReference || "").trim();
		const notes = String(request.body.notes || "").trim();
		if (!client || !product || !productCode || !Number.isInteger(quantity) || quantity < 1) return response.status(400).json({ message: "Informe cliente, produto, codigo e uma quantidade valida." });
		const { rows: currentRows } = await database.query("SELECT * FROM cases WHERE case_number = $1", [request.params.caseNumber]);
		const current = currentRows[0];
		if (!current || !canViewCase(request.user, current)) return response.status(404).json({ message: "Processo nao encontrado." });
		const { rows: updatedRows } = await database.query("UPDATE cases SET client = $1, client_document = $2, product = $3, product_code = $4, quantity = $5, document_reference = $6, notes = $7, updated_at = NOW() WHERE id = $8 RETURNING *", [client, clientDocument || null, product, productCode, quantity, documentReference || null, notes || null, current.id]);
		await database.query("INSERT INTO case_events (case_id, event_type, description, responsible, actor_id) VALUES ($1, 'EDICAO', 'Dados do processo atualizados', $2, $3)", [current.id, request.user.name, request.user.id]);
		return response.json({ case: formatCase(updatedRows[0]) });
	} catch (error) { return next(error); }
});

app.get("/api/cases", requireAuth, async (request, response, next) => {
	try {
		const filters = [];
		const values = [];
		const addFilter = (condition, value) => { values.push(value); filters.push(condition.replace("$VALUE", `$${values.length}`)); };
		const scope = request.user.role === "admin" || request.user.role === "supervisor" ? "TRUE" : `(created_by = $${values.length + 1} OR assigned_to = $${values.length + 1})`;
		if (scope !== "TRUE") values.push(request.user.id);
		if (request.query.process) addFilter("case_number ILIKE $VALUE", `%${String(request.query.process).trim()}%`);
		if (request.query.client) addFilter("client ILIKE $VALUE", `%${String(request.query.client).trim()}%`);
		if (request.query.type) addFilter("type = $VALUE", String(request.query.type));
		if (request.query.status) addFilter("status = $VALUE", String(request.query.status));
		if (request.query.updatedAt) addFilter("updated_at::date = $VALUE", String(request.query.updatedAt));
		const where = [scope, ...filters].filter(Boolean).join(" AND ");
		const { rows } = await database.query(`SELECT case_number, client, type, status, responsible, product, product_code, quantity, updated_at FROM cases WHERE ${where} ORDER BY updated_at DESC LIMIT 100`, values);
		return response.json({ cases: rows.map(formatCase) });
	} catch (error) { return next(error); }
});

app.patch("/api/cases/:caseNumber/status", requireAuth, async (request, response, next) => {
	try {
		const allowedStatuses = ["Criado", "Em analise", "Aguardando documento", "Aprovado", "Improcedente", "Em faturamento", "Processando", "Concluido", "Encerrado", "Cancelado"];
		const status = String(request.body.status || "").trim();
		if (!allowedStatuses.includes(status)) return response.status(400).json({ message: "Status invalido para o processo." });
		const { rows: currentRows } = await database.query("SELECT * FROM cases WHERE case_number = $1", [request.params.caseNumber]);
		const current = currentRows[0];
		if (!current || !canViewCase(request.user, current)) return response.status(404).json({ message: "Processo nao encontrado." });
		if (current.status === status) return response.status(400).json({ message: "O processo ja possui este status." });
		const { rows: updatedRows } = await database.query("UPDATE cases SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, current.id]);
		await database.query("INSERT INTO case_events (case_id, event_type, description, responsible, actor_id) VALUES ($1, 'STATUS', $2, $3, $4)", [current.id, "Status alterado de " + current.status + " para " + status, request.user.name, request.user.id]);
		return response.json({ case: formatCase(updatedRows[0]) });
	} catch (error) { return next(error); }
});

app.get("/api/pending", requireAuth, async (request, response, next) => { try { const scope = request.user.role === "admin" || request.user.role === "supervisor" ? "TRUE" : "(created_by = $1 OR assigned_to = $1)"; const values = scope === "TRUE" ? [] : [request.user.id]; const { rows } = await database.query(`SELECT case_number AS id, client, type, status, responsible, updated_at AS "updatedAt", CASE WHEN status ILIKE '%documento%' THEN 'Documentacao pendente' WHEN status ILIKE '%analise%' THEN 'Aguardando analise' ELSE 'Revisao necessaria' END AS description, CASE WHEN status ILIKE '%documento%' THEN 'Alto' ELSE 'Medio' END AS risk FROM cases WHERE ${scope} AND status NOT IN ('Aprovado', 'Concluido', 'Encerrado') ORDER BY CASE WHEN status ILIKE '%documento%' THEN 1 ELSE 2 END, updated_at ASC`, values); return response.json({ items: rows }); } catch (error) { return next(error); } });

app.get("/api/reports/summary", requireAuth, async (request, response, next) => { try { const scope = request.user.role === "admin" || request.user.role === "supervisor" ? "TRUE" : "(created_by = $1 OR assigned_to = $1)"; const values = scope === "TRUE" ? [] : [request.user.id]; const { rows: totals } = await database.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status ILIKE '%pendente%' OR status ILIKE '%documento%')::int AS pending, COUNT(*) FILTER (WHERE type = 'Garantia' AND status = 'Em analise')::int AS guarantees_in_analysis, COUNT(*) FILTER (WHERE status IN ('Aprovado', 'Concluido', 'Encerrado'))::int AS completed FROM cases WHERE ${scope}`, values); const { rows: byType } = await database.query(`SELECT type AS label, COUNT(*)::int AS value FROM cases WHERE ${scope} GROUP BY type ORDER BY value DESC`, values); const { rows: events } = await database.query(`SELECT c.case_number AS id, e.event_type AS type, e.description, e.responsible, e.created_at AS "createdAt" FROM case_events e JOIN cases c ON c.id = e.case_id WHERE ${scope.replace(/created_by|assigned_to/g, "c.$&")} ORDER BY e.created_at DESC LIMIT 20`, values); return response.json({ totals: totals[0], byType, events }); } catch (error) { return next(error); } });

app.get("/api/users", requireAuth, async (request, response, next) => { try { if (request.user.role !== "admin") return response.status(403).json({ message: "Acesso restrito ao administrador." }); const { rows } = await database.query("SELECT id, name, email, role, active, created_at AS \"createdAt\" FROM users ORDER BY name"); return response.json({ users: rows }); } catch (error) { return next(error); } });

app.post("/api/users", requireAuth, async (request, response, next) => {
	try {
		if (request.user.role !== "admin") return response.status(403).json({ message: "Acesso restrito ao administrador." });
		const name = String(request.body.name || "").trim();
		const email = String(request.body.email || "").trim().toLowerCase();
		const password = String(request.body.password || "");
		const role = String(request.body.role || "operator").trim();
		if (!name || !email || password.length < 8 || !["operator", "supervisor", "admin"].includes(role)) return response.status(400).json({ message: "Informe nome, e-mail, senha com pelo menos 8 caracteres e um perfil valido." });
		const { rows } = await database.query("INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, active, created_at AS \"createdAt\"", [name, email, bcrypt.hashSync(password, 12), role]);
		return response.status(201).json({ user: rows[0] });
	} catch (error) {
		if (error.code === "23505") return response.status(409).json({ message: "Ja existe uma conta com este e-mail." });
		return next(error);
	}
});

app.patch("/api/account", requireAuth, async (request, response, next) => { try { const name = String(request.body.name || "").trim(); const password = String(request.body.password || ""); if (!name) return response.status(400).json({ message: "Informe seu nome." }); if (password) await database.query("UPDATE users SET name = $1, password_hash = $2 WHERE id = $3", [name, bcrypt.hashSync(password, 12), request.user.id]); else await database.query("UPDATE users SET name = $1 WHERE id = $2", [name, request.user.id]); const { rows } = await database.query("SELECT id, name, email, role FROM users WHERE id = $1", [request.user.id]); return response.json({ user: rows[0] }); } catch (error) { return next(error); } });

app.use((error, request, response, next) => { console.error(error); return response.status(500).json({ message: "Erro interno do servidor." }); });
app.get("*", (request, response) => response.sendFile(path.join(frontendDirectory, "index.html")));
initializeDatabase().then(() => app.listen(port, host, () => console.log(`Plano Pneumatic API rodando em http://${host}:${port}`))).catch((error) => { console.error("Falha ao inicializar banco", error); process.exit(1); });