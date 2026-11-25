const sharedShellScript = document.createElement("script");
sharedShellScript.src = "/js/shared-shell.js";
document.head.appendChild(sharedShellScript);

(async () => {
	const PP = window.PP;
	const { esc, api } = PP;
	const page = document.querySelector("[data-process-type]");
	const processType = page.dataset.processType;
	const form = document.querySelector("#process-form");
	const feedback = document.querySelector("#process-feedback");
	const draftKey = `pp-draft:${processType}`;

	const config = {
		"Pedido de venda": {
			title: "Novo pedido de venda",
			eyebrow: "Etapa 2 · Comercial",
			description: "Valide os dados comerciais antes de encaminhar para faturamento ou operação.",
			submit: "Salvar pedido",
			fields: ["documentReference", "salesRepresentative", "paymentTerms"]
		},
		"Base de troca": {
			title: "Nova base de troca",
			eyebrow: "Etapa 2 · Operação",
			description: "Registre a origem, condição e justificativa do item que será trocado.",
			submit: "Salvar troca",
			fields: ["exchangeReason", "itemCondition", "documentReference", "originOrder", "trackingCode", "serialNumber", "lotNumber"]
		},
		Garantia: {
			title: "Nova garantia",
			eyebrow: "Etapa 2 · Técnico",
			description: "Registre o recebimento da peça e encaminhe o caso para análise técnica.",
			submit: "Salvar garantia",
			fields: ["receivedAt", "documentReference", "defectDescription", "riskLevel", "serialNumber", "lotNumber"]
		}
	}[processType];

	const text = (name, label, placeholder = "", extra = "") =>
		`<label>${label}<input name="${name}" type="text" placeholder="${placeholder}" ${extra} /></label>`;
	const select = (name, label, values, required) =>
		`<label>${label}${required ? " *" : ""}<select name="${name}" ${required ? "required" : ""}><option value="">Selecione</option>${values.map((value) => `<option>${esc(value)}</option>`).join("")}</select></label>`;
	let meta;
	const fieldHtml = {
		documentReference: () => text("documentReference", processType === "Garantia" ? "Documento de entrada" : "Documento de origem", "Nota fiscal ou pedido"),
		salesRepresentative: () => text("salesRepresentative", "Vendedor", "Puxado do Omie ao escolher o cliente"),
		unitPrice: () => `<label>Valor unitário<input name="unitPrice" type="text" inputmode="decimal" placeholder="0,00" /></label>`,
		paymentTerms: () => text("paymentTerms", "Prazo (condição de pagamento)", "Ex.: Para 28 dias"),
		salesChannel: () => text("salesChannel", "Canal de venda", "Ex.: Comercial"),
		exchangeReason: () => select("exchangeReason", "Motivo da troca", meta.exchangeReasons, true),
		itemCondition: () => select("itemCondition", "Condição do item", meta.itemConditions, true),
		originOrder: () => text("originOrder", "Pedido de origem", "Número do pedido"),
		trackingCode: () => text("trackingCode", "Código de rastreio", "Código de retorno"),
		receivedAt: () => `<label>Data de recebimento<input name="receivedAt" type="date" max="${new Date().toISOString().slice(0, 10)}" /></label>`,
		defectDescription: () =>
			`<label class="wide-field">Defeito ou motivo relatado<textarea name="defectDescription" rows="3" placeholder="Descreva o problema informado"></textarea></label>`,
		riskLevel: () =>
			`<label>Nível de risco<select name="riskLevel"><option value="">Normal</option>${meta.riskLevels
				.filter((level) => level !== "Normal")
				.map((level) => `<option>${esc(level)}</option>`)
				.join("")}</select></label>`,
		serialNumber: () => text("serialNumber", "Nº de série", "Opcional"),
		lotNumber: () => text("lotNumber", "Lote", "Opcional")
	};

	const moneyInput = (value) => Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

	// ---- Itens do pedido de venda ----------------------------------------------------
	// Tabela unica de itens: codigo <-> descricao se completam pelo cadastro, observacao por item,
	// marcacao de "base de troca" (gera a divida da carcaca) e historico de venda do produto.
	const isOrder = processType === "Pedido de venda";
	const productCache = new Map();
	let activeRow = null;
	let historyRequest = 0;

	function rememberProducts(products) {
		for (const product of products) {
			productCache.set(`c:${product.code.toLowerCase()}`, product);
			productCache.set(`d:${product.description.toLowerCase()}`, product);
		}
	}

	function setupOrderLayout() {
		if (!isOrder) return;
		// Produto, codigo e quantidade ficam so na tabela de itens.
		for (const name of ["product", "productCode", "quantity"]) form.elements[name]?.closest("label")?.remove();
		const identification = form.client.closest("section");
		identification.querySelector("h2").textContent = "Dados do cliente";
		const notes = form.notes.closest("label");
		const notesSection = notes.closest("section");
		notesSection.querySelector("h2").textContent = "Nota fiscal e observações";
		notes.insertAdjacentHTML(
			"beforebegin",
			'<label>Informações para constar na nota fiscal<textarea name="invoiceNotes" rows="3" maxlength="2000" placeholder="Ex.: pedido de compra do cliente, placa do veículo, dados para a NF"></textarea></label>'
		);
	}

	function addItemsBlock() {
		if (!isOrder) return;
		const section = document.createElement("section");
		section.className = "triage-section";
		section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">02b · Itens e valores</p><h2>Produtos do pedido</h2></div><button class="button button-secondary compact-button" type="button" id="add-item">+ Adicionar item</button></div>
			<div class="table-wrap"><table class="items-table order-items" aria-label="Itens do pedido"><thead><tr><th>Código *</th><th>Descrição *</th><th>Qtd *</th><th>Unitário (R$)</th><th>Observação do item</th><th>Base de troca</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody id="items-body"></tbody></table></div>
			<p class="items-total" id="items-total" aria-live="polite"></p>
			<div class="sales-history" id="sales-history" hidden></div>
			<datalist id="item-code-options"></datalist><datalist id="item-description-options"></datalist>`;
		document.querySelector("#special-fields").closest("section").after(section);
		const body = section.querySelector("#items-body");
		const codeList = section.querySelector("#item-code-options");
		const descriptionList = section.querySelector("#item-description-options");

		const search = PP.debounce(async (term, kind) => {
			if (term.trim().length < 2) return;
			try {
				const { products } = await api.get(`/api/products?q=${encodeURIComponent(term.trim())}&limit=10`);
				rememberProducts(products);
				if (kind === "code")
					codeList.innerHTML = products.map((product) => `<option value="${esc(product.code)}">${esc(product.description)}</option>`).join("");
				else descriptionList.innerHTML = products.map((product) => `<option value="${esc(product.description)}">${esc(product.code)}</option>`).join("");
			} catch {
				/* autocomplete e opcional */
			}
		});

		const addRow = (values = {}) => {
			const row = document.createElement("tr");
			const price = values.unitPrice === undefined || values.unitPrice === null || values.unitPrice === "" ? "" : moneyInput(values.unitPrice);
			row.innerHTML = `<td><input data-item="productCode" list="item-code-options" autocomplete="off" aria-label="Código do item" value="${esc(values.productCode || "")}" /></td>
				<td><input data-item="description" list="item-description-options" autocomplete="off" aria-label="Descrição do item" value="${esc(values.description || "")}" /></td>
				<td><input data-item="quantity" type="number" min="1" aria-label="Quantidade" value="${esc(values.quantity || 1)}" /></td>
				<td><input data-item="unitPrice" inputmode="decimal" aria-label="Valor unitário" placeholder="0,00" value="${esc(price)}" /></td>
				<td><input data-item="notes" maxlength="500" aria-label="Observação do item" placeholder="Opcional" value="${esc(values.notes || "")}" /></td>
				<td class="center-cell"><input data-item="carcass" type="checkbox" aria-label="Base de troca (cliente devolve a carcaça)" ${values.carcass ? "checked" : ""} /></td>
				<td class="actions-cell"><button class="button button-secondary compact-button" type="button" data-history>Histórico</button><button class="button button-secondary compact-button" type="button" data-remove aria-label="Remover item">×</button></td>`;
			const field = (name) => row.querySelector(`[data-item="${name}"]`);
			const fill = (product, from) => {
				if (!product) return;
				if (from === "code") field("description").value = product.description;
				else field("productCode").value = product.code;
				if (product.remanufactured) field("carcass").checked = true;
				showHistory(row);
				updateTotal();
				saveDraftSoon();
			};
			field("productCode").addEventListener("input", (event) => search(event.target.value, "code"));
			field("description").addEventListener("input", (event) => search(event.target.value, "description"));
			field("productCode").addEventListener("change", (event) => fill(productCache.get(`c:${event.target.value.trim().toLowerCase()}`), "code"));
			field("description").addEventListener("change", (event) => fill(productCache.get(`d:${event.target.value.trim().toLowerCase()}`), "description"));
			row.addEventListener("focusin", () => {
				activeRow = row;
			});
			row.querySelector("[data-history]").addEventListener("click", () => showHistory(row));
			row.querySelector("[data-remove]").addEventListener("click", () => {
				if (body.children.length === 1) {
					row
						.querySelectorAll("input")
						.forEach((input) => (input.type === "checkbox" ? (input.checked = false) : (input.value = input.dataset.item === "quantity" ? 1 : "")));
				} else row.remove();
				if (activeRow === row) document.querySelector("#sales-history").hidden = true;
				updateTotal();
				saveDraftSoon();
			});
			PP.bindMoneyInput(field("unitPrice"));
			body.appendChild(row);
			return row;
		};
		section.querySelector("#add-item").addEventListener("click", () => addRow().querySelector("input").focus());
		body.addEventListener("input", updateTotal);
		body.addEventListener("change", saveDraftSoon);
		window.__addItemRow = addRow;
		window.__clearItemRows = () => body.replaceChildren();
		addRow();
	}

	// Historico de venda do produto da linha: para o cliente do pedido e no geral.
	async function showHistory(row) {
		const panel = document.querySelector("#sales-history");
		const code = row.querySelector('[data-item="productCode"]').value.trim();
		activeRow = row;
		if (!code) {
			panel.hidden = true;
			return;
		}
		const request = ++historyRequest;
		panel.hidden = false;
		panel.innerHTML = `<p class="muted">Buscando histórico de venda de ${esc(code)}…</p>`;
		try {
			const customer = form.dataset.customerId ? `&customerId=${encodeURIComponent(form.dataset.customerId)}` : "";
			const history = await api.get(`/api/products/sales-history?code=${encodeURIComponent(code)}${customer}`);
			if (request !== historyRequest) return;
			const list = (rows, withCustomer) =>
				rows.length
					? `<ol class="history-list">${rows
							.map(
								(sale) =>
									`<li><span>${esc(sale.date ? new Date(`${sale.date}T12:00:00`).toLocaleDateString("pt-BR") : "—")}${withCustomer ? ` · ${esc(sale.customerName || "")}` : ""} · ${esc(sale.quantity)} un · <small class="muted">${esc(sale.source)} ${esc(sale.document || "")}</small></span><button type="button" class="link-button" data-use-price="${esc(sale.unitPrice)}" title="Usar este valor no item">${esc(PP.money(sale.unitPrice))}</button></li>`
							)
							.join("")}</ol>`
					: '<p class="muted">Sem vendas registradas.</p>';
			panel.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Histórico de venda</p><h3>${esc(code)}${history.general.length ? ` · últimas ${esc(history.general.length)} vendas` : ""}</h3></div><button type="button" class="close-button" data-close-history aria-label="Fechar histórico">×</button></div>
				<div class="history-columns"><div><strong>${form.dataset.customerId ? `Para ${esc(form.client.value)}` : "Para este cliente"}</strong>${form.dataset.customerId ? list(history.customer, false) : '<p class="muted">Escolha um cliente cadastrado para ver os preços praticados com ele.</p>'}</div><div><strong>Geral (todos os clientes)</strong>${list(history.general, true)}</div></div>
				<p class="muted">Clique no valor para usar no item.</p>`;
			panel.querySelector("[data-close-history]").addEventListener("click", () => (panel.hidden = true));
			panel.querySelectorAll("[data-use-price]").forEach((button) =>
				button.addEventListener("click", () => {
					const input = activeRow?.querySelector('[data-item="unitPrice"]');
					if (!input) return;
					input.value = moneyInput(Number(button.dataset.usePrice));
					updateTotal();
					saveDraftSoon();
				})
			);
		} catch (error) {
			if (request === historyRequest) panel.innerHTML = `<p class="feedback">${esc(error.message)}</p>`;
		}
	}

	function readItems() {
		return [...document.querySelectorAll("#items-body tr")]
			.map((row) => {
				const value = (name) => row.querySelector(`[data-item="${name}"]`).value;
				const price = PP.parseMoney(value("unitPrice"));
				const notes = value("notes").trim();
				return {
					productCode: value("productCode").trim(),
					description: value("description").trim(),
					quantity: Number(value("quantity")),
					...(Number.isFinite(price) ? { unitPrice: price } : {}),
					...(notes ? { notes } : {}),
					...(row.querySelector('[data-item="carcass"]').checked ? { carcass: true } : {})
				};
			})
			.filter((item) => item.productCode || item.description);
	}
	function updateTotal() {
		const total = document.querySelector("#items-total");
		if (!total) return;
		const sum = readItems().reduce((acc, item) => acc + (item.quantity || 0) * (item.unitPrice || 0), 0);
		total.textContent = `Total do pedido: ${PP.money(sum)}`;
	}

	// Vendedor e prazo padrao do cliente (Omie > ultimo pedido > representante).
	const autoFilled = {};
	async function loadSalesDefaults() {
		if (!isOrder || !form.dataset.customerId) return;
		try {
			const defaults = await api.get(`/api/customers/${encodeURIComponent(form.dataset.customerId)}/sales-defaults`);
			const filled = [];
			for (const [name, value] of [
				["salesRepresentative", defaults.seller],
				["paymentTerms", defaults.paymentTerms]
			]) {
				const input = form.elements[name];
				if (!input || !value) continue;
				if (!input.value.trim() || input.value === autoFilled[name]) {
					input.value = value;
					autoFilled[name] = value;
					filled.push(name === "salesRepresentative" ? "vendedor" : "prazo");
				}
			}
			const source = Object.values(defaults.sources || {}).some((origin) => String(origin).startsWith("omie")) ? "do Omie" : "do histórico do cliente";
			const note = document.querySelector("#defaults-note");
			const what = filled.length === 2 ? "Vendedor e prazo preenchidos" : filled[0] === "vendedor" ? "Vendedor preenchido" : "Prazo preenchido";
			if (note) note.textContent = filled.length ? `${what} automaticamente ${source}. Pode alterar se precisar.` : "";
			saveDraftSoon();
		} catch {
			/* opcional */
		}
	}

	// ---- Autopreenchimento a partir do cadastro (F3 / usabilidade) -----------------
	function bindRegistry() {
		const customerList = Object.assign(document.createElement("datalist"), { id: "customer-options" });
		const productList = Object.assign(document.createElement("datalist"), { id: "product-options" });
		document.body.append(customerList, productList);
		let customers = [];
		let products = [];
		form.client.setAttribute("list", "customer-options");
		form.client.setAttribute("autocomplete", "off");
		form.productCode?.setAttribute("list", "product-options");
		form.productCode?.setAttribute("autocomplete", "off");
		const searchCustomers = PP.debounce(async () => {
			if (form.client.value.trim().length < 2) return;
			try {
				customers = (await api.get(`/api/customers?q=${encodeURIComponent(form.client.value.trim())}&limit=8`)).customers;
				customerList.innerHTML = customers
					.map((customer) => `<option value="${esc(customer.name)}">${esc(PP.maskDocument(customer.document || ""))}</option>`)
					.join("");
			} catch {
				/* autocomplete e opcional */
			}
		});
		const searchProducts = PP.debounce(async () => {
			if (form.productCode.value.trim().length < 2) return;
			try {
				products = (await api.get(`/api/products?q=${encodeURIComponent(form.productCode.value.trim())}&limit=8`)).products;
				productList.innerHTML = products.map((product) => `<option value="${esc(product.code)}">${esc(product.description)}</option>`).join("");
			} catch {
				/* opcional */
			}
		});
		form.client.addEventListener("input", searchCustomers);
		form.productCode?.addEventListener("input", searchProducts);
		form.client.addEventListener("change", () => {
			const match = customers.find((customer) => customer.name === form.client.value);
			if (match?.document && !form.clientDocument.value) {
				form.clientDocument.value = PP.formatDocument(match.document);
			}
			if (match) form.dataset.customerId = match.id;
			else delete form.dataset.customerId;
			loadSalesDefaults();
		});
		form.productCode?.addEventListener("change", () => {
			const match = products.find((product) => product.code === form.productCode.value);
			if (match && !form.product.value) form.product.value = match.description;
			if (match) form.dataset.productId = match.id;
			else delete form.dataset.productId;
		});
	}

	// ---- Consulta ao Omie (pedido para vendas; nota fiscal para troca/garantia) --------
	async function bindOmieLookup() {
		const status = await api.get("/api/omie/status").catch(() => ({ configured: false }));
		const input = form.documentReference;
		if (!status.configured || !input) return;
		const button = document.createElement("button");
		button.type = "button";
		button.className = "button button-secondary compact-button";
		button.classList.add("align-end-button");
		button.textContent = isOrder ? "Buscar pedido no Omie" : "Validar NF no Omie";
		input.closest("label").after(button);
		button.addEventListener("click", async () => {
			const number = input.value.trim();
			if (!number) return PP.setFieldError(input, isOrder ? "Informe o número do pedido." : "Informe o número da nota fiscal.");
			button.disabled = true;
			try {
				if (isOrder) {
					const { order } = await api.get(`/api/omie/orders/${encodeURIComponent(number)}`);
					if (order.customer) {
						form.client.value = order.customer.name;
						if (order.customer.document) form.clientDocument.value = PP.formatDocument(order.customer.document);
						if (order.customer.id) form.dataset.customerId = order.customer.id;
					}
					if (order.items.length) {
						window.__clearItemRows?.();
						order.items.forEach((item) => window.__addItemRow?.(item));
					}
					updateTotal();
					loadSalesDefaults();
					form.dataset.omieOrder = order.orderNumber;
					PP.toast(`Pedido ${order.orderNumber} importado do Omie (${order.items.length} item(ns)).`, "success");
				} else {
					const { invoice } = await api.get(`/api/omie/invoices/${encodeURIComponent(number)}`);
					if (invoice.customer.name && !form.client.value) form.client.value = invoice.customer.name;
					if (invoice.customer.document && !form.clientDocument.value) form.clientDocument.value = PP.formatDocument(invoice.customer.document);
					PP.toast(`NF ${invoice.number} encontrada no Omie (${invoice.customer.name || "destinatário"}, emitida em ${invoice.emittedAt || "—"}).`, "success");
				}
				PP.setFieldError(input, "");
				saveDraftSoon();
			} catch (error) {
				PP.setFieldError(input, error.message);
			} finally {
				button.disabled = false;
			}
		});
	}

	// ---- Rascunho ------------------------------------------------------------------
	const readForm = () => {
		const values = {};
		for (const element of form.elements) if (element.name && element.type !== "submit") values[element.name] = element.value;
		return { values, items: readItems(), savedAt: new Date().toISOString() };
	};
	const saveDraft = () => {
		const draft = readForm();
		const meaningful = Object.entries(draft.values).some(([name, value]) => value && !(name === "quantity" && value === "1")) || draft.items.length;
		try {
			if (meaningful) localStorage.setItem(draftKey, JSON.stringify(draft));
			else localStorage.removeItem(draftKey);
		} catch {
			/* armazenamento indisponivel */
		}
	};
	const saveDraftSoon = PP.debounce(saveDraft, 400);
	function restoreDraft(draft) {
		for (const [name, value] of Object.entries(draft.values)) if (form.elements[name]) form.elements[name].value = value;
		if (draft.items?.length) {
			window.__clearItemRows?.();
			draft.items.forEach((item) => window.__addItemRow?.(item));
		}
		updateTotal();
	}
	function offerDraft() {
		let draft;
		try {
			draft = JSON.parse(localStorage.getItem(draftKey));
		} catch {
			draft = null;
		}
		if (!draft) return;
		const banner = document.createElement("div");
		banner.className = "draft-banner";
		banner.innerHTML = `<span>Há um rascunho salvo em ${esc(PP.formatDateTime(draft.savedAt))}.</span><span><button type="button" class="button button-secondary compact-button" data-restore>Restaurar</button> <button type="button" class="button button-secondary compact-button" data-discard>Descartar</button></span>`;
		form.before(banner);
		banner.querySelector("[data-restore]").addEventListener("click", () => {
			restoreDraft(draft);
			banner.remove();
		});
		banner.querySelector("[data-discard]").addEventListener("click", () => {
			localStorage.removeItem(draftKey);
			banner.remove();
		});
	}

	// ---- Envio ---------------------------------------------------------------------
	function buildPayload() {
		const value = (name) => (form.elements[name] ? form.elements[name].value.trim() : "");
		const orderItems = isOrder ? readItems() : [];
		const first = orderItems[0] || {};
		const payload = isOrder
			? { type: processType, client: value("client"), product: first.description || "", productCode: first.productCode || "", quantity: first.quantity || 1 }
			: { type: processType, client: value("client"), product: value("product"), productCode: value("productCode"), quantity: Number(form.quantity.value) };
		for (const name of ["clientDocument", "notes", ...(isOrder ? ["invoiceNotes"] : []), ...config.fields]) {
			const raw = value(name);
			if (raw === "") continue;
			payload[name] = name === "unitPrice" ? PP.parseMoney(raw) : raw;
		}
		if (form.dataset.customerId) payload.customerId = Number(form.dataset.customerId);
		if (form.dataset.productId) payload.productId = Number(form.dataset.productId);
		if (form.dataset.omieOrder && form.dataset.omieOrder === payload.documentReference) payload.omieOrderNumber = form.dataset.omieOrder;
		if (isOrder) {
			payload.items = orderItems;
			if (first.unitPrice !== undefined) payload.unitPrice = first.unitPrice;
		}
		return payload;
	}

	function validateClient() {
		let valid = true;
		PP.clearFieldErrors(form);
		if (form.clientDocument.value && !PP.isValidDocument(form.clientDocument.value)) {
			PP.setFieldError(form.clientDocument, "CPF ou CNPJ inválido.");
			valid = false;
		}
		for (const element of form.elements) {
			if (element.required && !String(element.value).trim()) {
				PP.setFieldError(element, "Campo obrigatório.");
				valid = false;
			}
		}
		if (isOrder) {
			const rows = [...document.querySelectorAll("#items-body tr")];
			const filled = rows.filter((row) => ["productCode", "description"].some((name) => row.querySelector(`[data-item="${name}"]`).value.trim()));
			if (!filled.length) {
				PP.setFieldError(rows[0].querySelector('[data-item="productCode"]'), "Informe ao menos um item.");
				valid = false;
			}
			for (const row of filled) {
				for (const name of ["productCode", "description"]) {
					const input = row.querySelector(`[data-item="${name}"]`);
					if (!input.value.trim()) {
						PP.setFieldError(input, "Obrigatório.");
						valid = false;
					}
				}
				const quantity = row.querySelector('[data-item="quantity"]');
				if (!(Number(quantity.value) >= 1)) {
					PP.setFieldError(quantity, "Mínimo 1.");
					valid = false;
				}
			}
		}
		if (!valid) form.querySelector("[aria-invalid]")?.focus();
		return valid;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		feedback.textContent = "";
		if (!validateClient()) return;
		const button = form.querySelector("button[type=submit]");
		button.disabled = true;
		try {
			const result = await api.post("/api/cases", buildPayload());
			localStorage.removeItem(draftKey);
			window.location.href = `/caso.html?id=${encodeURIComponent(result.case.id)}&created=1`;
		} catch (error) {
			if (error.status === 0) {
				PP.outbox.add(buildPayload());
				localStorage.removeItem(draftKey);
				PP.toast("Sem conexão. O processo foi guardado e será enviado quando a internet voltar.", "info");
				form.reset();
			} else if (!PP.applyServerErrors(form, error)) feedback.textContent = error.message;
			else feedback.textContent = "Corrija os campos destacados.";
		} finally {
			button.disabled = false;
		}
	});
	form.addEventListener("input", saveDraftSoon);

	try {
		const user = await PP.requireUser();
		if (!user) return;
		PP.fillProfile(user);
		PP.bindLogout();
		meta = await PP.meta();
		document.querySelector("#process-title").textContent = config.title;
		document.querySelector("#process-eyebrow").textContent = config.eyebrow;
		document.querySelector("#process-description").textContent = config.description;
		document.querySelector("#submit-label").textContent = config.submit;
		setupOrderLayout();
		document.querySelector("#special-fields").innerHTML = config.fields.map((name) => fieldHtml[name]()).join("");
		if (isOrder) document.querySelector("#special-fields").insertAdjacentHTML("afterend", '<p class="muted" id="defaults-note" aria-live="polite"></p>');
		PP.bindDocumentInput(form.clientDocument);
		if (form.unitPrice) PP.bindMoneyInput(form.unitPrice);
		addItemsBlock();
		bindOmieLookup();
		bindRegistry();
		form.addEventListener("input", updateTotal);
		offerDraft();
		window.PPShellTools?.mount();
	} catch (error) {
		feedback.textContent = error.message;
	}
})();
