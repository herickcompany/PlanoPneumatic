# Publicacao no Railway

A publicacao recomendada usa tres servicos:

1. PostgreSQL gerenciado pelo Railway.
2. API Express baseada em `Dockerfile`.
3. Frontend Nginx baseado em `Dockerfile.frontend`.

## Preparacao do repositorio

O repositorio deve conter os arquivos de build e configuracao:

- `Dockerfile`
- `Dockerfile.frontend`
- `nginx.conf`
- `scripts/start-frontend.sh`
- `docker-compose.yml`
- `package.json` e `package-lock.json`

O `.env` local nao deve ser enviado ao repositorio. Ele ja esta listado no `.gitignore`.

## Criar o projeto

No painel do Railway:

1. Crie um novo projeto chamado `PlanoPneumatic`.
2. Adicione um servico PostgreSQL.
3. Adicione um servico para a API a partir do repositorio.
4. Adicione um segundo servico para o frontend a partir do mesmo repositorio.
5. Gere um dominio publico para o frontend.
6. Gere um dominio publico para a API somente se ele for necessario para o proxy.

## Servico da API

Configure o servico para usar o `Dockerfile` da raiz.

Variaveis recomendadas:

| Variavel | Valor |
| --- | --- |
| `PORT` | Fornecida pelo Railway ou `3000` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Referencia `DATABASE_URL` do PostgreSQL Railway |
| `SEED_ADMIN_EMAIL` | E-mail administrativo definido pela equipe |
| `SEED_ADMIN_PASSWORD` | Senha forte definida como secret |
| `SEED_ADMIN_NAME` | Nome do administrador inicial |
| `SEED_OPERATOR_EMAIL` | E-mail operacional inicial |
| `SEED_OPERATOR_PASSWORD` | Senha forte definida como secret |
| `SEED_OPERATOR_NAME` | Nome do operador inicial |

Nao copie valores do `.env.example` para producao. As senhas devem ser configuradas como secrets no Railway.

Health check:

```text
/health
```

A API precisa retornar HTTP 200 e o corpo deve indicar `status: ok` quando tambem conseguir consultar o PostgreSQL.

## Servico do frontend

Configure o servico para usar `Dockerfile.frontend`.

Defina:

```text
API_UPSTREAM=<host-e-porta-da-api>
```

No ambiente local do Compose, o valor e `api:3000`. No Railway, use o hostname privado entre servicos quando estiver disponivel. Caso o proxy privado nao esteja disponivel para o servico, use o dominio interno ou publico fornecido pelo Railway, conforme a configuracao da rede.

Health check:

```text
/health
```

O frontend deve retornar HTTP 200. A rota `/api/health` deve ser encaminhada para a API e tambem retornar HTTP 200.

## Ordem de validacao

1. Confirme que o PostgreSQL esta provisionado.
2. Aguarde a API ficar saudavel.
3. Verifique `/health` na API.
4. Verifique `/health` no frontend.
5. Verifique `/api/health` pelo dominio do frontend.
6. Acesse o login.
7. Crie um processo de teste.
8. Edite o processo pelo dashboard ou historico.
9. Confirme a criacao de uma conta administrativa.
10. Remova dados de teste conforme a politica do ambiente.

## Checklist de seguranca

- [ ] Senhas de seed substituidas por secrets fortes.
- [ ] `DATABASE_URL` configurada apenas no Railway.
- [ ] `.env` fora do Git.
- [ ] Dominios e CORS revisados, caso a API seja acessada diretamente.
- [ ] Banco com persistencia e backup conforme o plano contratado.
- [ ] Logs sem senhas ou tokens.
- [ ] Health checks configurados nos dois servicos.
- [ ] Rebuild realizado depois de cada alteracao de frontend ou backend.

## Rollback

Antes de cada publicacao, mantenha o commit anterior identificado. Em caso de falha:

1. Consulte os logs da API e do frontend.
2. Verifique o health check do servico que falhou.
3. Reverta o servico para o deploy anterior pelo painel do Railway.
4. Nao apague o banco para corrigir falhas de aplicacao.

## Observacao sobre migrations

Atualmente o schema e inicializado por `backend/db.js` durante a inicializacao da API. Antes de um ambiente de producao com mudancas frequentes de estrutura, evolua esse processo para migrations versionadas e execute-as em uma etapa controlada do deploy.
