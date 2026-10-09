/**
 * Carrega os componentes de navegação (desktop e mobile) nas páginas.
 *
 * Uso na página:
 *   <body data-page="pagina_cartoes">
 *     <div id="navbar-placeholder"></div>         (dentro da <aside>)
 *     <div id="mobile-navbar-placeholder"></div>  (antes dos scripts)
 *     <script src="../components/navbar.js"></script>
 *
 * O item cujo data-page for igual ao data-page do <body> é destacado.
 */
(function () {
  const baseUrl = document.currentScript.src;

  const CLASSES = {
    desktop: {
      base: 'block px-4 py-3 rounded-lg border',
      active: 'bg-gray-700 text-white border-gray-600 font-medium',
      inactive:
        'text-gray-400 hover:bg-gray-700 hover:text-white border-transparent transition-colors',
    },
    mobile: {
      base: 'block px-4 py-4 rounded-lg border text-lg',
      active: 'bg-gray-800 text-white border-gray-700',
      inactive:
        'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent',
    },
  };

  async function loadComponent(placeholderId, fileName) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return;

    try {
      const response = await fetch(new URL(fileName, baseUrl));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      placeholder.outerHTML = await response.text();
    } catch (error) {
      console.error(`Erro ao carregar o componente ${fileName}:`, error);
    }
  }

  function highlightActiveLinks() {
    const currentPage = document.body.dataset.page;

    document.querySelectorAll('nav[data-navbar]').forEach((nav) => {
      const styles = CLASSES[nav.dataset.navbar];
      if (!styles) return;

      nav.querySelectorAll('a[data-page]').forEach((link) => {
        const isActive = link.dataset.page === currentPage;
        link.className = `${styles.base} ${isActive ? styles.active : styles.inactive}`;
        if (isActive) link.setAttribute('aria-current', 'page');
      });
    });
  }

  function initMobileMenu() {
    const btnOpen = document.getElementById('mobile-menu-btn');
    const btnClose = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (btnOpen && btnClose && mobileMenu) {
      btnOpen.addEventListener('click', () => {
        mobileMenu.classList.remove('translate-x-full');
      });

      btnClose.addEventListener('click', () => {
        mobileMenu.classList.add('translate-x-full');
      });
    }
  }

  async function init() {
    await Promise.all([
      loadComponent('navbar-placeholder', 'navbar.html'),
      loadComponent('mobile-navbar-placeholder', 'mobile-navbar.html'),
    ]);
    highlightActiveLinks();
    initMobileMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
