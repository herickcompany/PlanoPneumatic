// Apoio ao lancamento do pedido de venda:
//  - padroes comerciais do cliente (vendedor e prazo) vindos do Omie, com alternativas quando faltam;
//  - historico de venda de um produto (ultimos precos para o cliente e no geral).
// Le so o que ja esta no banco (cadastro sincronizado e espelho de pedidos): nao chama o Omie.
const { database } = require("../db");
const { notFound } = require("../middleware/errors");

const HISTORY_LIMIT = 15;

// Vendedor e prazo, nesta ordem de preferencia:
//  1) cadastro do cliente no Omie (aba Recomendacoes);
//  2) ultimo pedido do cliente no espelho do Omie;
//  3) ultimo pedido do cliente lancado no app;
//  4) representante padrao do cliente (so o vendedor).
async function customerDefaults(customerId) {
	const { rows: customers } = await database.query(
		`SELECT c.id, c.name, c.omie_code, c.omie_seller_code, c.omie_payment_code, r.name AS representative_name
		 FROM customers c LEFT JOIN representatives r ON r.id = c.representative_id WHERE c.id = $1`,
		[customerId]
	);
	const customer = customers[0];
	if (!customer) throw notFound("Cliente nao encontrado.");
	let sellerCode = customer.omie_seller_code ? Number(customer.omie_seller_code) : null;
	let paymentCode = customer.omie_payment_code || null;
	let seller = null;
	let paymentTerms = null;
	const sources = {};
	if (sellerCode) sources.seller = "omie_cadastro";
	if (paymentCode) sources.paymentTerms = "omie_cadastro";
	if ((!sellerCode || !paymentCode) && customer.omie_code) {
		const { rows } = await database.query(
			`SELECT data->>'sellerCode' AS seller_code, data->>'paymentCode' AS payment_code FROM omie_orders
			 WHERE customer_code = $1 AND NOT cancelled ORDER BY order_date DESC NULLS LAST, omie_code DESC LIMIT 1`,
			[customer.omie_code]
		);
		if (!sellerCode && Number(rows[0]?.seller_code)) {
			sellerCode = Number(rows[0].seller_code);
			sources.seller = "omie_ultimo_pedido";
		}
		if (!paymentCode && rows[0]?.payment_code) {
			paymentCode = rows[0].payment_code;
			sources.paymentTerms = "omie_ultimo_pedido";
		}
	}
	if (sellerCode) {
		const { rows } = await database.query("SELECT name FROM omie_sellers WHERE code = $1", [sellerCode]);
		if (rows[0]) seller = rows[0].name;
		else delete sources.seller;
	}
	if (paymentCode) {
		const { rows } = await database.query("SELECT description FROM omie_payment_terms WHERE code = $1", [paymentCode]);
		if (rows[0]) paymentTerms = rows[0].description;
		else delete sources.paymentTerms;
	}
	if (!seller || !paymentTerms) {
		const { rows } = await database.query(
			`SELECT sales_representative, payment_terms FROM cases
			 WHERE type = 'Pedido de venda' AND status <> 'Cancelado' AND (customer_id = $1 OR lower(client) = lower($2))
			   AND (sales_representative IS NOT NULL OR payment_terms IS NOT NULL)
			 ORDER BY created_at DESC LIMIT 1`,
			[customer.id, customer.name]
		);
		if (!seller && rows[0]?.sales_representative) {
			seller = rows[0].sales_representative;
			sources.seller = "app_ultimo_pedido";
		}
		if (!paymentTerms && rows[0]?.payment_terms) {
			paymentTerms = rows[0].payment_terms;
			sources.paymentTerms = "app_ultimo_pedido";
		}
	}
	if (!seller && customer.representative_name) {
		seller = customer.representative_name;
		sources.seller = "representante";
	}
	return { customerId: customer.id, seller, paymentTerms, sources };
}

// Ultimas vendas de um produto: pedidos do Omie (espelho) + pedidos do app que nao vieram do Omie.
async function productHistory(productCode, { customerId } = {}) {
	const code = String(productCode || "").trim();
	if (!code) return { productCode: code, customer: [], general: [] };
	const { rows: customers } = customerId ? await database.query("SELECT id, name, omie_code FROM customers WHERE id = $1", [customerId]) : { rows: [] };
	const customer = customers[0] || null;
	const { rows } = await database.query(
		`SELECT * FROM (
			SELECT o.order_date AS date, 'Omie' AS source, o.number AS document, COALESCE(cu.name, 'Cliente ' || o.customer_code) AS customer_name,
			  cu.id AS customer_id, o.customer_code, (item->>'quantity')::numeric AS quantity, (item->>'unitPrice')::numeric AS unit_price
			FROM omie_orders o
			CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.data->'items', '[]'::jsonb)) item
			LEFT JOIN customers cu ON cu.omie_code = o.customer_code
			WHERE NOT o.cancelled AND lower(item->>'productCode') = lower($1)
			UNION ALL
			SELECT (c.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'App', c.case_number, c.client, c.customer_id, NULL::bigint,
			  COALESCE(ci.quantity, c.quantity), COALESCE(ci.unit_price, CASE WHEN ci.id IS NULL THEN c.unit_price END)
			FROM cases c LEFT JOIN case_items ci ON ci.case_id = c.id
			WHERE c.type = 'Pedido de venda' AND c.status <> 'Cancelado'
			  AND lower(COALESCE(ci.product_code, c.product_code)) = lower($1)
			  AND (c.omie_order_code IS NULL OR NOT EXISTS (SELECT 1 FROM omie_orders oo WHERE oo.omie_code = c.omie_order_code))
		) sales WHERE unit_price IS NOT NULL AND unit_price > 0
		ORDER BY date DESC NULLS LAST LIMIT 500`,
		[code]
	);
	const format = (row) => ({
		date: row.date ? new Date(row.date).toISOString().slice(0, 10) : null,
		source: row.source,
		document: row.document,
		customerName: row.customer_name,
		quantity: Number(row.quantity),
		unitPrice: Number(row.unit_price)
	});
	const isCustomer = (row) =>
		customer &&
		((row.customer_id && row.customer_id === customer.id) ||
			(customer.omie_code && row.customer_code && Number(row.customer_code) === Number(customer.omie_code)) ||
			String(row.customer_name || "").toLowerCase() === customer.name.toLowerCase());
	return {
		productCode: code,
		customer: customer ? rows.filter(isCustomer).slice(0, HISTORY_LIMIT).map(format) : [],
		general: rows.slice(0, HISTORY_LIMIT).map(format)
	};
}

module.exports = { customerDefaults, productHistory, HISTORY_LIMIT };
