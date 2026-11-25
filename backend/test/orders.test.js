// Pedido de venda (pedido da Plano, nov/2026): observacao por item, informacoes para a nota fiscal,
// item marcado como "base de troca" gera debito de carcaca, edicao dos itens depois de lancado
// e estorno ao cancelar.
const assert = require("node:assert/strict");
const { before, after, beforeEach, test } = require("node:test");
const h = require("./helpers");

before(h.setup);
after(h.teardown);
beforeEach(h.resetDatabase);

async function scenario() {
	const manager = await h.createUser("manager");
	const operator = await h.createUser("operator");
	const rep = (await h.api("POST", "/api/representatives", { token: manager.token, body: { name: "Gilmar Araujo" } })).body.representative;
	const customer = (await h.api("POST", "/api/customers", { token: manager.token, body: { name: "Trans-Vieira", representativeId: rep.id } })).body.customer;
	return { manager, operator, rep, customer };
}

const order = (token, customer, items, extra = {}) =>
	h.api("POST", "/api/cases", {
		token,
		body: {
			type: "Pedido de venda",
			client: customer.name,
			customerId: customer.id,
			product: items[0].description,
			productCode: items[0].productCode,
			quantity: items[0].quantity,
			documentReference: "ORC-159034",
			salesRepresentative: "Gilmar Araujo",
			paymentTerms: "Para 28 dias",
			invoiceNotes: "Pedido de compra 4521 do cliente",
			items,
			...extra
		}
	});

const balance = async (token) => (await h.api("GET", "/api/carcass/summary", { token })).body;

test("item com observacao e base de troca: grava no pedido e gera o debito de carcaca", async () => {
	const { operator, customer, rep } = await scenario();
	const created = await order(operator.token, customer, [
		{ productCode: "5146", description: "Cabecote compressor Wabco", quantity: 1, unitPrice: 950, notes: "Cliente pediu urgencia", carcass: true },
		{ productCode: "A1", description: "Valvula", quantity: 2, unitPrice: 10 }
	]);
	assert.equal(created.status, 201);
	const detail = (await h.api("GET", `/api/cases/${created.body.case.id}`, { token: operator.token })).body.case;
	assert.equal(detail.invoiceNotes, "Pedido de compra 4521 do cliente");
	assert.equal(detail.items[0].notes, "Cliente pediu urgencia");
	assert.equal(detail.items[0].carcass, true);
	assert.equal(detail.items[1].carcass, false);
	assert.equal(detail.permissions.editItems, true);

	const summary = await balance(operator.token);
	assert.equal(summary.rows.length, 1);
	assert.equal(summary.rows[0].outstanding, 1);
	assert.equal(summary.rows[0].representativeId, rep.id, "herda o representante do cliente");
	const entries = (await h.api("GET", "/api/carcass/entries", { token: operator.token })).body.entries;
	assert.equal(entries.length, 1);
	assert.equal(entries[0].source, "case");
	assert.equal(entries[0].productCode, "5146");
	assert.match(entries[0].document, /^PV-\d{4}-\d{4} · ORC-159034$/);
});

