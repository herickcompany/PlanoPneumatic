const sharedShellScript = document.createElement("script");
sharedShellScript.src = "/js/shared-shell.js";
document.head.appendChild(sharedShellScript);

const sessionKey = "plano-pneumatic-session";
const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const feedback = document.querySelector("#login-feedback");
const detailModal = document.querySelector("#detail-modal");
const apiOrigin = window.location.hostname === "planopneumatic-production.up.railway.app" ? "https://planopneumaticapi-production.up.railway.app" : window.location.origin;
function apiUrl(url) { return new URL(url, apiOrigin).toString(); }

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(sessionKey);
}

async function apiRequest(url, options = {}) {
  const session = getSession();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const response = await fetch(apiUrl(url), { ...options, headers });
  if (response.status === 401 && session?.token && !url.endsWith("/api/auth/login")) {
    clearSession();
    showLogin();
    throw new Error("Sua sessao expirou. Entre novamente.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Nao foi possivel concluir a solicitacao." }));
    throw new Error(error.message);
  }
  return response.status === 204 ? null : response.json();
}

function showLogin(message = "") {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  feedback.textContent = message;
}

function showApiUnavailable() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  loginView.innerHTML = '<section class="page-error" role="alert"><p class="eyebrow">Serviço indisponível</p><h1>Não foi possível conectar ao sistema.</h1><p>Verifique sua conexão e tente novamente em instantes.</p><button class="button button-primary" type="button" id="retry-api">Tentar novamente</button></section>';
  document.querySelector("#retry-api").addEventListener("click", () => window.location.reload());
}

