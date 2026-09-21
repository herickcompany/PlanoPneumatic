(() => {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const navigation = [
    ["/", "▦", "Dashboard", "dashboard"],
    ["/triagem.html", "◎", "Triagem", "triagem"],
    ["/pedido-venda.html", "▤", "Pedidos de venda", "pedido"],
    ["/base-troca.html", "↻", "Base de troca", "troca"],
    ["/garantia.html", "✓", "Garantias", "garantia"],
    ["/historico.html", "◷", "Histórico", "historico"],
    ["/relatorios.html", "◷", "Relatórios", "relatorios"],
    ["/cadastros.html", "♙", "Cadastros", "cadastros"],
    ["/configuracoes.html", "⚙", "Configurações", "configuracoes"],
    ["/conta.html", "◉", "Minha conta", "conta"]
  ];

  const currentPath = window.location.pathname === "/" ? "/" : window.location.pathname.replace(/\/$/, "");
  const links = navigation.map(([href, icon, label, key]) => {
    const normalizedHref = href === "/" ? "/" : href;
    const active = normalizedHref === currentPath;
    return `<a class="nav-link${active ? " active" : ""}" href="${href}" data-nav-key="${key}"><span>${icon}</span> ${label}</a>`;
  }).join("");

  const nav = sidebar.querySelector(".nav");
  if (nav) {
    nav.setAttribute("aria-label", "Navegação principal");
    nav.innerHTML = links;
  }

  const brand = sidebar.querySelector(".brand-sidebar");
  if (brand) brand.innerHTML = '<img src="/logo.png" alt="Plano Pneumatic" /><span>OPERAÇÃO</span>';
})();
