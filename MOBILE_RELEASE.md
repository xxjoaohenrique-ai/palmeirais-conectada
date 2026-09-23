# Palmeirais Conectada — Android (Google Play) e iPhone/iPad (Safari)

Este repositório hospeda um site estático multi-páginas no Cloudflare Pages. O cadastro, login, painel e denúncias continuam no site e no Supabase. **O PWA e o Android TWA dependem de internet para operações com dados.** Não faça cache de sessões ou denúncias.

## 1. Instalar pelo Safari (iPhone e iPad)

1. Publique uma versão aprovada em HTTPS e abra a URL no **Safari**.
2. Toque no botão de compartilhar (ou no menu da página e depois Compartilhar, dependendo da versão do iOS).
3. Selecione **Adicionar à Tela de Início**, ative **Abrir como App** caso apareça e toque em **Adicionar**.
4. Abra o ícone na tela inicial e teste login, envio de foto e navegação.

O Safari não publica apps na App Store. Publicação na **Apple App Store** é um processo separado, com aplicativo iOS e conta Apple Developer.

## 2. Instalar pelo Android diretamente do site

Abra o site HTTPS no Chrome para Android. Use **Instalar aplicativo**, se o navegador oferecer essa opção, ou menu **⋮ → Adicionar à tela inicial**. O botão "Instalar aplicativo" da página já mostra instruções quando o aviso de instalação não está disponível.

## 3. Gerar o aplicativo Android para a Google Play Store

O caminho recomendado para **este** projeto é uma **Trusted Web Activity (TWA)**, porque ela utiliza o site atual em vez de duplicar telas e autenticação em outro aplicativo. O gerador oficial é o Bubblewrap:

```bash
npm install -g @bubblewrap/cli
mkdir android-twa
cd android-twa
bubblewrap init --manifest https://palmeirais-conectada.pages.dev/manifest.webmanifest
bubblewrap build
```

Execute após o deploy HTTPS estar acessível, substituindo a URL se seu domínio de produção for outro. O `init` é interativo e pede nome, identificador do pacote Android, dados da chave de assinatura e outros detalhes. Escolha um identificador **único e permanente**, por exemplo `app.palmeiraisconectada.mobile`, apenas se ainda estiver disponível. Não use nomes ou declarações oficiais da Prefeitura sem autorização.

O Bubblewrap gera o projeto Android, o **APK para teste** e o **AAB assinado** para enviar à Play Store. Para futuras atualizações, preserve a chave de assinatura, incrementando `appVersionCode`; nunca publique chaves ou senhas no GitHub.

**Exigência atual:** desde **31/08/2026**, novos apps Android para Google Play precisam mirar o **Android 16 / API 36** ou superior (salvo exceções específicas para outras categorias de dispositivo). Após o `init`, confira `android-twa/app/build.gradle` (ou o equivalente gerado): `compileSdkVersion` e `targetSdkVersion` devem ser **36 ou superiores**. Se seu Bubblewrap gerar números inferiores, atualize Bubblewrap/Gradle e reconstrua antes de enviar. Verifique também a versão mais recente dos requisitos na Play Console.

Referências: https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli e https://support.google.com/googleplay/android-developer/answer/11926878

### Assinatura do domínio (essencial para abrir em tela cheia)

Uma TWA exige Digital Asset Links, vinculando o domínio HTTPS ao pacote Android e ao certificado de assinatura:

1. Gere a chave de assinatura **fora do repositório** e faça backup seguro.
2. Obtenha a impressão digital SHA-256 da chave usada no APK local e a **impressão digital do certificado de assinatura do app** na Play Console (podem ser diferentes).
3. Gere `assetlinks.json` pelo Bubblewrap (`bubblewrap fingerprint generateAssetLinks`) ou preencha o exemplo em `android/assetlinks.template.json`, com o *package_name* real e as impressões digitais reais.
4. Publique o JSON efetivo em `https://SEU-DOMINIO/.well-known/assetlinks.json` (pasta `.well-known/assetlinks.json` na raiz do deploy do Cloudflare). **Não publique o modelo com valores fictícios.**
5. Confira o acesso público direto ao arquivo (HTTP 200, JSON, sem redirecionamento para login), confirme domínio idêntico ao definido no app e teste se a TWA abre sem barra de navegador.

A assinatura de upload e a assinatura de distribuição da Play Store não são necessariamente iguais. Inclua a impressão digital que corresponde à instalação realmente testada. Use também a impressão digital da Play App Signing para a versão distribuída pela loja.

Referência: https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs

## 4. Publicação

Na Play Console, crie o app, envie o `.aab`, complete ficha da loja, screenshots reais de celular, ícone, classificação indicativa, política de privacidade e formulário de segurança de dados com base no comportamento **real** do sistema. Teste foto/câmera, upload, login, recuperação de senha, links, menu responsivo e o acesso administrativo autorizado. Não declare suporte offline para denúncias: a página offline apenas informa que é preciso conexão.

Contas pessoais da Play Console criadas após 13/11/2023 em geral precisam de teste fechado com **12 testadores por 14 dias contínuos** antes de solicitar acesso à produção; verifique as condições da conta na Console. Fonte: https://support.google.com/googleplay/android-developer/answer/14151465

## 5. O que falta para uma publicação real

- Fazer merge deste PR e confirmar o deploy HTTPS e o funcionamento no dispositivo real.
- Criar e guardar a assinatura Android **privadamente**; gerar o APK/AAB em máquina com Java, Android SDK e Bubblewrap.
- Adicionar o arquivo final `.well-known/assetlinks.json` depois de conhecer pacote e certificados.
- Preparar a ficha, política de privacidade, testes e envio à Play Console.

**Este PR não publica a loja, não gera um AAB assinado e não altera o banco ou permissões do Supabase.** A branch `main` continua sendo a única publicada automaticamente pelo workflow atual.
