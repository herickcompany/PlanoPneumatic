const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const { app, database } = require("./server");

const passwordHash = bcrypt.hashSync("StrongPass123!", 4);

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const payload = body ? JSON.stringify(body) : "";
      const request = http.request({
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      }, (response) => {
        let responseBody = "";
        response.on("data", (chunk) => { responseBody += chunk; });
        response.on("end", () => {
          server.close(() => resolve({ status: response.statusCode, body: responseBody ? JSON.parse(responseBody) : null }));
        });
      });
      request.on("error", (error) => server.close(() => reject(error)));
      request.end(payload);
    });
  });
}

function mockDatabase(queries) {
  const originalQuery = database.query;
  let index = 0;
  database.query = async (...args) => {
    const handler = queries[index++];
    if (!handler) throw new Error(`Unexpected database query: ${args[0]}`);
    return typeof handler === "function" ? handler(...args) : handler;
  };
  return () => { database.query = originalQuery; };
}

test("login rejects invalid credentials", async () => {
  const restore = mockDatabase([{ rows: [] }]);
  try {
    const response = await request("POST", "/api/auth/login", { email: "unknown@example.com", password: "wrong" });
    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Usuario ou senha invalidos.");
  } finally { restore(); }
});

test("login creates a session for valid credentials", async () => {
  const restore = mockDatabase([{ rows: [{ id: 7, name: "Admin", email: "admin@example.com", role: "admin", password_hash: passwordHash }] }, { rows: [] }]);
  try {
    const response = await request("POST", "/api/auth/login", { email: "admin@example.com", password: "StrongPass123!" });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, "admin");
    assert.equal(typeof response.body.token, "string");
  } finally { restore(); }
});

test("operator cannot list users", async () => {
  const restore = mockDatabase([{ rows: [{ id: 8, name: "Operator", email: "operator@example.com", role: "operator", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] }]);
  try {
    const response = await request("GET", "/api/users", null, "operator-token");
    assert.equal(response.status, 403);
  } finally { restore(); }
});

test("manager can create an operator but not a manager", async () => {
  const restore = mockDatabase([
    { rows: [{ id: 9, name: "Manager", email: "manager@example.com", role: "manager", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] },
    { rows: [{ id: 10, name: "Operator", email: "new@example.com", role: "operator", active: true, createdAt: new Date().toISOString() }] },
    { rows: [] }
  ]);
  try {
    const allowed = await request("POST", "/api/users", { name: "New Operator", email: "new@example.com", password: "StrongPass123!", role: "operator" }, "manager-token");
    assert.equal(allowed.status, 201);
  } finally { restore(); }

  const deniedRestore = mockDatabase([{ rows: [{ id: 9, name: "Manager", email: "manager@example.com", role: "manager", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] }]);
  try {
    const denied = await request("POST", "/api/users", { name: "Another Manager", email: "manager2@example.com", password: "StrongPass123!", role: "manager" }, "manager-token");
    assert.equal(denied.status, 400);
  } finally { deniedRestore(); }
});

test("admin can create a manager", async () => {
  const restore = mockDatabase([
    { rows: [{ id: 1, name: "Admin", email: "admin@example.com", role: "admin", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] },
    { rows: [{ id: 11, name: "Manager", email: "manager@example.com", role: "manager", active: true, createdAt: new Date().toISOString() }] },
    { rows: [] }
  ]);
  try {
    const response = await request("POST", "/api/users", { name: "Manager", email: "manager@example.com", password: "StrongPass123!", role: "manager" }, "admin-token");
    assert.equal(response.status, 201);
    assert.equal(response.body.user.role, "manager");
  } finally { restore(); }
});

test("operator cannot assign a case", async () => {
  const restore = mockDatabase([{ rows: [{ id: 8, name: "Operator", email: "operator@example.com", role: "operator", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] }]);
  try {
    const response = await request("PATCH", "/api/cases/GAR-2026-0045/assignee", { assignedTo: 10 }, "operator-token");
    assert.equal(response.status, 403);
  } finally { restore(); }
});

test("operator can create a case in the operational flow", async () => {
  const createdCase = { id: 20, case_number: "GAR-2026-0099", client: "Cliente Teste", type: "Garantia", status: "Criado", responsible: "Operator", product: "Compressor", product_code: "CP-01", quantity: 1, updated_at: new Date(), created_at: new Date() };
  const restore = mockDatabase([
    { rows: [{ id: 8, name: "Operator", email: "operator@example.com", role: "operator", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] },
    { rows: [{ count: 0 }] },
    { rows: [createdCase] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] }
  ]);
  try {
    const response = await request("POST", "/api/cases", { client: "Cliente Teste", type: "Garantia", product: "Compressor", productCode: "CP-01", quantity: 1 }, "operator-token");
    assert.equal(response.status, 201);
    assert.equal(response.body.case.id, "GAR-2026-0099");
  } finally { restore(); }
});

test("authorized user can update status through approval and closure", async () => {
  const current = { id: 20, case_number: "GAR-2026-0099", client: "Cliente Teste", type: "Garantia", status: "Em analise", responsible: "Operator", assigned_to: 8, created_by: 8, product: "Compressor", product_code: "CP-01", quantity: 1, updated_at: new Date(), created_at: new Date() };
  const updated = { ...current, status: "Aprovado" };
  const restore = mockDatabase([
    { rows: [{ id: 8, name: "Operator", email: "operator@example.com", role: "operator", token_hash: "x", expires_at: new Date(Date.now() + 60000) }] },
    { rows: [current] },
    { rows: [updated] },
    { rows: [] },
    { rows: [] }
  ]);
  try {
    const response = await request("PATCH", "/api/cases/GAR-2026-0099/status", { status: "Aprovado" }, "operator-token");
    assert.equal(response.status, 200);
    assert.equal(response.body.case.status, "Aprovado");
  } finally { restore(); }
});
