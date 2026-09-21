# Frontend

O frontend do PlanoPneumatic e uma aplicacao estaticamente servida pelo Nginx. Ele usa HTML, CSS e JavaScript sem bundler ou framework.

## Responsabilidades

- Renderizar as telas operacionais.
- Manter a sessao do usuario no navegador.
- Fazer requisicoes autenticadas para a API.
- Exibir dashboard, pendencias, historico e formularios de processo.
- Permitir edicao de processos por modal.

## Executar com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

O frontend fica disponivel em:

```text
http://localhost:3000
```

O Nginx serve os arquivos da pasta `frontend` e encaminha qualquer requisicao `/api/` para o servico `api`.

## Executar somente o frontend

Para testar a imagem do frontend isoladamente:

```bash
docker build -f Dockerfile.frontend -t planopneumatic-frontend .
docker run --rm -p 8080:80 -e API_UPSTREAM_URL=http://host.docker.internal:3000 planopneumatic-frontend
```

Acesse http://localhost:8080.

O valor de `API_UPSTREAM_URL` deve ser uma URL completa, como `http://host.docker.internal:3000` quando a API estiver rodando na maquina host ou `http://api:3000` dentro do Docker Compose. A variavel antiga `API_UPSTREAM` continua aceita como compatibilidade.

## Arquivos principais

- `index.html`: login e dashboard.
- `triagem.html` e `triagem.js`: abertura de processo.
- `historico.html` e `historico.js`: filtros e gerenciamento.
- `case-editor.js`: modal compartilhado de edicao.
- `admin-page.js`: pendencias, relatorios, usuarios, configuracoes e conta.
- `shared-shell.js`: navegacao e perfil lateral.
- `styles.css`: estilos globais e componentes.
- `nginx.conf`: arquivos estaticos, proxy da API e health check.

## Fluxo de sessao

1. O usuario envia e-mail e senha para `POST /api/auth/login`.
2. O token retornado e salvo em `localStorage`.
3. As requisicoes protegidas enviam `Authorization: Bearer <token>`.
4. Uma resposta `401` remove a sessao e retorna o usuario para o login.
5. O logout invalida a sessao na API e limpa o armazenamento local.

## Validacao local

Confira a sintaxe dos scripts principais:

```bash
node --check frontend/app.js
node --check frontend/admin-page.js
node --check frontend/case-editor.js
node --check frontend/history-editor.js
```

Confira os recursos servidos pelo frontend:

```powershell
Invoke-WebRequest http://localhost:3000/
Invoke-WebRequest http://localhost:3000/logo.png
Invoke-WebRequest http://localhost:3000/health
Invoke-WebRequest http://localhost:3000/api/health
```

## Cuidados

- O frontend nao deve conter senhas, tokens ou `DATABASE_URL`.
- O `API_UPSTREAM_URL` deve ser configurado pelo ambiente, nunca fixado para uma URL local no deploy.
- Alteracoes de HTML devem preservar os seletores usados pelos scripts.
- O asset publico do logo e `/logo.png`; o arquivo de origem e `LogoPneumatic.png`.
