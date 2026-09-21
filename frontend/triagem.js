const sharedShellScript = document.createElement("script");
sharedShellScript.src = "/shared-shell.js";
document.head.appendChild(sharedShellScript);

const sessionKey = "plano-pneumatic-session";
const form = document.querySelector("#triage-form");
const feedback = document.querySelector("#triage-feedback");
const nextButton = document.querySelector("#triage-next");
const backButton = document.querySelector("#triage-back");
const submitButton = document.querySelector("#triage-submit");
const apiOrigin = window.location.hostname === "planopneumatic-production.up.railway.app" ? "https://planopneumaticapi-production.up.railway.app" : window.location.origin;
function apiUrl(url) { return new URL(url, apiOrigin).toString(); }
let currentStage = 1;

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

async function apiRequest(url, options = {}) {
  const session = getSession();
  if (!session?.token) {
    window.location.href = "/";
    return null;
  }
  const response = await fetch(apiUrl(url), {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}`, ...(options.headers || {}) }
  });
  if (response.status === 401) {
    localStorage.removeItem(sessionKey);
    window.location.href = "/";
    return null;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Nao foi possivel salvar a triagem." }));
    throw new Error(error.message);
  }
  return response.status === 204 ? null : response.json();
}

function fillProfile(user) {
  document.querySelector("#profile-name").textContent = user.name;
  document.querySelector("#profile-role").textContent = user.role === "admin" ? "Administrador" : user.role;
  document.querySelector("#profile-initials").textContent = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

async function loadUser() {
  const data = await apiRequest("/api/auth/me");
  if (data) fillProfile(data.user);
}

function updateSummary() {
  const type = form.type.value;
  document.querySelector("#summary-type").textContent = type || "Tipo não definido";
  document.querySelector("#summary-client").textContent = form.client.value || "Aguardando preenchimento";
  document.querySelector("#summary-product").textContent = form.product.value || "Aguardando preenchimento";
  document.querySelector("#summary-code").textContent = form.productCode.value || "Aguardando preenchimento";
  document.querySelector("#summary-quantity").textContent = `${form.quantity.value || 1} unidade${Number(form.quantity.value) === 1 ? "" : "s"}`;
  document.querySelector("#summary-stage").textContent = currentStage === 1 ? "Triagem em andamento" : currentStage === 2 ? "Validação em andamento" : "Pronto para encaminhar";
  document.querySelector("#summary-next-text").textContent = currentStage === 1 ? "Confirme os dados básicos para validar o cadastro." : currentStage === 2 ? "Confira cliente e produto antes de continuar." : "Salve o cadastro para encaminhar à área responsável.";
}

function setStage(stage) {
  currentStage = stage;
  document.querySelectorAll("[data-triage-stage]").forEach((section) => {
    const visible = Number(section.dataset.triageStage) === stage;
    section.classList.toggle("hidden", !visible);
    section.querySelectorAll("input, select, textarea").forEach((field) => { field.disabled = field.name !== "type" && !visible; });
  });
  document.querySelectorAll("[data-flow-step]").forEach((step) => step.classList.toggle("active", Number(step.dataset.flowStep) === stage));
  backButton.classList.toggle("hidden", stage === 1);
  nextButton.classList.toggle("hidden", stage === 3);
  submitButton.classList.toggle("hidden", stage !== 3);
  document.querySelector(".triage-content .topbar .eyebrow").textContent = `Etapa ${stage} · ${stage === 1 ? "Entrada do processo" : stage === 2 ? "Conferência dos dados" : "Encaminhamento"}`;
  updateSummary();
}

function validateStage() {
  const fields = [...document.querySelectorAll(`[data-triage-stage="${currentStage}"] input, [data-triage-stage="${currentStage}"] select, [data-triage-stage="${currentStage}"] textarea`)];
  return fields.every((field) => field.disabled || field.reportValidity());
}

form.addEventListener("input", updateSummary);
nextButton.addEventListener("click", () => { feedback.textContent = ""; if (validateStage()) setStage(currentStage + 1); });
backButton.addEventListener("click", () => { feedback.textContent = ""; setStage(currentStage - 1); });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback.textContent = "";
  if (!validateStage()) return;
  submitButton.disabled = true;
  try {
    const data = await apiRequest("/api/cases", {
      method: "POST",
      body: JSON.stringify({
        type: form.type.value,
        client: form.client.value,
        clientDocument: form.clientDocument.value,
        product: form.product.value,
        productCode: form.productCode.value,
        quantity: Number(form.quantity.value),
        documentReference: form.documentReference.value,
        notes: form.notes.value
      })
    });
    window.location.href = `/?created=${encodeURIComponent(data.case.id)}`;
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch {}
  localStorage.removeItem(sessionKey);
  window.location.href = "/";
});

setStage(1);
loadUser().catch(() => { window.location.href = "/"; });
