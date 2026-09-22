const crypto = require("node:crypto");
const path = require("node:path");
const https = require("node:https");
const express = require("express");
const fs = require("node:fs");
const bcrypt = require("bcryptjs");
const { database, initializeDatabase } = require("./db");

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
const frontendDirectory = path.join(__dirname, "..", "frontend");
const sessionDurationInDays = Number(process.env.SESSION_DURATION_DAYS || 1);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://planopneumatic-production.up.railway.app";
const roles = Object.freeze({ ADMIN: "admin", MANAGER: "manager", SUPERVISOR: "supervisor", OPERATOR: "operator" });
const broadVisibilityRoles = [roles.ADMIN, roles.MANAGER, roles.SUPERVISOR];
const capabilities = Object.freeze({
	VIEW_USERS: "users.view",
	CREATE_OPERATOR: "users.create.operator",
	CREATE_MANAGER: "users.create.manager",
	MANAGE_USER_STATUS: "users.status.manage",
	VIEW_AUDIT: "users.audit.view",
	ASSIGN_CASES: "cases.assign"
	,MANAGE_INTEGRATIONS: "integrations.manage"
	,TRANSFER_TEAM: "users.team.transfer"
	,VIEW_TEAM_REPORTS: "reports.team.view"
	,VIEW_MANAGER_PERFORMANCE: "reports.managers.view"
});
const permissionMatrix = Object.freeze({
	[roles.ADMIN]: Object.values(capabilities),
	[roles.MANAGER]: [capabilities.VIEW_USERS, capabilities.CREATE_OPERATOR, capabilities.MANAGE_USER_STATUS, capabilities.VIEW_AUDIT, capabilities.ASSIGN_CASES, capabilities.VIEW_TEAM_REPORTS],
	[roles.SUPERVISOR]: [],
	[roles.OPERATOR]: []
});

function logEvent(event, details = {}) {
	console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

async function dispatchWebhook(event, payload) {
	const { rows } = await database.query("SELECT endpoint_url, secret FROM webhooks WHERE active = TRUE AND events @> $1::jsonb", [JSON.stringify([event])]);
	for (const webhook of rows) {
		const body = JSON.stringify({ event, payload, sentAt: new Date().toISOString() });
		const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
		try {
			await new Promise((resolve, reject) => {
				const target = new URL(webhook.endpoint_url);
				const request = https.request({ hostname: target.hostname, port: target.port || 443, path: `${target.pathname}${target.search}`, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "X-Webhook-Signature": signature } }, (response) => { response.resume(); response.on("end", resolve); });
				request.on("error", reject); request.setTimeout(5000, () => request.destroy(new Error("Webhook timeout"))); request.end(body);
			});
		} catch (error) { logEvent("webhook_error", { endpoint: webhook.endpoint_url, error: error.message }); }
	}
}

function hasRole(user, allowedRoles) { return allowedRoles.includes(user.role); }
function can(user, capability) { return permissionMatrix[user.role]?.includes(capability) || false; }
function requireCapability(capability) {
	return (request, response, next) => can(request.user, capability) ? next() : response.status(403).json({ message: "Seu perfil nao possui esta permissao." });
}

async function auditUserChange(actorId, targetUserId, action, details = {}) {
	await database.query("INSERT INTO user_audit_log (actor_id, target_user_id, action, details) VALUES ($1, $2, $3, $4)", [actorId, targetUserId, action, JSON.stringify(details)]);
}

async function notifyUser(userId, caseId, kind, message) {
	if (!userId) return;
	await database.query("INSERT INTO notifications (user_id, case_id, kind, message) VALUES ($1, $2, $3, $4)", [userId, caseId, kind, message]);
}

function assertProductionSecrets() {
	if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || !process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_OPERATOR_PASSWORD)) {
		throw new Error("DATABASE_URL, SEED_ADMIN_PASSWORD e SEED_OPERATOR_PASSWORD sao obrigatorios em producao.");
	}
}

assertProductionSecrets();
app.use((request, response, next) => {
	const origin = request.get("origin");
	if (origin === frontendOrigin) response.setHeader("Access-Control-Allow-Origin", origin);
	response.setHeader("Vary", "Origin");
	response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
	response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
	if (request.method === "OPTIONS") return response.sendStatus(204);
	return next();
});
app.use(express.json());
app.use(express.static(frontendDirectory));
app.use(express.static(path.join(frontendDirectory, "html")));
app.get("/api/openapi.yaml", (request, response) => response.type("text/yaml").send(fs.readFileSync(path.join(__dirname, "..", "docs", "openapi.yaml"), "utf8")));

app.get(["/health", "/api/health"], async (request, response) => {
	try {
		await database.query("SELECT 1");
		return response.json({ status: "ok", database: "ok" });
	} catch (error) {
		return response.status(503).json({ status: "degraded", database: "unavailable" });
	}
});

