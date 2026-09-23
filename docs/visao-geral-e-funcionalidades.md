# Visão geral e funcionalidades do Plano Pneumatic

Este documento descreve, de forma funcional, tudo o que o sistema **Plano Pneumatic** faz hoje: quem usa, quais telas existem, o que cada uma resolve e como os processos fluem de ponta a ponta. Para detalhes técnicos (stack, estrutura de pastas, infraestrutura) veja [arquitetura-tecnica.md](arquitetura-tecnica.md).

## 1. O que é o sistema

O Plano Pneumatic é a aplicação de operação interna usada para controlar, do início ao fim, os três tipos de processo da empresa:

- **Pedido de venda**
- **Base de troca**
- **Garantia**

Além disso, oferece **triagem** (abertura assistida de um novo processo), **histórico** (busca e gestão de processos já abertos), **relatórios** gerenciais, **cadastro de usuários/times** e **configurações** da operação. É utilizável tanto pelo navegador quanto **instalado como aplicativo** (PWA) em tablets e desktops.

## 2. Perfis de usuário e permissões

| Perfil | Visão de casos | Principais capacidades |
| --- | --- | --- |
| **Admin** | Todos os processos | Acesso total: cria operadores e gerentes, transfere times, gerencia integrações/webhooks, vê auditoria e todos os relatórios |
| **Manager (gerente)** | Todos os processos do seu time | Cria operadores, ativa/desativa usuários do time, atribui casos, vê relatórios do próprio time e auditoria |
| **Supervisor** | Todos os processos | Acompanhamento, sem permissões administrativas |
| **Operator (operador)** | Apenas os processos que criou ou que foram atribuídos a ele | Opera o dia a dia: abre, edita e movimenta os próprios casos |

A navegação lateral se adapta ao perfil (por exemplo, "Cadastros" só aparece para admin/manager), e ações sem permissão retornam erro de acesso negado.

## 3. Acesso ao sistema

- **Login**: e-mail e senha corporativos. Sessão fica salva no navegador (ou no app instalado) e expira automaticamente depois de um tempo configurável.
- **Esqueci minha senha**: fluxo de recuperação por token, com expiração de 30 minutos e uso único.
- **Logout**: encerra a sessão tanto no navegador quanto no servidor.
- **Instalar como aplicativo**: na própria tela de login existe um botão "Baixar aplicativo", que aparece quando o navegador permite instalação (Chrome/Edge em desktop e tablets, principalmente). Depois de instalado, o sistema abre em janela própria, sem a barra do navegador, com ícone e splash screen próprios.

## 4. Telas e módulos

### 4.1 Dashboard (`/`)
Tela inicial após o login. Mostra:
- Indicadores gerais (casos abertos, concluídos, tempo médio, pendências críticas, atrasos).
- Filtros por período, tipo, status, cliente e responsável.
- Comparativo com o período anterior.
- Gráfico de evolução por dia e distribuição por tipo de processo.
- Tabela de "casos recentes" e painel de "minhas pendências".
- Alertas de processos próximos do vencimento.

### 4.2 Triagem (`/triagem.html`)
Abertura assistida de um novo processo em etapas (identificação do cliente/item → escolha do tipo de processo → confirmação), com barra de progresso e painel de resumo lateral. Ao concluir, o processo é criado e o usuário segue para a tela específica do tipo escolhido.

### 4.3 Pedido de venda / Base de troca / Garantia
Telas de detalhamento específicas para cada tipo de processo (`pedido-venda.html`, `base-troca.html`, `garantia.html`), com campos próprios do tipo (ex.: motivo da troca, condição do item, análise técnica de garantia, nível de risco). Todas compartilham o mesmo esqueleto visual (cabeçalho do processo, status, formulário) e o mesmo fluxo de salvamento.

