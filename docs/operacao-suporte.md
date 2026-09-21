# Operacao e suporte

## Ambientes

- Desenvolvimento: Docker Compose local, dados descartaveis e credenciais do `.env` local.
- Homologacao: banco separado, dominio separado e variaveis do `.env.homolog.example` configuradas como secrets.
- Producao: servicos Railway separados para API e frontend, banco persistente e variaveis do `.env.production.example` configuradas como secrets.

Nunca compartilhe o banco entre ambientes.

## Deploy

1. Abra um pull request.
2. Aguarde o job `validate` do GitHub Actions.
3. Revise migrations e impacto de dados.
4. Faça merge em `main`.
5. O job `deploy-production` exige o ambiente protegido `production` e aprovacao configurada no GitHub.
6. Valide `/health`, `/health/db`, login e uma consulta de processo nos dois serviços.

Secrets do deploy:

- `RAILWAY_TOKEN`
- `RAILWAY_API_SERVICE`
- `RAILWAY_FRONTEND_SERVICE`

## Rollback

- Reimplante o commit anterior no serviço API e frontend.
- Nao reverta migrations destrutivas automaticamente.
- Preserve o banco e consulte os logs antes de qualquer alteracao manual.

## Backup e restore

PowerShell:

```powershell
./scripts/backup-postgres.ps1 -OutputDirectory ./backups -RetentionDays 14
```

Linux/macOS:

```bash
sh scripts/backup-postgres.sh ./backups
```

Restore local:

```bash
docker compose exec -T postgres psql -U postgres -d plano_pneumatic < backups/arquivo.sql
```

Use restore em producao somente com janela aprovada e backup atual confirmado.

## Health checks

- API: `/health`
- Banco via API: `/health/db`
- Frontend: `/health`
- Proxy/API do frontend: `/api/health`

## Diagnostico rapido

- Login com `401`: valide e-mail, senha e se o usuário está ativo.
- API com `502`: verifique `API_UPSTREAM_URL`, porta Railway e logs do frontend.
- API com `503` em `/health/db`: valide `DATABASE_URL`, disponibilidade do PostgreSQL e migrations.
- Tela sem dados: verifique token, CORS e `/api/auth/me`.

## Fluxo operacional do usuario

1. Entrar no sistema.
2. Criar ou consultar um processo.
3. Conferir checklist e documentos.
4. Acompanhar timeline e pendencias.
5. Atualizar status ou atribuir ao responsavel autorizado.
6. Encerrar somente após checklist e documentos necessários.
