# Publicacao automatica

O workflow `.github/workflows/deploy-cloudflare.yml` publica o site no Cloudflare Pages sempre que houver `push` na branch `main`.

## Configuracao inicial

1. Crie um repositorio no GitHub e envie o conteudo desta pasta para a branch `main`.
2. No Cloudflare Pages, crie um projeto vazio com o mesmo nome usado em `CLOUDFLARE_PROJECT_NAME`.
3. Crie um token de API no Cloudflare com permissao `Account > Cloudflare Pages > Edit`.
4. No GitHub, abra `Settings > Secrets and variables > Actions` e adicione:
   - `CLOUDFLARE_API_TOKEN`: token criado no Cloudflare.
   - `CLOUDFLARE_ACCOUNT_ID`: Account ID da conta Cloudflare.
   - `CLOUDFLARE_PROJECT_NAME`: nome do projeto no Cloudflare Pages.
5. Faça um novo `push` na branch `main` ou execute o workflow manualmente em `Actions > Deploy to Cloudflare Pages > Run workflow`.

## Variaveis do Supabase

Como este projeto e um site estatico, as variaveis precisam estar no GitHub Actions para serem gravadas no arquivo publico durante o deploy. No mesmo menu `Settings > Secrets and variables > Actions`, adicione:

- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave publica (publishable/anon) do projeto Supabase.

Variaveis criadas somente no painel do Cloudflare Pages nao ficam disponiveis para JavaScript estatico no navegador.

Depois disso, cada alteracao enviada para `main` sera publicada automaticamente.