app.get("/health/db", async (request, response) => {
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
function canViewCase(user, item) { return hasRole(user, broadVisibilityRoles) || item.created_by === user.id || item.assigned_to === user.id; }
function formatCase(item) { return { id: item.case_number, client: item.client, type: item.type, status: item.status, responsible: item.responsible, clientDocument: item.client_document || "", product: item.product || "Nao informado", productCode: item.product_code || "Nao informado", quantity: item.quantity || 0, documentReference: item.document_reference || "", notes: item.notes || "", updatedAt: new Date(item.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) }; }

app.post("/api/auth/login", async (request, response, next) => { try { const email = String(request.body.email || "").trim().toLowerCase(); const password = String(request.body.password || ""); if (!email || !password) return response.status(400).json({ message: "Informe usuario e senha." }); const { rows } = await database.query("SELECT id, name, email, password_hash, role FROM users WHERE email = $1 AND active = TRUE", [email]); const user = rows[0]; if (!user || !bcrypt.compareSync(password, user.password_hash)) return response.status(401).json({ message: "Usuario ou senha invalidos." }); return response.json({ ...(await createSession(user.id)), user: { id: user.id, name: user.name, email: user.email, role: user.role } }); } catch (error) { return next(error); } });
app.post("/api/auth/forgot-password", async (request, response, next) => {
	try {
		const email = String(request.body.email || "").trim().toLowerCase();
		if (email) {
			const { rows } = await database.query("SELECT id FROM users WHERE email = $1 AND active = TRUE", [email]);
			if (rows[0]) {
				const token = crypto.randomBytes(32).toString("hex");
				await database.query("DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= NOW()", [rows[0].id]);
				await database.query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')", [rows[0].id, hashToken(token)]);
				if (process.env.NODE_ENV !== "production") response.setHeader("X-Password-Reset-Token", token);
			}
		}
		return response.json({ message: "Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir a senha." });
	} catch (error) { return next(error); }
});
app.post("/api/auth/reset-password", async (request, response, next) => {
	try {
		const token = String(request.body.token || "");
		const password = String(request.body.password || "");
		if (!token || password.length < 8) return response.status(400).json({ message: "Informe um token valido e uma senha com pelo menos 8 caracteres." });
		const { rows } = await database.query("SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()", [hashToken(token)]);
		if (!rows[0]) return response.status(400).json({ message: "Token invalido ou expirado." });
		await database.query("UPDATE users SET password_hash = $1 WHERE id = $2", [bcrypt.hashSync(password, 12), rows[0].user_id]);
		await database.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1", [hashToken(token)]);
		await database.query("DELETE FROM sessions WHERE user_id = $1", [rows[0].user_id]);
		return response.json({ message: "Senha redefinida com sucesso." });
	} catch (error) { return next(error); }
});
app.post("/api/auth/logout", requireAuth, async (request, response, next) => { try { await database.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(request.get("authorization").slice(7))]); return response.status(204).send(); } catch (error) { return next(error); } });
app.get("/api/auth/me", requireAuth, (request, response) => response.json({ user: request.user }));

app.get("/api/dashboard/summary", requireAuth, async (request, response, next) => {
	try {
		const filters = [];
		const values = [];
		const addFilter = (condition, value) => { values.push(value); filters.push(condition.replace("$VALUE", `$${values.length}`)); };
		const scope = hasRole(request.user, broadVisibilityRoles) ? "TRUE" : `(created_by = $${values.length + 1} OR assigned_to = $${values.length + 1})`;
		if (scope !== "TRUE") values.push(request.user.id);
		if (request.query.from) addFilter("updated_at::date >= $VALUE", String(request.query.from));
		if (request.query.to) addFilter("updated_at::date <= $VALUE", String(request.query.to));
		if (request.query.type) addFilter("type = $VALUE", String(request.query.type));
		if (request.query.status) addFilter("status = $VALUE", String(request.query.status));
		if (request.query.client) addFilter("client ILIKE $VALUE", `%${String(request.query.client).trim()}%`);
		if (request.query.product) addFilter("product ILIKE $VALUE", `%${String(request.query.product).trim()}%`);
		if (request.query.productCode) addFilter("product_code ILIKE $VALUE", `%${String(request.query.productCode).trim()}%`);
		if (request.query.document) addFilter("(document_reference ILIKE $VALUE OR client_document ILIKE $VALUE)", `%${String(request.query.document).trim()}%`);
		if (request.query.responsible) addFilter("responsible ILIKE $VALUE", `%${String(request.query.responsible).trim()}%`);
		const where = [scope, ...filters].join(" AND ");
		const { rows: indicators } = await database.query(`SELECT COUNT(*) FILTER (WHERE status NOT IN ('Concluido', 'Encerrado', 'Cancelado'))::int AS open_cases, COUNT(*) FILTER (WHERE status IN ('Concluido', 'Encerrado'))::int AS completed, COUNT(*) FILTER (WHERE status ILIKE '%documento%' OR status ILIKE '%pendente%')::int AS critical_pending, COUNT(*) FILTER (WHERE status NOT IN ('Concluido', 'Encerrado', 'Cancelado') AND updated_at < NOW() - INTERVAL '3 days')::int AS overdue, COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status IN ('Concluido', 'Encerrado')), 0)::numeric(10,1) AS average_days FROM cases WHERE ${where}`, values);
		const { rows: recentCases } = await database.query(`SELECT case_number, client, type, status, responsible, product, product_code, quantity, notes, updated_at FROM cases WHERE ${where} ORDER BY updated_at DESC LIMIT 10`, values);
		const { rows: byType } = await database.query(`SELECT type AS label, COUNT(*)::int AS value FROM cases WHERE ${where} GROUP BY type ORDER BY value DESC`, values);
		const { rows: byStatus } = await database.query(`SELECT status AS label, COUNT(*)::int AS value FROM cases WHERE ${where} GROUP BY status ORDER BY value DESC`, values);
		const { rows: evolution } = await database.query(`SELECT updated_at::date AS date, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('Concluido', 'Encerrado'))::int AS completed FROM cases WHERE ${where} GROUP BY updated_at::date ORDER BY date`, values);
		const { rows: myPending } = await database.query("SELECT case_number AS id, client, type, status, responsible, updated_at AS \"updatedAt\", CASE WHEN status ILIKE '%documento%' OR status ILIKE '%pendente%' THEN 'Alto' ELSE 'Medio' END AS risk FROM cases WHERE assigned_to = $1 AND status NOT IN ('Concluido', 'Encerrado', 'Cancelado') ORDER BY updated_at ASC LIMIT 8", [request.user.id]);
		const { rows: alerts } = await database.query(`SELECT case_number AS id, client, type, status, responsible, updated_at AS \"updatedAt\" FROM cases WHERE ${where} AND status NOT IN ('Concluido', 'Encerrado', 'Cancelado') AND updated_at < NOW() - INTERVAL '2 days' ORDER BY updated_at ASC LIMIT 8`, values);
		const { rows: comparison } = await database.query(`SELECT COUNT(*) FILTER (WHERE status NOT IN ('Concluido', 'Encerrado', 'Cancelado'))::int AS open_cases, COUNT(*) FILTER (WHERE status IN ('Concluido', 'Encerrado'))::int AS completed FROM cases WHERE ${scope} AND updated_at >= COALESCE($${values.length + 1}::date, CURRENT_DATE - INTERVAL '14 days') - INTERVAL '14 days' AND updated_at < COALESCE($${values.length + 2}::date, CURRENT_DATE + INTERVAL '1 day') - INTERVAL '14 days'`, [...values, request.query.from || null, request.query.to || null]);
		return response.json({ filters: request.query, indicators: [{ label: "Processos abertos", value: indicators[0].open_cases, tone: "blue" }, { label: "Processos concluidos", value: indicators[0].completed, tone: "green" }, { label: "Tempo medio (dias)", value: Number(indicators[0].average_days), tone: "orange" }, { label: "Pendencias criticas", value: indicators[0].critical_pending, tone: "red" }, { label: "Processos atrasados", value: indicators[0].overdue, tone: "red" }], comparison: { openCases: comparison[0].open_cases, completed: comparison[0].completed }, recentCases: recentCases.map(formatCase), byType, byStatus, evolution, myPending, alerts });
	} catch (error) { return next(error); }
});

