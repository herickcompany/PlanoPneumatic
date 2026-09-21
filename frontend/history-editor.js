(() => {
  const sessionKey = "plano-pneumatic-session";
  const managementPanel = document.querySelector("#management-panel");
  if (!managementPanel) return;

  function session() {
    try { return JSON.parse(localStorage.getItem(sessionKey)); } catch { return null; }
  }

  async function request(url, options = {}) {
    const current = session();
    if (!current?.token) { window.location.href = "/"; return null; }
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${current.token}`, ...(options.headers || {}) } });
    if (response.status === 401) { localStorage.removeItem(sessionKey); window.location.href = "/"; return null; }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Nao foi possivel concluir a operacao." }));
      throw new Error(error.message);
    }
    return response.status === 204 ? null : response.json();
  }

  const observer = new MutationObserver(() => {
    const heading = managementPanel.querySelector(".panel-heading");
    const title = heading?.querySelector("h2")?.textContent.trim();
    if (!heading || !title || heading.querySelector("[data-edit-history-case]")) return;
    const button = document.createElement("button");
    button.className = "button button-secondary compact-button";
    button.type = "button";
    button.dataset.editHistoryCase = "true";
    button.textContent = "Editar";
    heading.appendChild(button);
    button.addEventListener("click", async () => {
      try {
        const data = await request(`/api/cases/${encodeURIComponent(title)}`);
        window.caseEditor.open(data.case, request, () => window.location.reload());
      } catch (error) {
        const feedback = managementPanel.querySelector(".feedback") || document.createElement("p");
        feedback.className = "feedback";
        feedback.textContent = error.message;
        managementPanel.appendChild(feedback);
      }
    });
  });

  observer.observe(managementPanel, { childList: true, subtree: true });
})();
