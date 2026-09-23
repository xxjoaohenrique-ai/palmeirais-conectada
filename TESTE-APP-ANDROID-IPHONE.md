# Teste instalável — Android e iPhone (PWA)

Branch de preparação: `teste-app-android-iphone`. O site público continua na branch `main`; este teste não é uma publicação nas lojas e não altera o banco de dados.

## O que já existe no projeto
- `manifest.webmanifest` com nome, URL inicial, escopo, exibição standalone e ícones 192/512.
- `sw.js` com registro em `js/mobile-app.js`; não armazena denúncias nem sessões em cache.
- `js/install-app.js` disponibiliza instalação pelo navegador e instruções para iPhone.
- HTTPS na hospedagem Cloudflare Pages.

## Para instalar no Android (teste)
1. Acesse o endereço HTTPS do site no Chrome.
2. Na página inicial, toque em **Instalar aplicativo**. Se não aparecer o convite nativo, no menu do Chrome toque em **Instalar app** ou **Adicionar à tela inicial**.
3. Abra pelo ícone instalado; confirme a navegação entre páginas e o login.
4. Se o Chrome só oferecer um atalho, verifique no DevTools: manifest e ícones carregados, service worker ativo e ausência de erros.

## Para instalar no iPhone (teste)
1. Abra o site no Safari (não em navegador interno de aplicativo).
2. Toque em Compartilhar > Adicionar à Tela de Início. Se disponível, ative **Abrir como App**.
3. Confirme e abra pelo ícone na tela inicial.
4. Valide login, retorno ao aplicativo, formulário, câmera/galeria e navegação.

## Verificações antes de convidar testadores
- Os ícones `/icons/app-icon-192.png` e `/icons/app-icon-512.png` devem responder HTTP 200 no endereço publicado.
- `/manifest.webmanifest` e `/sw.js` devem responder HTTP 200.
- Não usar o Service Worker para cache de informações privadas.
- Confirmar que o login/Supabase permanece autenticado após fechar e reabrir o aplicativo.
- Testar a denúncia com imagem, o painel administrativo, a alteração de status e a exclusão — esses fluxos exigem verificação de persistência no Supabase, não apenas no navegador.
- Confirmar que atualizar ou abrir diretamente cada URL .html não causa tela branca/404.
- Testar redes móveis, modo escuro, áreas seguras do iPhone e tamanho de texto maior.

## Atenção
A branch de teste não é automaticamente um aplicativo Android APK/AAB, e instalá-la no iPhone via Safari não significa publicação na App Store. A Play Store exigirá empacotamento e testes próprios depois que o PWA estiver validado.

**Publicação:** a automação de Cloudflare existente publica apenas commits em `main`. Esta branch isolada não deve ser mesclada nem enviada a produção sem aprovação.