app.post("/api/cases", requireAuth, async (request, response, next) => { try { const client = String(request.body.client || "").trim(); const type = String(request.body.type || "").trim(); const product = String(request.body.product || "").trim(); const productCode = String(request.body.productCode || "").trim(); const quantity = Number(request.body.quantity); if (!client || !product || !productCode || !Number.isInteger(quantity) || quantity < 1 || !["Pedido de venda", "Base de troca", "Garantia"].includes(type)) return response.status(400).json({ message: "Informe cliente, produto, codigo e uma quantidade valida." }); const prefix = type === "Pedido de venda" ? "PV" : type === "Base de troca" ? "TRO" : "GAR"; const { rows: sequenceRows } = await database.query("SELECT COUNT(*)::int AS count FROM cases WHERE type = $1", [type]); const caseNumber = `${prefix}-${new Date().getFullYear()}-${String(sequenceRows[0].count + 1).padStart(4, "0")}`; const { rows: inserted } = await database.query("INSERT INTO cases (case_number, client, type, status, responsible, client_document, product, product_code, quantity, document_reference, notes, created_by, assigned_to) VALUES ($1,$2,$3,'Criado',$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *", [caseNumber, client, type, request.user.name, request.body.clientDocument || null, product, productCode, quantity, request.body.documentReference || null, request.body.notes || null, request.user.id]); await database.query("INSERT INTO case_events (case_id, event_type, description, responsible, actor_id) VALUES ($1, 'ABERTURA', 'Caso criado na triagem', $2, $3)", [inserted[0].id, request.user.name, request.user.id]); const checklist = { "Pedido de venda": ["Validar dados comerciais", "Confirmar disponibilidade do produto", "Encaminhar para faturamento"], "Base de troca": ["Conferir documento de origem", "Avaliar condicao do produto", "Registrar aprovacao da troca"], Garantia: ["Conferir documento de compra", "Registrar analise tecnica", "Definir parecer da garantia"] }; for (const label of checklist[type]) await database.query("INSERT INTO case_checklist_items (case_id, label) VALUES ($1, $2)", [inserted[0].id, label]); void dispatchWebhook("case.created", { id: inserted[0].case_number, type, client }).catch(() => {}); return response.status(201).json({ case: formatCase(inserted[0]) }); } catch (error) { return next(error); } });

app.post("/api/cases/import", requireAuth, async (request, response, next) => {
	try {
		const items = Array.isArray(request.body.items) ? request.body.items : [];
		if (!items.length || items.length > 500) return response.status(400).json({ message: "Envie entre 1 e 500 pedidos." });
		const results = [];
		for (let index = 0; index < items.length; index += 1) {
			const item = items[index];
			const valid = item && String(item.client || "").trim() && ["Pedido de venda", "Base de troca", "Garantia"].includes(item.type) && String(item.product || "").trim() && String(item.productCode || "").trim() && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0;
			if (!valid) { results.push({ line: index + 1, status: "error", message: "Cliente, tipo, produto, codigo e quantidade sao obrigatorios." }); continue; }
			const prefix = item.type === "Pedido de venda" ? "PV" : item.type === "Base de troca" ? "TRO" : "GAR";
			const { rows: sequenceRows } = await database.query("SELECT COUNT(*)::int AS count FROM cases WHERE type = $1", [item.type]);
			const caseNumber = `${prefix}-${new Date().getFullYear()}-${String(sequenceRows[0].count + 1).padStart(4, "0")}`;
			const { rows } = await database.query("INSERT INTO cases (case_number, client, type, status, responsible, product, product_code, quantity, document_reference, notes, created_by, assigned_to) VALUES ($1,$2,$3,'Criado',$4,$5,$6,$7,$8,$9,$10,$10) RETURNING case_number", [caseNumber, String(item.client).trim(), item.type, request.user.name, String(item.product).trim(), String(item.productCode).trim(), Number(item.quantity), item.documentReference || null, item.notes || null, request.user.id]);
			results.push({ line: index + 1, status: "created", id: rows[0].case_number });
		}
		return response.status(201).json({ total: items.length, created: results.filter((item) => item.status === "created").length, errors: results.filter((item) => item.status === "error").length, results });
	} catch (error) { return next(error); }
});

app.get("/api/cases/:caseNumber", requireAuth, async (request, response, next) => { try { const { rows } = await database.query("SELECT * FROM cases WHERE case_number = $1", [request.params.caseNumber]); const item = rows[0]; if (!item || !canViewCase(request.user, item)) return response.status(404).json({ message: "Processo nao encontrado." }); const { rows: events } = await database.query("SELECT event_type AS type, description, responsible, created_at AS \"createdAt\" FROM case_events WHERE case_id = $1 ORDER BY created_at DESC", [item.id]); return response.json({ case: { ...formatCase(item), clientDocument: item.client_document || "", documentReference: item.document_reference || "", events } }); } catch (error) { return next(error); } });

