const sharedShellScript = document.createElement("script");
sharedShellScript.src = "/js/shared-shell.js";
document.head.appendChild(sharedShellScript);

const sessionKey = "plano-pneumatic-session";
const page = document.querySelector("[data-process-type]");
const processType = page.dataset.processType;
const apiOrigin = window.location.hostname === "planopneumatic-production.up.railway.app" ? "https://planopneumaticapi-production.up.railway.app" : window.location.origin;
function apiUrl(url) { return new URL(url, apiOrigin).toString(); }
const config = {
  "Pedido de venda": { title: "Novo pedido de venda", eyebrow: "Etapa 2 · Comercial", description: "Valide os dados comerciais antes de encaminhar para faturamento ou operação.", submit: "Salvar pedido", fields: ["salesRepresentative", "unitPrice", "paymentTerms", "salesChannel"] },
  "Base de troca": { title: "Nova base de troca", eyebrow: "Etapa 2 · Operação", description: "Registre a origem, condição e justificativa do item que será trocado.", submit: "Salvar troca", fields: ["exchangeReason", "itemCondition", "originOrder", "trackingCode"] },
  Garantia: { title: "Nova garantia", eyebrow: "Etapa 2 · Técnico", description: "Registre o recebimento da peça e encaminhe o caso para análise técnica.", submit: "Salvar garantia", fields: ["receivedAt", "documentReference", "defectDescription", "riskLevel"] }
}[processType];

function getSession() { try { return JSON.parse(localStorage.getItem(sessionKey)); } catch { return null; } }
async function apiRequest(url, options = {}) {
  const session = getSession();
  if (!session?.token) { window.location.href = "/"; return null; }
  const response = await fetch(apiUrl(url), { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}`, ...(options.headers || {}) } });
  if (response.status === 401) { localStorage.removeItem(sessionKey); window.location.href = "/"; return null; }
  if (!response.ok) { const error = await response.json().catch(() => ({ message: "Nao foi possivel concluir o processo." })); throw new Error(error.message); }
  return response.json();
}

function fillProfile(user) { document.querySelector("#profile-name").textContent = user.name; document.querySelector("#profile-role").textContent = user.role === "admin" ? "Administrador" : user.role; document.querySelector("#profile-initials").textContent = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function field(name, label, type = "text", placeholder = "") { return `<label>${label}<input name="${name}" type="${type}" placeholder="${placeholder}" ${["client", "product", "productCode"].includes(name) ? "required" : ""} /></label>`; }
function renderSpecialFields() {
  const fields = {
    salesRepresentative: field("salesRepresentative", "Vendedor responsável", "text", "Nome do vendedor"),
    unitPrice: field("unitPrice", "Valor unitário", "number", "0,00"),
    paymentTerms: field("paymentTerms", "Condição de pagamento", "text", "Ex.: 28 dias"),
    salesChannel: field("salesChannel", "Canal de venda", "text", "Ex.: Comercial"),
    exchangeReason: `<label>Motivo da troca<select name="exchangeReason" required><option value="">Selecione</option><option>Defeito de fabricação</option><option>Erro de pedido</option><option>Dano no transporte</option><option>Divergência de entrega</option></select></label>`,
    itemCondition: `<label>Condição do item<select name="itemCondition" required><option value="">Selecione</option><option>Perfeito estado</option><option>Dano leve</option><option>Dano moderado</option><option>Dano grave</option></select></label>`,
    originOrder: field("originOrder", "Pedido de origem", "text", "Número do pedido"),
    trackingCode: field("trackingCode", "Código de rastreio", "text", "Código de retorno"),
    receivedAt: field("receivedAt", "Data de recebimento", "date"),
    documentReference: field("documentReference", "Documento de entrada", "text", "Nota fiscal ou pedido"),
    defectDescription: `<label class="wide-field">Defeito ou motivo relatado<textarea name="defectDescription" rows="3" placeholder="Descreva o problema informado"></textarea></label>`,
    riskLevel: `<label>Nível de risco<select name="riskLevel"><option>Normal</option><option>Atenção</option><option>Alto</option></select></label>`
  };
  document.querySelector("#special-fields").innerHTML = config.fields.map((name) => fields[name]).join("");
}

async function bootstrap() {
  const data = await apiRequest("/api/auth/me");
  if (!data) return;
  fillProfile(data.user); renderSpecialFields();
  document.querySelector("#process-title").textContent = config.title; document.querySelector("#process-eyebrow").textContent = config.eyebrow; document.querySelector("#process-description").textContent = config.description; document.querySelector("#submit-label").textContent = config.submit;
}

document.querySelector("#process-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget; if (!form.reportValidity()) return;
  const button = form.querySelector("button[type=submit]"); const feedback = document.querySelector("#process-feedback"); button.disabled = true; feedback.textContent = "";
  try {
    const data = await apiRequest("/api/cases", { method: "POST", body: JSON.stringify({ client: form.client.value, clientDocument: form.clientDocument.value, product: form.product.value, productCode: form.productCode.value, quantity: Number(form.quantity.value), type: processType, documentReference: form.documentReference?.value || "", notes: form.notes.value }) });
    window.location.href = `/?created=${encodeURIComponent(data.case.id)}`;
  } catch (error) { feedback.textContent = error.message; } finally { button.disabled = false; }
});
document.querySelector("#logout-button").addEventListener("click", async () => { try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch {} localStorage.removeItem(sessionKey); window.location.href = "/"; });
bootstrap().catch(() => { window.location.href = "/"; });
