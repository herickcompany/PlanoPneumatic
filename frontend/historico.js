const sharedShellScript = document.createElement("script");
sharedShellScript.src = "/shared-shell.js";
document.head.appendChild(sharedShellScript);

const sessionKey = "plano-pneumatic-session";
const searchForm = document.querySelector("#search-form");
const historyBody = document.querySelector("#history-body");
const managementPanel = document.querySelector("#management-panel");
const resultCount = document.querySelector("#result-count");

function getSession() { try { return JSON.parse(localStorage.getItem(sessionKey)); } catch { return null; } }
async function api(url, options = {}) {
  const session = getSession();
  if (!session?.token) { window.location.href = "/"; return null; }
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}`, ...(options.headers || {}) } });
  if (response.status === 401) { localStorage.removeItem(sessionKey); window.location.href = "/"; return null; }
  if (!response.ok) { const error = await response.json().catch(() => ({ message: "Nao foi possivel concluir a operacao." })); throw new Error(error.message); }
  return response.status === 204 ? null : response.json();
}
function fillProfile(user) { document.querySelector("#profile-name").textContent = user.name; document.querySelector("#profile-role").textContent = user.role === "admin" ? "Administrador" : user.role; document.querySelector("#profile-initials").textContent = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function statusTone(status) { if (["Aprovado", "Concluido", "Encerrado"].includes(status)) return "green"; if (["Aguardando documento", "Em analise", "Em faturamento"].includes(status)) return "orange"; if (["Improcedente", "Cancelado"].includes(status)) return "red"; return "blue"; }
function renderRows(items) { resultCount.textContent = `${items.length} resultado${items.length === 1 ? "" : "s"}`; historyBody.innerHTML = items.map((item) => `<tr class="history-row" data-case-number="${item.id}"><td><strong>${item.id}</strong></td><td>${item.client}</td><td>${item.type}</td><td><span class="table-status ${statusTone(item.status)}">${item.status}</span></td><td class="muted">${item.updatedAt}</td></tr>`).join("") || `<tr><td colspan="5">Nenhum processo corresponde aos filtros.</td></tr>`; document.querySelectorAll(".history-row").forEach((row) => row.addEventListener("click", () => loadManagement(row.dataset.caseNumber))); }
async function search() { const params = new URLSearchParams(new FormData(searchForm)); Object.keys(Object.fromEntries(params)).forEach((key) => { if (!params.get(key)) params.delete(key); }); try { const data = await api(`/api/cases?${params}`); renderRows(data.cases); } catch (error) { historyBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`; } }
async function loadManagement(caseNumber) { managementPanel.innerHTML = `<p class="muted">Carregando ${caseNumber}...</p>`; try { const data = await api(`/api/cases/${encodeURIComponent(caseNumber)}`); const item = data.case; managementPanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Gerenciar processo</p><h2>${item.id}</h2></div><span class="table-status ${statusTone(item.status)}">${item.status}</span></div><div class="management-summary"><div><small>Cliente</small><strong>${item.client}</strong></div><div><small>Tipo</small><strong>${item.type}</strong></div><div><small>Produto</small><strong>${item.product}</strong></div><div><small>Responsável</small><strong>${item.responsible}</strong></div></div><form id="status-form" class="status-form"><label>Alterar status<select name="status"><option value="${item.status}">${item.status}</option><option>Em analise</option><option>Aguardando documento</option><option>Aprovado</option><option>Improcedente</option><option>Em faturamento</option><option>Processando</option><option>Concluido</option><option>Encerrado</option><option>Cancelado</option></select></label><button class="button button-primary" type="submit">Salvar status <span>→</span></button><p id="status-feedback" class="feedback"></p></form><div class="management-history"><p class="eyebrow">Linha do tempo</p>${item.events.map((event) => `<div class="event"><span>${event.type}</span><div><strong>${event.description}</strong><small>${event.responsible} · ${new Date(event.createdAt).toLocaleString("pt-BR")}</small></div></div>`).join("")}</div>`; document.querySelector("#status-form").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; const feedback = document.querySelector("#status-feedback"); try { await api(`/api/cases/${encodeURIComponent(item.id)}/status`, { method: "PATCH", body: JSON.stringify({ status: form.status.value }) }); feedback.textContent = "Status atualizado e evento registrado."; feedback.className = "feedback success-feedback"; await search(); await loadManagement(item.id); } catch (error) { feedback.textContent = error.message; } }); } catch (error) { managementPanel.innerHTML = `<p class="feedback">${error.message}</p>`; } }

document.querySelector("#logout-button").addEventListener("click", async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch {} localStorage.removeItem(sessionKey); window.location.href = "/"; });
searchForm.addEventListener("submit", (event) => { event.preventDefault(); search(); });
document.querySelector("#clear-filters").addEventListener("click", () => { searchForm.reset(); search(); });
(async function bootstrap() { const data = await api("/api/auth/me"); if (!data) return; fillProfile(data.user); search(); })();
