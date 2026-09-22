(() => {
  const panel = document.querySelector("#management-panel");
  if (!panel || window.__caseManagementReady) return;
  window.__caseManagementReady = true;
  const sessionKey = "plano-pneumatic-session";
  const apiOrigin = window.location.hostname === "planopneumatic-production.up.railway.app" ? "https://planopneumaticapi-production.up.railway.app" : window.location.origin;
  const session = () => { try { return JSON.parse(localStorage.getItem(sessionKey)); } catch { return null; } };
  const api = async (url, options = {}) => {
    const current = session();
    const response = await fetch(new URL(url, apiOrigin), { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${current?.token || ""}`, ...(options.headers || {}) } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "Nao foi possivel concluir a operacao." }))).message);
    return response.status === 204 ? null : response.json();
  };
  const currentCase = () => panel.querySelector("h2")?.textContent.trim();

  async function renderManagement(caseNumber) {
    try {
      const [management, comments, timeline] = await Promise.all([
        api(`/api/cases/${encodeURIComponent(caseNumber)}/management`),
        api(`/api/cases/${encodeURIComponent(caseNumber)}/comments`),
        api(`/api/cases/${encodeURIComponent(caseNumber)}/timeline`)
      ]);
      const section = document.createElement("section");
      section.className = "case-management-tools";
      section.innerHTML = `<div class="case-tool-grid"><article><p class="eyebrow">Timeline completa</p><div class="visual-timeline">${timeline.timeline.map((event) => `<div class="timeline-item"><span></span><div><strong>${event.description}</strong><small>${event.actorName || event.responsible} · ${new Date(event.createdAt).toLocaleString("pt-BR")}</small></div></div>`).join("") || '<p class="muted">Nenhum evento registrado.</p>'}</div></article><article><p class="eyebrow">Checklist</p><div class="case-checklist">${management.checklist.map((item) => `<label><input type="checkbox" data-checklist-id="${item.id}" ${item.completed ? "checked" : ""} /> ${item.label}</label>`).join("") || '<p class="muted">Checklist ainda nao configurado.</p>'}</div><p class="eyebrow tools-label">Documentos</p><div class="case-attachments">${management.attachments.map((item) => `<a href="${item.fileUrl}" target="_blank" rel="noreferrer">${item.fileName}</a>`).join("") || '<p class="muted">Nenhum documento anexado.</p>'}</div></article></div><article class="case-comments"><p class="eyebrow">Comentários internos</p><div class="comment-list">${comments.comments.map((item) => `<div class="comment-item"><strong>${item.authorName}</strong><small>${new Date(item.createdAt).toLocaleString("pt-BR")}</small><p>${item.body}</p></div>`).join("") || '<p class="muted">Nenhum comentario ainda.</p>'}</div><form id="case-comment-form"><textarea name="body" rows="3" placeholder="Adicione um comentario interno..."></textarea><button class="button button-secondary" type="submit">Adicionar comentário</button><p class="feedback" id="case-comment-feedback"></p></form></article>`;
      panel.appendChild(section);
      section.querySelectorAll("[data-checklist-id]").forEach((input) => input.addEventListener("change", async () => {
        try { await api(`/api/cases/${encodeURIComponent(caseNumber)}/checklist/${input.dataset.checklistId}`, { method: "PATCH", body: JSON.stringify({ completed: input.checked }) }); } catch (error) { input.checked = !input.checked; }
      }));
      section.querySelector("#case-comment-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const feedback = section.querySelector("#case-comment-feedback");
        try { await api(`/api/cases/${encodeURIComponent(caseNumber)}/comments`, { method: "POST", body: JSON.stringify({ body: form.body.value }) }); form.reset(); feedback.textContent = "Comentario adicionado."; await renderManagement(caseNumber); } catch (error) { feedback.textContent = error.message; }
      });
    } catch (error) {
      const message = document.createElement("p");
      message.className = "feedback";
      message.textContent = error.message;
      panel.appendChild(message);
    }
  }

  const observer = new MutationObserver(() => {
    const caseNumber = currentCase();
    if (!caseNumber || panel.querySelector(".case-management-tools")) return;
    renderManagement(caseNumber);
  });
  observer.observe(panel, { childList: true, subtree: true });
})();
