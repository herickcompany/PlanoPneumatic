(() => {
  if (window.__pwaInitialized) return;
  window.__pwaInitialized = true;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  window.__pwaInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__pwaInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("pwa-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    window.__pwaInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
})();