function showDashboard(user) {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  document.querySelector("#welcome-name").textContent = user.name.split(" ")[0];
  document.querySelector("#profile-name").textContent = user.name;
  document.querySelector("#profile-role").textContent = user.role === "admin" ? "Administrador" : user.role === "manager" ? "Gerente" : user.role;
  document.querySelector("#profile-initials").textContent = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function renderDashboard(data) {
  document.querySelector("#indicator-grid").innerHTML = data.indicators.map((indicator) => `
    <article class="indicator-card ${indicator.tone}">
      <div class="indicator-top"><span>${indicator.label}</span><span class="indicator-mark">${indicator.tone === "red" ? "!" : "↗"}</span></div>
      <strong>${indicator.value}</strong>
      <small>Atualizado agora</small>
    </article>
  `).join("");

  document.querySelector("#cases-body").innerHTML = data.recentCases.map((item) => `
    <tr class="case-row" data-case-number="${item.id}"><td><strong>${item.id}</strong></td><td>${item.client}</td><td>${item.type}</td><td><span class="table-status ${statusTone(item.status)}">${item.status}</span></td><td class="muted">${item.updatedAt}</td></tr>
  `).join("");
  document.querySelectorAll(".case-row").forEach((row) => row.addEventListener("click", () => openCaseDetail(row.dataset.caseNumber)));
  renderInsights(data);
}

function renderInsights(data) {
  document.querySelector("#comparison-grid").innerHTML = `<div><span>Abertos</span><strong>${data.comparison.openCases}</strong></div><div><span>Concluídos</span><strong>${data.comparison.completed}</strong></div>`;
  const maxType = Math.max(...data.byType.map((item) => item.value), 1);
  document.querySelector("#type-chart").innerHTML = data.byType.map((item) => `<div class="distribution-row"><div><strong>${item.label}</strong><span>${item.value}</span></div><i style="width:${Math.max(8, item.value / maxType * 100)}%"></i></div>`).join("") || '<p class="muted">Sem dados no período.</p>';
  const maxEvolution = Math.max(...data.evolution.map((item) => item.total), 1);
  document.querySelector("#evolution-chart").innerHTML = data.evolution.map((item) => `<div class="chart-column" title="${item.date}: ${item.total} processos"><span style="height:${Math.max(8, item.total / maxEvolution * 100)}%"></span><small>${String(item.date).slice(5)}</small></div>`).join("") || '<p class="muted">Sem dados no período.</p>';
  const alertList = document.querySelector("#alert-list");
  document.querySelector("#alert-count").textContent = `${data.alerts.length} alertas`;
  alertList.innerHTML = data.alerts.map((item) => `<button class="alert-row" type="button" data-case-number="${item.id}"><strong>${item.id}</strong><span>${item.client}</span><small>${item.status} · ${item.updatedAt}</small></button>`).join("") || '<p class="muted">Nenhum processo atrasado no período.</p>';
  alertList.querySelectorAll("[data-case-number]").forEach((item) => item.addEventListener("click", () => openCaseDetail(item.dataset.caseNumber)));
}

function dashboardQuery() {
  const form = document.querySelector("#dashboard-filters");
  const params = new URLSearchParams(new FormData(form));
  [...params.keys()].forEach((key) => { if (!params.get(key)) params.delete(key); });
  sessionStorage.setItem("dashboard-filters", JSON.stringify(Object.fromEntries(params)));
  return params.toString() ? `?${params}` : "";
}

function renderAttention(items) {
  const actionList = document.querySelector("#action-list");
  if (!actionList) return;
  actionList.innerHTML = items.slice(0, 5).map((item) => `<li class="action-item" data-case-number="${item.id}"><span class="action-icon ${item.risk === "Alto" ? "red" : "orange"}">${item.risk === "Alto" ? "!" : "◷"}</span><div><strong>${item.id} · ${item.description}</strong><small>${item.client} · ${item.responsible}</small></div><span>→</span></li>`).join("") || `<li class="empty-action">Nenhuma proxima acao no seu escopo.</li>`;
  actionList.querySelectorAll("[data-case-number]").forEach((item) => item.addEventListener("click", () => openCaseDetail(item.dataset.caseNumber)));
}

async function openCaseDetail(caseNumber) {
  const detailContent = document.querySelector("#case-detail-content");
  document.querySelector("#detail-modal-title").textContent = caseNumber;
  detailContent.innerHTML = "<p class=\"muted\">Carregando processo...</p>";
  detailModal.classList.remove("hidden");
  try {
    const data = await apiRequest(`/api/cases/${encodeURIComponent(caseNumber)}`);
    detailContent.innerHTML = `<div class="detail-actions"><button id="edit-dashboard-case" class="button button-secondary" type="button">Editar processo <span>✎</span></button></div><div class="detail-grid"><div><small>Cliente</small><strong>${data.case.client}</strong></div><div><small>Tipo</small><strong>${data.case.type}</strong></div><div><small>Produto</small><strong>${data.case.product}</strong></div><div><small>Código</small><strong>${data.case.productCode}</strong></div><div><small>Quantidade</small><strong>${data.case.quantity}</strong></div><div><small>Responsável</small><strong>${data.case.responsible}</strong></div></div><div class="detail-section"><p class="eyebrow">Histórico</p>${data.case.events.map((event) => `<div class="event"><span>${event.type}</span><div><strong>${event.description}</strong><small>${event.responsible} · ${event.createdAt}</small></div></div>`).join("")}</div>`;
    document.querySelector("#edit-dashboard-case").addEventListener("click", () => window.caseEditor.open(data.case, apiRequest, () => openCaseDetail(caseNumber)));
  } catch (error) {
    detailContent.innerHTML = `<p class="feedback">${error.message}</p>`;
  }
}

async function refreshDashboard() {
  const data = await apiRequest(`/api/dashboard/summary${dashboardQuery()}`);
  renderDashboard(data);
  const pendingData = await apiRequest("/api/pending");
  renderAttention(pendingData.items);
}

function statusTone(status) {
  if (status.includes("Aprovado")) return "green";
  if (status.includes("documento")) return "orange";
  return "blue";
}

async function loadDashboard(user) {
  showDashboard(user);
  try {
    const filterForm = document.querySelector("#dashboard-filters");
    const savedFilters = sessionStorage.getItem("dashboard-filters");
    if (savedFilters) Object.entries(JSON.parse(savedFilters)).forEach(([name, value]) => { if (filterForm.elements[name]) filterForm.elements[name].value = value; });
    if (!filterForm.dataset.bound) {
      filterForm.dataset.bound = "true";
      filterForm.addEventListener("submit", async (event) => { event.preventDefault(); await loadDashboard(user); });
      document.querySelector("#clear-dashboard-filters").addEventListener("click", () => { filterForm.reset(); sessionStorage.removeItem("dashboard-filters"); loadDashboard(user); });
    }
    const data = await apiRequest(`/api/dashboard/summary${dashboardQuery()}`);
    renderDashboard(data);
    const pendingData = await apiRequest("/api/pending");
    renderAttention(pendingData.items);
  } catch (error) {
    if (error.message.includes("API está indisponível")) showApiUnavailable();
    else document.querySelector("#cases-body").innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback.textContent = "";
  const submitButton = loginForm.querySelector("button");
  submitButton.disabled = true;

  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginForm.email.value, password: loginForm.password.value })
    });
    setSession(data);
    await loadDashboard(data.user);
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch {}
  clearSession();
  loginForm.reset();
  showLogin();
});

document.querySelector("#close-detail-modal").addEventListener("click", () => detailModal.classList.add("hidden"));
detailModal.addEventListener("click", (event) => {
  if (event.target === detailModal) detailModal.classList.add("hidden");
});

const pwaInstallBlock = document.querySelector("#pwa-install-block");
const pwaInstallButton = document.querySelector("#pwa-install-button");
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
function refreshInstallBlock() {
  if (isStandalone) return pwaInstallBlock?.classList.add("hidden");
  pwaInstallBlock?.classList.toggle("hidden", !window.__pwaInstallPrompt);
}
refreshInstallBlock();
window.addEventListener("pwa-install-available", refreshInstallBlock);
window.addEventListener("pwa-installed", refreshInstallBlock);
pwaInstallButton?.addEventListener("click", async () => {
  const promptEvent = window.__pwaInstallPrompt;
  if (!promptEvent) return;
  pwaInstallButton.disabled = true;
  promptEvent.prompt();
  await promptEvent.userChoice;
  window.__pwaInstallPrompt = null;
  pwaInstallButton.disabled = false;
  refreshInstallBlock();
});

(async function bootstrap() {
  const session = getSession();
  if (!session?.token) return showLogin();
  try {
    const data = await apiRequest("/api/auth/me");
    await loadDashboard(data.user);
  } catch {}
})();
