// Pedido de venda: vendedor e prazo padrao do cliente (Omie) e historico de precos do produto.
const assert = require("node:assert/strict");
const { before, after, beforeEach, afterEach, test } = require("node:test");
const h = require("./helpers");
const omie = require("../services/omie");
const mirror = require("../services/omieMirror");

let handlers = {};
const jsonResponse = (body, status = 200) => ({ status, ok: status < 400, json: async () => body });

before(async () => {
	await h.setup();
	omie.setTransport({
		sleep: async () => {},
		fetch: async (url, options) => {
			const body = JSON.parse(options.body);
			const handler = handlers[body.call];
			if (!handler) return jsonResponse({ faultstring: "Metodo nao esperado" }, 500);
			return handler(body.param[0], body);
		}
	});
});
after(h.teardown);
beforeEach(async () => {
	await h.resetDatabase();
	await h.database.query("TRUNCATE omie_sync_runs, omie_orders, omie_invoices, omie_sellers, omie_payment_terms RESTART IDENTITY");
	handlers = {};
	process.env.OMIE_APP_KEY = "key";
	process.env.OMIE_APP_SECRET = "secret";
});
afterEach(() => {
	delete process.env.OMIE_APP_KEY;
	delete process.env.OMIE_APP_SECRET;
});

const omieOrder = (code, customerCode, date, items, extra = {}) => ({
	cabecalho: { codigo_pedido: code, numero_pedido: String(code), codigo_cliente: customerCode, codigo_parcela: extra.parcela },
	infoCadastro: { dInc: date, faturado: "S", cancelado: extra.cancelado || "N" },
	informacoes_adicionais: { codVend: extra.vendedor },
	det: items.map(([codigo, quantidade, valor]) => ({ produto: { codigo, descricao: `Peca ${codigo}`, quantidade, valor_unitario: valor } }))
});

test("sincroniza vendedores, parcelas e recomendacoes do cliente; o pedido recebe vendedor e prazo do cadastro", async () => {
	const manager = await h.createUser("manager");
	handlers.ListarVendedores = () =>
		jsonResponse({
			total_de_paginas: 1,
			cadastro: [
				{ codigo: 501, nome: "GILMAR ARAUJO" },
				{ codigo: 502, nome: "Outro", inativo: "S" }
			]
		});
	handlers.ListarParcelas = () =>
		jsonResponse({
			total_de_paginas: 1,
			cadastros: [
				{ nCodigo: "A28", cDescricao: "Para 28 dias", nParcelas: 1 },
				{ nCodigo: "000", cDescricao: "À Vista" }
			]
		});
	handlers.ListarClientes = () =>
		jsonResponse({
			total_de_paginas: 1,
			clientes_cadastro: [
				{
					codigo_cliente_omie: 77,
					razao_social: "TRANS-VIEIRA LOTACAO",
					cnpj_cpf: "11.222.333/0001-81",
					recomendacoes: { codigo_vendedor: 501, numero_parcelas: "A28" }
				},
				{ codigo_cliente_omie: 78, razao_social: "SEM RECOMENDACAO", cnpj_cpf: "" }
			]
		});
	for (const kind of ["sellers", "paymentTerms", "customers"]) {
		const result = await h.api("POST", "/api/omie/sync", { token: manager.token, body: { kind } });
		assert.equal(result.status, 200, kind);
	}
	const { rows } = await h.database.query("SELECT id, omie_seller_code, omie_payment_code FROM customers ORDER BY omie_code");
	assert.deepEqual([Number(rows[0].omie_seller_code), rows[0].omie_payment_code], [501, "A28"]);

	const operator = await h.createUser("operator");
	const defaults = await h.api("GET", `/api/customers/${rows[0].id}/sales-defaults`, { token: operator.token });
	assert.equal(defaults.status, 200);
	assert.deepEqual([defaults.body.seller, defaults.body.paymentTerms], ["GILMAR ARAUJO", "Para 28 dias"]);
	assert.deepEqual(defaults.body.sources, { seller: "omie_cadastro", paymentTerms: "omie_cadastro" });

	// Sem recomendacao no cadastro: usa o ultimo pedido do cliente no Omie.
	await mirror.upsertOrder(omieOrder(9001, 78, "10/11/2026", [["5146", 1, 900]], { vendedor: 501, parcela: "000" }));
	const fallback = (await h.api("GET", `/api/customers/${rows[1].id}/sales-defaults`, { token: operator.token })).body;
	assert.deepEqual([fallback.seller, fallback.paymentTerms], ["GILMAR ARAUJO", "À Vista"]);
	assert.equal(fallback.sources.seller, "omie_ultimo_pedido");
	assert.equal((await h.api("GET", "/api/customers/999/sales-defaults", { token: operator.token })).status, 404);
});