async function getCaseForUser(caseNumber, user) {
	const { rows } = await database.query("SELECT * FROM cases WHERE case_number = $1", [caseNumber]);
	return rows[0] && canViewCase(user, rows[0]) ? rows[0] : null;
}

app.get("/api/cases/:caseNumber/timeline", requireAuth, async (request, response, next) => {
	try {
		const item = await getCaseForUser(request.params.caseNumber, request.user);
		if (!item) return response.status(404).json({ message: "Processo nao encontrado." });
		const { rows } = await database.query("SELECT events.id, events.event_type AS type, events.description, events.responsible, events.created_at AS \"createdAt\", users.name AS \"actorName\" FROM case_events events LEFT JOIN users ON users.id = events.actor_id WHERE events.case_id = $1 ORDER BY events.created_at DESC", [item.id]);
		return response.json({ timeline: rows });
	} catch (error) { return next(error); }
});

app.post("/api/cases/:caseNumber/comments", requireAuth, async (request, response, next) => {
	try {
		const item = await getCaseForUser(request.params.caseNumber, request.user);
		const body = String(request.body.body || "").trim();
		if (!item) return response.status(404).json({ message: "Processo nao encontrado." });
		if (!body) return response.status(400).json({ message: "Informe um comentario." });
		const { rows } = await database.query("INSERT INTO case_comments (case_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, body, created_at AS \"createdAt\"", [item.id, request.user.id, body]);
		await database.query("INSERT INTO case_events (case_id, event_type, description, responsible, actor_id) VALUES ($1, 'COMENTARIO', $2, $3, $4)", [item.id, "Comentario interno adicionado", request.user.name, request.user.id]);
		return response.status(201).json({ comment: { ...rows[0], authorName: request.user.name } });
	} catch (error) { return next(error); }
});

app.get("/api/cases/:caseNumber/comments", requireAuth, async (request, response, next) => {
	try {
		const item = await getCaseForUser(request.params.caseNumber, request.user);
		if (!item) return response.status(404).json({ message: "Processo nao encontrado." });
		const { rows } = await database.query("SELECT comments.id, comments.body, comments.created_at AS \"createdAt\", users.name AS \"authorName\" FROM case_comments comments JOIN users ON users.id = comments.author_id WHERE comments.case_id = $1 ORDER BY comments.created_at DESC", [item.id]);
		return response.json({ comments: rows });
	} catch (error) { return next(error); }
});

app.patch("/api/cases/:caseNumber/checklist/:itemId", requireAuth, async (request, response, next) => {
	try {
		const item = await getCaseForUser(request.params.caseNumber, request.user);
		if (!item) return response.status(404).json({ message: "Processo nao encontrado." });
		const completed = request.body.completed === true;
		const { rows } = await database.query("UPDATE case_checklist_items SET completed = $1, completed_by = $2, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END WHERE id = $3 AND case_id = $4 RETURNING *", [completed, completed ? request.user.id : null, Number(request.params.itemId), item.id]);
		if (!rows[0]) return response.status(404).json({ message: "Item de checklist nao encontrado." });
		return response.json({ item: rows[0] });
	} catch (error) { return next(error); }
});

app.post("/api/cases/:caseNumber/attachments", requireAuth, async (request, response, next) => {
	try {
		const item = await getCaseForUser(request.params.caseNumber, request.user);
		const fileName = String(request.body.fileName || "").trim();
		const fileUrl = String(request.body.fileUrl || "").trim();
		if (!item) return response.status(404).json({ message: "Processo nao encontrado." });
		if (!fileName || !fileUrl || fileUrl.length > 2048) return response.status(400).json({ message: "Informe o nome e a referencia do documento." });
		const { rows } = await database.query("INSERT INTO case_attachments (case_id, uploaded_by, file_name, file_url) VALUES ($1, $2, $3, $4) RETURNING id, file_name AS \"fileName\", file_url AS \"fileUrl\", created_at AS \"createdAt\"", [item.id, request.user.id, fileName, fileUrl]);
		return response.status(201).json({ attachment: rows[0] });
	} catch (error) { return next(error); }
});

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
		const scope = ["admin", "manager", "supervisor"].includes(request.user.role) ? "TRUE" : `(created_by = $${values.length + 1} OR assigned_to = $${values.length + 1})`;
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
		await notifyUser(current.assigned_to, current.id, "STATUS_CHANGED", `O processo ${request.params.caseNumber} mudou para ${status}.`);
		void dispatchWebhook("case.status_changed", { id: request.params.caseNumber, previousStatus: current.status, status }).catch(() => {});
		return response.json({ case: formatCase(updatedRows[0]) });
	} catch (error) { return next(error); }
});

app.get("/api/pending", requireAuth, async (request, response, next) => { try { const scope = ["admin", "manager", "supervisor"].includes(request.user.role) ? "TRUE" : "(created_by = $1 OR assigned_to = $1)"; const values = scope === "TRUE" ? [] : [request.user.id]; const { rows } = await database.query(`SELECT case_number AS id, client, type, status, responsible, updated_at AS "updatedAt", CASE WHEN status ILIKE '%documento%' THEN 'Documentacao pendente' WHEN status ILIKE '%analise%' THEN 'Aguardando analise' ELSE 'Revisao necessaria' END AS description, CASE WHEN status ILIKE '%documento%' THEN 'Alto' ELSE 'Medio' END AS risk FROM cases WHERE ${scope} AND status NOT IN ('Aprovado', 'Concluido', 'Encerrado') ORDER BY CASE WHEN status ILIKE '%documento%' THEN 1 ELSE 2 END, updated_at ASC`, values); return response.json({ items: rows }); } catch (error) { return next(error); } });