### 4.4 Histórico (`/historico.html`)
Busca e gestão de processos já existentes:
- Filtros por processo, cliente, tipo, status, responsável e datas.
- Lista de resultados com seleção de linha.
- Painel de gerenciamento do caso selecionado: linha do tempo (timeline) de eventos, checklist de etapas, anexos (referência a arquivos/links), comentários internos e alteração de status.

### 4.5 Relatórios
Três telas complementares, com navegação por abas:
- **Relatórios** (`/relatorios.html`): visão geral (contagens, distribuição por tipo/status, produtividade por usuário, tempo médio por etapa, casos parados).
- **Desempenho por time** (`/relatorios-time.html`): casos e peças registradas por operador, agrupado por gerente (visão do próprio gerente ou de todos, para admin).
- **Desempenho de gerentes** (`/relatorios-gerentes.html`, somente admin): engajamento de cada gerente (ações, navegações, cliques, dias ativos, % de conclusão do time).
- Exportação de dados em **CSV** e em **HTML imprimível**.

### 4.6 Cadastros (`/cadastros.html`, admin/manager)
Gestão de usuários: criação de operadores e gerentes, ativação/desativação de contas e transferência de operadores entre times (admin).

### 4.7 Configurações (`/configuracoes.html`)
Preferências da operação: alertas, atualização automática, exigência de documento, legenda de cores de status, e prazos de SLA por tipo de processo.

### 4.8 Minha conta (`/conta.html`)
Edição do próprio nome e troca de senha.

## 5. Ciclo de vida de um processo (caso)

1. **Criação**: pela triagem (ou importação em lote). Recebe um número sequencial no formato `PV-`, `TRO-` ou `GAR-` + ano + sequência, e um checklist inicial de acordo com o tipo.
2. **Andamento**: o status evolui entre `Criado → Em análise → Aguardando documento → Aprovado/Improcedente → Em faturamento/Processando → Concluído → Encerrado` (ou `Cancelado` a qualquer momento).
3. **Colaboração**: durante o andamento é possível comentar internamente, marcar itens do checklist, anexar referências de arquivo e atribuir o caso a um operador.
4. **Rastreabilidade**: toda mudança relevante gera um evento na timeline do caso (quem fez, quando, o quê).
5. **Notificações**: mudanças de status e atribuições geram notificações para os envolvidos.
6. **Integrações**: mudanças de status também podem disparar **webhooks** para sistemas externos (assinados com HMAC para validação de origem).
7. **Auditoria**: ações administrativas sobre usuários (criação, desativação, transferência de time) ficam registradas em um log de auditoria consultável.

## 6. Aplicativo (PWA)

- O sistema pode ser **instalado** como aplicativo (ícone próprio, sem barra de endereço) a partir do botão na tela de login.
- Funciona offline de forma limitada: a interface (telas, estilos e scripts) fica em cache e carrega mesmo sem conexão; dados que dependem da API (login, casos, relatórios) continuam exigindo conexão.
- O foco principal é **tablet e desktop** (uso operacional intenso), mas a versão para **celular também é suportada** e recebeu ajustes dedicados de layout.

## 7. Responsividade

- **Desktop**: layout completo, menu lateral fixo, grades em várias colunas.
- **Tablet**: colunas intermediárias (ex.: indicadores em 3 colunas em vez de 2 ou 4) e alvos de toque maiores (botões, links de navegação, linhas de tabela) para facilitar o uso sem mouse.
- **Celular**: menu lateral vira uma barra compacta no topo, formulários e grades colapsam para uma coluna, e a tela de login empilha o banner acima do formulário (em vez de lado a lado).

## 8. Segurança (nível funcional)

- Autenticação por sessão com expiração automática.
- Senhas nunca visíveis; recuperação por token de uso único e curta validade.
- Permissões checadas em cada ação (não apenas escondidas na tela).
- Visibilidade de dados restrita por perfil (operador só vê o que é seu).
- Auditoria de ações administrativas sensíveis.