test("sem Omie: vendedor e prazo vem do ultimo pedido do app ou do representante do cliente", async () => {
	const manager = await h.createUser("manager");
	const operator = await h.createUser("operator");
	const rep = (await h.api("POST", "/api/representatives", { token: manager.token, body: { name: "Carlos Rep" } })).body.representative;
	const customer = (await h.api("POST", "/api/customers", { token: manager.token, body: { name: "Oficina Beta", representativeId: rep.id } })).body.customer;
	let defaults = (await h.api("GET", `/api/customers/${customer.id}/sales-defaults`, { token: operator.token })).body;
	assert.deepEqual([defaults.seller, defaults.paymentTerms, defaults.sources.seller], ["Carlos Rep", null, "representante"]);
	await h.api("POST", "/api/cases", {
		token: operator.token,
		body: {
			type: "Pedido de venda",
			client: "Oficina Beta",
			customerId: customer.id,
			product: "Valvula",
			productCode: "A1",
			quantity: 1,
			salesRepresentative: "Ana Vendas",
			paymentTerms: "30/60 dias"
		}
	});
	defaults = (await h.api("GET", `/api/customers/${customer.id}/sales-defaults`, { token: operator.token })).body;
	assert.deepEqual([defaults.seller, defaults.paymentTerms], ["Ana Vendas", "30/60 dias"]);
});

test("historico de venda: ultimos precos do produto para o cliente e no geral (Omie + app, sem duplicar)", async () => {
	const manager = await h.createUser("manager");
	const operator = await h.createUser("operator");
	await h.database.query("INSERT INTO customers (name, omie_code) VALUES ('Trans-Vieira', 77), ('Outro Cliente', 78)");
	const { rows: customers } = await h.database.query("SELECT id, name FROM customers ORDER BY omie_code");
	await mirror.upsertOrder(omieOrder(1, 77, "01/10/2026", [["5146", 1, 900]]));
	await mirror.upsertOrder(
		omieOrder(2, 78, "05/10/2026", [
			["5146", 2, 980],
			["A1", 1, 10]
		])
	);
	await mirror.upsertOrder(omieOrder(3, 77, "20/10/2026", [["5146", 1, 999]], { cancelado: "S" }));
	await h.api("POST", "/api/cases", {
		token: operator.token,
		body: {
			type: "Pedido de venda",
			client: "Trans-Vieira",
			customerId: customers[0].id,
			product: "Cabecote",
			productCode: "5146",
			quantity: 1,
			items: [{ productCode: "5146", description: "Cabecote", quantity: 1, unitPrice: 950 }]
		}
	});
	const history = (await h.api("GET", `/api/products/sales-history?code=5146&customerId=${customers[0].id}`, { token: operator.token })).body;
	assert.deepEqual(
		history.customer.map((row) => [row.source, row.unitPrice]),
		[
			["App", 950],
			["Omie", 900]
		],
		"so o cliente do pedido, mais recente primeiro, sem o pedido cancelado"
	);
	assert.deepEqual(
		history.general.map((row) => row.unitPrice),
		[950, 980, 900]
	);
	assert.equal(history.general[1].customerName, "Outro Cliente");
	assert.equal((await h.api("GET", "/api/products/sales-history", { token: operator.token })).status, 400);
	assert.equal((await h.api("GET", "/api/products/sales-history?code=5146", { token: manager.token })).body.customer.length, 0);
});
