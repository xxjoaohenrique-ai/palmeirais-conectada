# Publicação do Palmeirais Conectada

O site é publicado pelo Vercel a partir da branch `main`. O projeto usa
`vercel.json` e `scripts/build-vercel.mjs` para montar `site-dist/` somente
com HTML, CSS, JavaScript, ícones e arquivos da PWA. O Vercel não precisa instalar
as dependências do `package.json` para esta versão estática.

- Site novo: https://palmeirais-conectada.vercel.app/
- Banco e autenticação: Supabase, configurados no `js/supabase-config.js`.
  A chave publishable é pública; as tabelas e os arquivos dependem de RLS.
- O endereço antigo do Cloudflare Pages continua independente até ser
  desativado ou redirecionado no painel Cloudflare. O workflow do Cloudflare é
  apenas manual e exige um token válido em GitHub Actions Secrets.

Para alterar o site, envie uma atualização para `main` e confira o novo
deployment no Vercel. Não coloque tokens privados, senhas, chaves service role
ou outros segredos em `js/` nem em arquivos enviados ao navegador.