app.get("/api/reports/summary", requireAuth, async (request, response, next) => {
	try {
		const filters = [];
		const values = [];
		const addFilter = (condition, value) => { values.push(value); filters.push(condition.replace("$VALUE", `$${values.length}`)); };
		const scope = ["admin", "manager", "supervisor"].includes(request.user.role) ? "TRUE" : `(created_by = $${values.length + 1} OR assigned_to = $${values.length + 1})`;
		if (scope !== "TRUE") values.push(request.user.id);
		if (request.query.from) addFilter("updated_at::date >= $VALUE", String(request.query.from));
		if (request.query.to) addFilter("updated_at::date <= $VALUE", String(request.query.to));
		if (request.query.type) addFilter("type = $VALUE", String(request.query.type));
		const where = [scope, ...filters].join(" AND ");
		const { rows: totals } = await database.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status ILIKE '%pendente%' OR status ILIKE '%documento%')::int AS pending, COUNT(*) FILTER (WHERE type = 'Garantia' AND status = 'Em analise')::int AS guarantees_in_analysis, COUNT(*) FILTER (WHERE status IN ('Aprovado', 'Concluido', 'Encerrado'))::int AS completed FROM cases WHERE ${where}`, values);
		const { rows: byType } = await database.query(`SELECT type AS label, COUNT(*)::int AS value FROM cases WHERE ${where} GROUP BY type ORDER BY value DESC`, values);
		const { rows: events } = await database.query(`SELECT c.case_number AS id, e.event_type AS type, e.description, e.responsible, e.created_at AS "createdAt" FROM case_events e JOIN cases c ON c.id = e.case_id WHERE ${where.replace(/created_by|assigned_to/g, "c.$&")} ORDER BY e.created_at DESC LIMIT 20`, values);
		const { rows: productivity } = await database.query(`SELECT responsible AS user, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('Aprovado', 'Concluido', 'Encerrado'))::int AS completed FROM cases WHERE ${where} GROUP BY responsible ORDER BY completed DESC, total DESC`, values);
		const { rows: stageTime } = await database.query(`SELECT stage, ROUND(AVG(days_between)::numeric, 1) AS average_days FROM (SELECT e.event_type AS stage, EXTRACT(EPOCH FROM (e.created_at - LAG(e.created_at) OVER (PARTITION BY e.case_id ORDER BY e.created_at))) / 86400 AS days_between FROM case_events e JOIN cases c ON c.id = e.case_id WHERE ${where.replace(/created_by|assigned_to/g, "c.$&")}) transitions WHERE days_between IS NOT NULL GROUP BY stage ORDER BY average_days DESC NULLS LAST`, values);
		const { rows: stalled } = await database.query(`SELECT case_number AS id, client, type, status, responsible, updated_at AS "updatedAt" FROM cases WHERE ${where} AND status NOT IN ('Concluido', 'Encerrado', 'Cancelado') AND updated_at < NOW() - INTERVAL '3 days' ORDER BY updated_at ASC LIMIT 100`, values);
		return response.json({ filters: request.query, totals: totals[0], byType, events, productivity, stageTime, stalled });
	} catch (error) { return next(error); }
});

app.post("/api/activity", requireAuth, async (request, response, next) => {
	try {
		const action = String(request.body.action || "").trim();
		if (!["navigation", "click"].includes(action)) return response.status(400).json({ message: "Acao invalida." });
		const path = String(request.body.path || "").slice(0, 200) || null;
		const label = String(request.body.label || "").slice(0, 200) || null;
		await database.query("INSERT INTO user_activity_log (user_id, action, path, label) VALUES ($1, $2, $3, $4)", [request.user.id, action, path, label]);
		return response.status(204).send();
	} catch (error) { return next(error); }
});

app.get("/api/reports/team-performance", requireAuth, requireCapability(capabilities.VIEW_TEAM_REPORTS), async (request, response, next) => {
	try {
		const scopeManagerId = request.user.role === roles.MANAGER ? request.user.id : (Number.isInteger(Number(request.query.managerId)) ? Number(request.query.managerId) : null);
		const managerFilter = scopeManagerId ? "AND (u.id = $1 OR u.manager_id = $1)" : "";
		const values = scopeManagerId ? [scopeManagerId] : [];
		const { rows: individuals } = await database.query(`
			SELECT u.id, u.name, u.role,
				CASE WHEN u.role = 'manager' THEN u.id ELSE u.manager_id END AS "teamOwnerId",
				CASE WHEN u.role = 'manager' THEN u.name ELSE mgr.name END AS "teamOwnerName",
				COUNT(c.id)::int AS "casesRegistered",
				COALESCE(SUM(c.quantity), 0)::int AS "partsRegistered"
			FROM users u
			LEFT JOIN users mgr ON mgr.id = u.manager_id
			LEFT JOIN cases c ON c.created_by = u.id
			WHERE u.active = TRUE AND u.role IN ('operator', 'manager') ${managerFilter}
			GROUP BY u.id, u.name, u.role, mgr.name
			ORDER BY "partsRegistered" DESC`, values);
		const teams = new Map();
		individuals.forEach((row) => {
			const key = row.teamOwnerId || 0;
			if (!teams.has(key)) teams.set(key, { managerId: row.teamOwnerId || null, managerName: row.teamOwnerName || "Sem time", casesRegistered: 0, partsRegistered: 0, members: [] });
			const team = teams.get(key);
			team.casesRegistered += row.casesRegistered;
			team.partsRegistered += row.partsRegistered;
			team.members.push({ id: row.id, name: row.name, role: row.role, casesRegistered: row.casesRegistered, partsRegistered: row.partsRegistered });
		});
		return response.json({ teams: [...teams.values()], individuals });
	} catch (error) { return next(error); }
});

app.get("/api/reports/manager-performance", requireAuth, requireCapability(capabilities.VIEW_MANAGER_PERFORMANCE), async (request, response, next) => {
	try {
		const { rows } = await database.query(`
			SELECT m.id, m.name, m.email,
				COUNT(DISTINCT team.id)::int AS "teamSize",
				COALESCE(activity.total_actions, 0)::int AS "totalActions",
				COALESCE(activity.navigation_count, 0)::int AS "navigationCount",
				COALESCE(activity.click_count, 0)::int AS "clickCount",
				COALESCE(activity.active_days, 0)::int AS "activeDays",
				activity.last_activity_at AS "lastActivityAt",
				COALESCE(cases_stats.total_cases, 0)::int AS "teamCases",
				COALESCE(cases_stats.completed_cases, 0)::int AS "teamCompletedCases"
			FROM users m
			LEFT JOIN users team ON team.manager_id = m.id
			LEFT JOIN LATERAL (
				SELECT COUNT(*)::int AS total_actions,
					COUNT(*) FILTER (WHERE action = 'navigation')::int AS navigation_count,
					COUNT(*) FILTER (WHERE action = 'click')::int AS click_count,
					COUNT(DISTINCT created_at::date)::int AS active_days,
					MAX(created_at) AS last_activity_at
				FROM user_activity_log
				WHERE user_id = m.id
			) activity ON TRUE
			LEFT JOIN LATERAL (
				SELECT COUNT(*)::int AS total_cases,
					COUNT(*) FILTER (WHERE status IN ('Aprovado', 'Concluido', 'Encerrado'))::int AS completed_cases
				FROM cases
				WHERE created_by IN (SELECT id FROM users WHERE manager_id = m.id OR id = m.id)
			) cases_stats ON TRUE
			WHERE m.role = 'manager'
			GROUP BY m.id, activity.total_actions, activity.navigation_count, activity.click_count, activity.active_days, activity.last_activity_at, cases_stats.total_cases, cases_stats.completed_cases
			ORDER BY m.name`);
		const managers = rows.map((row) => ({ ...row, engagementScore: Math.min(100, Math.round((row.totalActions || 0) * 0.6 + (row.activeDays || 0) * 4 + (row.teamCompletedCases || 0) * 2)) }));
		return response.json({ managers });
	} catch (error) { return next(error); }
});

function csvCell(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
app.get("/api/reports/export.csv", requireAuth, async (request, response, next) => {
	try {
		const filters = [];
		const values = [];
		const addFilter = (condition, value) => { values.push(value); filters.push(condition.replace("$VALUE", `$${values.length}`)); };
		const scope = ["admin", "manager", "supervisor"].includes(request.user.role) ? "TRUE" : `(created_by = $${values.length + 1} OR assigned_to = $${values.length + 1})`;
		if (scope !== "TRUE") values.push(request.user.id);
		if (request.query.from) addFilter("updated_at::date >= $VALUE", String(request.query.from));
		if (request.query.to) addFilter("updated_at::date <= $VALUE", String(request.query.to));
		if (request.query.type) addFilter("type = $VALUE", String(request.query.type));
		const where = [scope, ...filters].join(" AND ");
		const { rows } = await database.query(`SELECT case_number, client, type, status, responsible, product, product_code, document_reference, updated_at FROM cases WHERE ${where} ORDER BY updated_at DESC`, values);
		const lines = [["Processo", "Cliente", "Tipo", "Status", "Responsavel", "Produto", "Codigo", "Documento", "Atualizado"], ...rows.map((item) => [item.case_number, item.client, item.type, item.status, item.responsible, item.product, item.product_code, item.document_reference, item.updated_at].map(csvCell))].map((row) => row.join(";"));
		response.setHeader("Content-Type", "text/csv; charset=utf-8");
		response.setHeader("Content-Disposition", "attachment; filename=relatorio-processos.csv");
		return response.send(`\ufeff${lines.join("\n")}`);
	} catch (error) { return next(error); }
});

app.get("/api/reports/export.html", requireAuth, async (request, response, next) => {
	try {
		const { rows } = await database.query("SELECT case_number, client, type, status, responsible, updated_at FROM cases ORDER BY updated_at DESC LIMIT 1000");
		const rowsHtml = rows.map((item) => `<tr><td>${item.case_number}</td><td>${item.client}</td><td>${item.type}</td><td>${item.status}</td><td>${item.responsible}</td><td>${new Date(item.updated_at).toLocaleString("pt-BR")}</td></tr>`).join("");
		response.setHeader("Content-Type", "text/html; charset=utf-8");
		return response.send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatorio de processos</title><style>body{font:14px Arial;color:#17283a}h1{color:#092d57}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe7ef;padding:8px;text-align:left}th{background:#f1f5f8}@media print{button{display:none}}</style></head><body><button onclick="print()">Imprimir / salvar PDF</button><h1>Relatorio de processos</h1><table><thead><tr><th>Processo</th><th>Cliente</th><th>Tipo</th><th>Status</th><th>Responsavel</th><th>Atualizado</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
	} catch (error) { return next(error); }
});

app.get("/api/users", requireAuth, requireCapability(capabilities.VIEW_USERS), async (request, response, next) => { try { const { rows } = await database.query("SELECT u.id, u.name, u.email, u.role, u.active, u.created_at AS \"createdAt\", u.manager_id AS \"managerId\", mgr.name AS \"managerName\" FROM users u LEFT JOIN users mgr ON mgr.id = u.manager_id ORDER BY u.name"); return response.json({ users: rows }); } catch (error) { return next(error); } });

app.post("/api/users", requireAuth, requireCapability(capabilities.CREATE_OPERATOR), async (request, response, next) => {
	try {
		const name = String(request.body.name || "").trim();
		const email = String(request.body.email || "").trim().toLowerCase();
		const password = String(request.body.password || "");
		const role = String(request.body.role || "operator").trim();
		const allowedRoles = [roles.OPERATOR, roles.MANAGER].filter((role) => can(request.user, role === roles.MANAGER ? capabilities.CREATE_MANAGER : capabilities.CREATE_OPERATOR));
		if (!name || !email || password.length < 8 || !allowedRoles.includes(role)) return response.status(400).json({ message: "Informe nome, e-mail, senha com pelo menos 8 caracteres e um perfil permitido." });
		let managerId = null;
		if (request.user.role === roles.MANAGER) {
			managerId = role === roles.OPERATOR ? request.user.id : null;
		} else if (can(request.user, capabilities.TRANSFER_TEAM) && request.body.managerId) {
			const parsedManagerId = Number(request.body.managerId);
			if (Number.isInteger(parsedManagerId)) {
				const { rows: managerRows } = await database.query("SELECT id FROM users WHERE id = $1 AND role = 'manager' AND active = TRUE", [parsedManagerId]);
				if (managerRows[0]) managerId = parsedManagerId;
			}
		}
		const { rows } = await database.query("INSERT INTO users (name, email, password_hash, role, manager_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, active, manager_id AS \"managerId\", created_at AS \"createdAt\"", [name, email, bcrypt.hashSync(password, 12), role, managerId]);
		await auditUserChange(request.user.id, rows[0].id, "USER_CREATED", { role, managerId });
		return response.status(201).json({ user: rows[0] });
	} catch (error) {
		if (error.code === "23505") return response.status(409).json({ message: "Ja existe uma conta com este e-mail." });
		return next(error);
	}
});

app.patch("/api/users/:userId/team", requireAuth, requireCapability(capabilities.TRANSFER_TEAM), async (request, response, next) => {
	try {
		const targetUserId = Number(request.params.userId);
		if (!Number.isInteger(targetUserId)) return response.status(400).json({ message: "Usuario alvo invalido." });
		const managerIdRaw = request.body.managerId;
		const managerId = managerIdRaw === null || managerIdRaw === "" || managerIdRaw === undefined ? null : Number(managerIdRaw);
		if (managerId !== null) {
			if (!Number.isInteger(managerId) || managerId === targetUserId) return response.status(400).json({ message: "Gerente invalido." });
			const { rows: managerRows } = await database.query("SELECT id FROM users WHERE id = $1 AND role = 'manager' AND active = TRUE", [managerId]);
			if (!managerRows[0]) return response.status(400).json({ message: "Selecione um gerente ativo valido." });
		}
		const { rows } = await database.query("UPDATE users SET manager_id = $1 WHERE id = $2 RETURNING id, name, email, role, active, manager_id AS \"managerId\", created_at AS \"createdAt\"", [managerId, targetUserId]);
		if (!rows[0]) return response.status(404).json({ message: "Usuario nao encontrado." });
		await auditUserChange(request.user.id, targetUserId, "TEAM_TRANSFERRED", { managerId });
		return response.json({ user: rows[0] });
	} catch (error) { return next(error); }
});

app.patch("/api/users/:userId/status", requireAuth, requireCapability(capabilities.MANAGE_USER_STATUS), async (request, response, next) => {
	try {
		const targetUserId = Number(request.params.userId);
		const active = request.body.active === true;
		if (!Number.isInteger(targetUserId) || targetUserId === request.user.id) return response.status(400).json({ message: "Usuario alvo invalido." });
		const { rows } = await database.query("UPDATE users SET active = $1 WHERE id = $2 RETURNING id, name, email, role, active, created_at AS \"createdAt\"", [active, targetUserId]);
		if (!rows[0]) return response.status(404).json({ message: "Usuario nao encontrado." });
		if (!active) await database.query("DELETE FROM sessions WHERE user_id = $1", [targetUserId]);
		await auditUserChange(request.user.id, targetUserId, active ? "USER_ACTIVATED" : "USER_DEACTIVATED", { active });
		return response.json({ user: rows[0] });
	} catch (error) { return next(error); }
});

app.get("/api/users/audit", requireAuth, requireCapability(capabilities.VIEW_AUDIT), async (request, response, next) => {
	try {
		const { rows } = await database.query("SELECT audit.id, audit.action, audit.details, audit.created_at AS \"createdAt\", actor.name AS \"actorName\", target.name AS \"targetName\" FROM user_audit_log audit LEFT JOIN users actor ON actor.id = audit.actor_id LEFT JOIN users target ON target.id = audit.target_user_id ORDER BY audit.created_at DESC LIMIT 100");
		return response.json({ audit: rows });
	} catch (error) { return next(error); }
});

app.patch("/api/cases/:caseNumber/assignee", requireAuth, requireCapability(capabilities.ASSIGN_CASES), async (request, response, next) => {
	try {
		const assigneeId = Number(request.body.assignedTo);
		if (!Number.isInteger(assigneeId)) return response.status(400).json({ message: "Informe um operador valido." });
		const { rows: assignees } = await database.query("SELECT id, name, role, active FROM users WHERE id = $1", [assigneeId]);
		const assignee = assignees[0];
		if (!assignee || assignee.role !== roles.OPERATOR || !assignee.active) return response.status(400).json({ message: "O processo deve ser atribuido a um operador ativo." });
		const { rows } = await database.query("UPDATE cases SET assigned_to = $1, responsible = $2, updated_at = NOW() WHERE case_number = $3 RETURNING *", [assignee.id, assignee.name, request.params.caseNumber]);
		if (!rows[0]) return response.status(404).json({ message: "Processo nao encontrado." });
		await database.query("INSERT INTO case_events (case_id, event_type, description, responsible, actor_id) VALUES ($1, 'ATRIBUICAO', $2, $3, $4)", [rows[0].id, `Processo atribuido para ${assignee.name}`, assignee.name, request.user.id]);
		await notifyUser(assignee.id, rows[0].id, "CASE_ASSIGNED", `O processo ${request.params.caseNumber} foi atribuido a voce.`);
		return response.json({ case: formatCase(rows[0]) });
	} catch (error) { return next(error); }
});

app.get("/api/cases/:caseNumber/management", requireAuth, async (request, response, next) => {
	try {
		const item = await getCaseForUser(request.params.caseNumber, request.user);
		if (!item) return response.status(404).json({ message: "Processo nao encontrado." });
		const [checklist, attachments] = await Promise.all([
			database.query("SELECT id, label, completed, completed_at AS \"completedAt\" FROM case_checklist_items WHERE case_id = $1 ORDER BY id", [item.id]),
			database.query("SELECT id, file_name AS \"fileName\", file_url AS \"fileUrl\", created_at AS \"createdAt\" FROM case_attachments WHERE case_id = $1 ORDER BY created_at DESC", [item.id])
		]);
		return response.json({ checklist: checklist.rows, attachments: attachments.rows });
	} catch (error) { return next(error); }
});

app.get("/api/sla", requireAuth, async (request, response, next) => {
	try { const { rows } = await database.query("SELECT type, days, updated_at AS \"updatedAt\" FROM case_sla_config ORDER BY type"); return response.json({ sla: rows }); } catch (error) { return next(error); }
});

app.put("/api/sla/:type", requireAuth, requireCapability(capabilities.MANAGE_USER_STATUS), async (request, response, next) => {
	try {
		const type = String(request.params.type);
		const days = Number(request.body.days);
		if (!["Pedido de venda", "Base de troca", "Garantia"].includes(type) || !Number.isInteger(days) || days < 1 || days > 365) return response.status(400).json({ message: "Informe um SLA valido entre 1 e 365 dias." });
		const { rows } = await database.query("INSERT INTO case_sla_config (type, days, updated_by) VALUES ($1, $2, $3) ON CONFLICT (type) DO UPDATE SET days = EXCLUDED.days, updated_by = EXCLUDED.updated_by, updated_at = NOW() RETURNING type, days, updated_at AS \"updatedAt\"", [type, days, request.user.id]);
		return response.json({ sla: rows[0] });
	} catch (error) { return next(error); }
});

app.get("/api/notifications", requireAuth, async (request, response, next) => {
	try { const { rows } = await database.query("SELECT id, case_id AS \"caseId\", kind, message, read_at AS \"readAt\", created_at AS \"createdAt\" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [request.user.id]); return response.json({ notifications: rows }); } catch (error) { return next(error); }
});

app.get("/api/integrations/webhooks", requireAuth, requireCapability(capabilities.MANAGE_INTEGRATIONS), async (request, response, next) => {
	try { const { rows } = await database.query("SELECT id, name, endpoint_url AS \"endpointUrl\", events, active, created_at AS \"createdAt\" FROM webhooks ORDER BY created_at DESC"); return response.json({ webhooks: rows }); } catch (error) { return next(error); }
});

app.post("/api/integrations/webhooks", requireAuth, requireCapability(capabilities.MANAGE_INTEGRATIONS), async (request, response, next) => {
	try {
		const name = String(request.body.name || "").trim();
		const endpointUrl = String(request.body.endpointUrl || "").trim();
		const secret = String(request.body.secret || "").trim();
		const events = Array.isArray(request.body.events) ? request.body.events.filter((event) => ["case.created", "case.status_changed", "case.assigned"].includes(event)) : [];
		if (!name || !secret || !/^https:\/\//i.test(endpointUrl) || !events.length) return response.status(400).json({ message: "Informe nome, endpoint HTTPS, segredo e ao menos um evento." });
		const { rows } = await database.query("INSERT INTO webhooks (name, endpoint_url, secret, events, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, endpoint_url AS \"endpointUrl\", events, active, created_at AS \"createdAt\"", [name, endpointUrl, secret, JSON.stringify(events), request.user.id]);
		return response.status(201).json({ webhook: rows[0] });
	} catch (error) { return next(error); }
});

app.patch("/api/notifications/:id/read", requireAuth, async (request, response, next) => {
	try { await database.query("UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2", [Number(request.params.id), request.user.id]); return response.status(204).send(); } catch (error) { return next(error); }
});

app.get("/api/search", requireAuth, async (request, response, next) => {
	try {
		const term = `%${String(request.query.q || "").trim()}%`;
		if (term === "%%") return response.json({ cases: [] });
		const scope = hasRole(request.user, broadVisibilityRoles) ? "TRUE" : "(created_by = $1 OR assigned_to = $1)";
		const values = scope === "TRUE" ? [term] : [request.user.id, term];
		const parameter = scope === "TRUE" ? "$1" : "$2";
		const { rows } = await database.query(`SELECT case_number AS id, client, type, status, responsible, product, product_code AS \"productCode\", document_reference AS \"documentReference\", updated_at AS \"updatedAt\" FROM cases WHERE ${scope} AND (case_number ILIKE ${parameter} OR client ILIKE ${parameter} OR product_code ILIKE ${parameter} OR document_reference ILIKE ${parameter}) ORDER BY updated_at DESC LIMIT 50`, values);
		return response.json({ cases: rows });
	} catch (error) { return next(error); }
});

app.patch("/api/account", requireAuth, async (request, response, next) => { try { const name = String(request.body.name || "").trim(); const password = String(request.body.password || ""); if (!name) return response.status(400).json({ message: "Informe seu nome." }); if (password) await database.query("UPDATE users SET name = $1, password_hash = $2 WHERE id = $3", [name, bcrypt.hashSync(password, 12), request.user.id]); else await database.query("UPDATE users SET name = $1 WHERE id = $2", [name, request.user.id]); const { rows } = await database.query("SELECT id, name, email, role FROM users WHERE id = $1", [request.user.id]); return response.json({ user: rows[0] }); } catch (error) { return next(error); } });

app.use((error, request, response, next) => { logEvent("http_error", { method: request.method, path: request.path, error: error.message }); return response.status(500).json({ message: "Erro interno do servidor." }); });
app.get("*", (request, response) => response.sendFile(path.join(frontendDirectory, "html", "index.html")));

async function start() {
	await initializeDatabase();
	app.listen(port, host, () => logEvent("server_started", { host, port }));
}

if (require.main === module) start().catch((error) => { logEvent("startup_error", { error: error.message }); process.exit(1); });

module.exports = { app, roles, hasRole, start, database };