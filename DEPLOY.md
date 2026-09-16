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

Depois disso, cada alteracao enviada para `main` sera publicada automaticamente.
