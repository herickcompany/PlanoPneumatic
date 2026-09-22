(() => {
  const sessionKey = "plano-pneumatic-session";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function close() {
    document.querySelector("#case-editor-modal")?.remove();
  }

  function open(item, request, onSaved) {
    close();
    const modal = document.createElement("div");
    modal.id = "case-editor-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-card editor-card">
        <div class="panel-heading">
          <div><p class="eyebrow">Editar processo</p><h2>${escapeHtml(item.id)}</h2></div>
          <button class="close-button" type="button" data-close-editor aria-label="Fechar">&times;</button>
        </div>
        <form class="form editor-form" data-editor-form>
          <div class="editor-grid">
            <label>Cliente<input name="client" value="${escapeHtml(item.client)}" required /></label>
            <label>Documento do cliente<input name="clientDocument" value="${escapeHtml(item.clientDocument)}" /></label>
            <label>Produto<input name="product" value="${escapeHtml(item.product)}" required /></label>
            <label>Codigo do produto<input name="productCode" value="${escapeHtml(item.productCode)}" required /></label>
            <label>Quantidade<input name="quantity" type="number" min="1" value="${Number(item.quantity) || 1}" required /></label>
            <label>Documento de referencia<input name="documentReference" value="${escapeHtml(item.documentReference)}" /></label>
            <label class="wide-field">Observacoes<textarea name="notes" rows="4">${escapeHtml(item.notes)}</textarea></label>
          </div>
          <p class="feedback" data-editor-feedback></p>
          <div class="form-actions"><button class="button button-secondary" type="button" data-close-editor>Cancelar</button><button class="button button-primary" type="submit">Salvar alteracoes <span>→</span></button></div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    const form = modal.querySelector("[data-editor-form]");
    const feedback = modal.querySelector("[data-editor-feedback]");
    modal.querySelectorAll("[data-close-editor]").forEach((button) => button.addEventListener("click", close));
    modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      feedback.textContent = "";
      try {
        const data = await request(`/api/cases/${encodeURIComponent(item.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            client: form.client.value,
            clientDocument: form.clientDocument.value,
            product: form.product.value,
            productCode: form.productCode.value,
            quantity: Number(form.quantity.value),
            documentReference: form.documentReference.value,
            notes: form.notes.value
          })
        });
        close();
        onSaved?.(data.case);
      } catch (error) {
        feedback.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  window.caseEditor = { open, close, sessionKey };
})();