test("editar itens depois de lancado: inclui, exclui, altera quantidade e valor; o saldo de carcaca acompanha", async () => {
	const { operator, customer } = await scenario();
	const created = await order(operator.token, customer, [
		{ productCode: "5146", description: "Cabecote", quantity: 1, unitPrice: 950, carcass: true },
		{ productCode: "A1", description: "Valvula", quantity: 2, unitPrice: 10 }
	]);
	const id = created.body.case.id;
	const edit = await h.api("PUT", `/api/cases/${id}/items`, {
		token: operator.token,
		body: {
			items: [
				{ productCode: "5146", description: "Cabecote", quantity: 3, unitPrice: 900, carcass: true },
				{ productCode: "B2", description: "Cilindro", quantity: 1, unitPrice: 100, notes: "Trocar na entrega" }
			]
		}
	});
	assert.equal(edit.status, 200);
	const detail = edit.body.case;
	assert.deepEqual(
		detail.items.map((item) => [item.productCode, item.quantity, item.unitPrice]),
		[
			["5146", 3, 900],
			["B2", 1, 100]
		]
	);
	assert.equal(detail.totalValue, 2800);
	assert.equal(detail.quantity, 4, "resumo do processo atualizado");
	const event = detail.events.find((entry) => entry.type === "ITENS");
	assert.match(event.description, /Incluído\(s\) B2/);
	assert.match(event.description, /excluído\(s\) A1/);
	assert.match(event.description, /alterado\(s\) 5146 × 3/);
	assert.equal((await balance(operator.token)).rows[0].outstanding, 3, "debito refeito com a nova quantidade");

	// Desmarcar a base de troca estorna o debito.
	await h.api("PUT", `/api/cases/${id}/items`, {
		token: operator.token,
		body: { items: [{ productCode: "5146", description: "Cabecote", quantity: 3, unitPrice: 900 }] }
	});
	assert.equal((await balance(operator.token)).rows.length, 0);

	assert.equal((await h.api("PUT", `/api/cases/${id}/items`, { token: operator.token, body: { items: [] } })).status, 400, "ao menos um item");
	const warranty = await h.createCase(operator.token, "Garantia");
	assert.equal(
		(await h.api("PUT", `/api/cases/${warranty}/items`, { token: operator.token, body: { items: [{ productCode: "X", description: "X", quantity: 1 }] } })).body
			.code,
		"NOT_AN_ORDER"
	);
});

test("pedido cancelado estorna o debito e reaberto lanca de novo; encerrado nao aceita edicao de itens", async () => {
	const { manager, operator, customer } = await scenario();
	const created = await order(operator.token, customer, [{ productCode: "5146", description: "Cabecote", quantity: 2, unitPrice: 950, carcass: true }]);
	const id = created.body.case.id;
	const status = (token, body) => h.api("PATCH", `/api/cases/${id}/status`, { token, body });
	assert.equal((await status(operator.token, { status: "Cancelado", reason: "Cliente desistiu" })).status, 200);
	assert.equal((await balance(operator.token)).rows.length, 0);
	assert.equal(
		(await h.api("PUT", `/api/cases/${id}/items`, { token: operator.token, body: { items: [{ productCode: "5146", description: "C", quantity: 1 }] } })).body
			.code,
		"CASE_LOCKED"
	);
	assert.equal((await status(manager.token, { status: "Em analise", reason: "Cliente voltou" })).status, 200);
	assert.equal((await balance(operator.token)).rows[0].outstanding, 2);
});

test("saldo de carcacas por produto: quais clientes devem cada peca", async () => {
	const { manager, operator, customer } = await scenario();
	const other = (await h.api("POST", "/api/customers", { token: manager.token, body: { name: "Oficina Beta" } })).body.customer;
	await order(operator.token, customer, [{ productCode: "5146", description: "Cabecote", quantity: 2, unitPrice: 950, carcass: true }]);
	await order(operator.token, other, [{ productCode: "5146", description: "Cabecote", quantity: 1, unitPrice: 950, carcass: true }], {
		documentReference: "ORC-2"
	});
	await order(operator.token, other, [{ productCode: "7001", description: "Valvula reman", quantity: 1, unitPrice: 300, carcass: true }], {
		documentReference: "ORC-3"
	});
	const summary = (await h.api("GET", "/api/carcass/summary?groupBy=product", { token: operator.token })).body;
	assert.deepEqual(
		summary.rows.map((row) => [row.name, row.outstanding, row.lines.map((line) => line.customerName)]),
		[
			["5146", 3, ["Trans-Vieira", "Oficina Beta"]],
			["7001", 1, ["Oficina Beta"]]
		]
	);
	assert.equal(summary.rows[0].productDescription, "Cabecote");
	assert.equal(summary.totals.debtors, 2, "clientes distintos");
	assert.equal((await h.api("GET", "/api/carcass/summary?groupBy=product&q=valvula", { token: operator.token })).body.rows.length, 1);
});
