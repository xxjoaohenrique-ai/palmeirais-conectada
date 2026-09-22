/* Isolated mobile navigation. Keeps existing authentication and navigation untouched. */
(function () {
  'use strict';
  function initMobileApp() {
    if (!document.querySelector('.navbar') || document.querySelector('.mobile-app-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'mobile-app-nav';
    nav.setAttribute('aria-label', 'Navegação do aplicativo');
    document.body.appendChild(nav);

    const currentPage = location.pathname.split('/').pop() || 'index.html';
    const menuToggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');

    function link(href, icon, label, primary) {
      const a = document.createElement('a');
      a.href = href;
      a.setAttribute('aria-label', label);
      if (href === currentPage) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
      if (primary) a.classList.add('primary-action');
      const i = document.createElement('i');
      i.className = 'fas ' + icon;
      i.setAttribute('aria-hidden', 'true');
      const span = document.createElement('span');
      span.textContent = label;
      a.append(i, span);
      return a;
    }

    function render(user) {
      nav.replaceChildren();
      nav.appendChild(link('index.html', 'fa-home', 'Início'));
      if (user) {
        nav.appendChild(link('denuncia.html', 'fa-plus-circle', 'Denunciar', true));
        nav.appendChild(user.isAdmin
          ? link('admin.html', 'fa-cog', 'Painel')
          : link('minhas-denuncias.html', 'fa-list', 'Minhas'));
      } else {
        nav.appendChild(link('sobre.html', 'fa-info-circle', 'Sobre'));
        nav.appendChild(link('login.html', 'fa-sign-in-alt', 'Entrar', true));
      }
      const more = document.createElement('button');
      more.type = 'button';
      more.setAttribute('aria-label', 'Abrir menu completo');
      more.setAttribute('aria-controls', 'navMenu');
      more.setAttribute('aria-expanded', String(Boolean(menu && menu.classList.contains('active'))));
      const icon = document.createElement('i');
      icon.className = 'fas fa-bars';
      icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = 'Menu';
      more.append(icon, label);
      more.addEventListener('click', function () {
        if (menuToggle) menuToggle.click();
        more.setAttribute('aria-expanded', String(Boolean(menu && menu.classList.contains('active'))));
      });
      nav.appendChild(more);
      if (menu) {
        const observer = new MutationObserver(function () {
          more.setAttribute('aria-expanded', String(menu.classList.contains('active')));
        });
        observer.observe(menu, { attributes: true, attributeFilter: ['class'] });
      }
    }

    const getUser = () => {
      try { return typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null; }
      catch (_) { return null; }
    };
    render(getUser());
    if (!getUser() && typeof window.restoreSupabaseSession === 'function') {
      Promise.resolve(window.restoreSupabaseSession())
        .then(function () { render(getUser()); })
        .catch(function () { /* Keep public navigation if the session cannot be restored. */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMobileApp);
  else initMobileApp();

  // Static shell only; no offline caching of private pages, reports, sessions or complaints.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }
})();
