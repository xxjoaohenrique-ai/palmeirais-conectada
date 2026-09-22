/* Instalação progressiva: sem acesso a dados privados ou alteração de funções do site. */
(function () {
  'use strict';
  let deferredPrompt = null;

  const isStandalone = function () {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  };

  const isIOS = function () {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  function showInstructions() {
    let dialog = document.getElementById('pwaInstallDialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'pwaInstallDialog';
      dialog.className = 'pwa-install-overlay';
      dialog.hidden = true;
      dialog.innerHTML =
        '<section class="pwa-install-dialog" role="dialog" aria-modal="true" aria-labelledby="pwaInstallTitle">' +
          '<button class="pwa-install-close" type="button" aria-label="Fechar instruções">×</button>' +
          '<div class="pwa-install-symbol" aria-hidden="true"><i class="fas fa-mobile-alt"></i></div>' +
          '<h2 id="pwaInstallTitle">Instalar Palmeirais Conectada</h2>' +
          '<p id="pwaInstallSteps"></p>' +
          '<button class="pwa-install-done" type="button">Entendi</button>' +
        '</section>';
      document.body.appendChild(dialog);
      const close = function () {
        dialog.hidden = true;
        document.body.style.removeProperty('overflow');
        const install = document.getElementById('installAppButton');
        if (install) install.focus();
      };
      dialog.querySelector('.pwa-install-close').addEventListener('click', close);
      dialog.querySelector('.pwa-install-done').addEventListener('click', close);
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) close();
      });
      dialog.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') close();
      });
    }
    const instructions = isIOS()
      ? 'No iPhone ou iPad, abra este site no Safari. Toque em Compartilhar e depois em “Adicionar à Tela de Início”. Se aparecer “Abrir como App”, deixe ativado e toque em Adicionar.'
      : 'No Android, abra o site no Chrome, toque no menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Em outros navegadores, procure essa opção no menu.';
    dialog.querySelector('#pwaInstallSteps').textContent = instructions;
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.pwa-install-close').focus();
  }

  function init() {
    const install = document.getElementById('installAppButton');
    if (!install) return;
    if (isStandalone()) {
      install.hidden = true;
      return;
    }
    install.addEventListener('click', async function () {
      if (isStandalone()) {
        install.hidden = true;
        return;
      }
      if (!deferredPrompt) {
        showInstructions();
        return;
      }
      const prompt = deferredPrompt;
      deferredPrompt = null;
      try {
        await prompt.prompt();
        await prompt.userChoice;
      } catch (_) {
        showInstructions();
      }
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    const install = document.getElementById('installAppButton');
    if (install) install.hidden = true;
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
