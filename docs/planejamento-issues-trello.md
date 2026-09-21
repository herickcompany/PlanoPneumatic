# Planejamento inicial de issues do projeto

## 1. Objetivo

Este documento organiza o backlog inicial do projeto com base nos requisitos e protótipos presentes em:
- [triagem-requisitos.md](triagem-requisitos.md)
- [pedido-venda-requisitos.md](pedido-venda-requisitos.md)
- [base-troca-requisitos.md](base-troca-requisitos.md)
- [garantia-requisitos.md](garantia-requisitos.md)
- [dashboard-acompanhamento-requisitos.md](dashboard-acompanhamento-requisitos.md)
- [historico-relatorio-requisitos.md](historico-relatorio-requisitos.md)
- [fluxo-garantia-completo-requisitos.md](fluxo-garantia-completo-requisitos.md)

A proposta é entregar duas saídas claras:
1. cartões prontos para Trello;
2. lista detalhada com título, descrição e critérios de aceite.

---

## 2. Papéis cobertos até o momento

- Operador de triagem
- Analista comercial / vendedor
- Responsável técnico / analista de garantia
- Supervisor de operação / gestor
- Administrador do sistema
- Logística
- Analista de qualidade
- Auditor interno
- Cliente interno / usuário de consulta, quando aplicável

---

## 3. Cartões de Trello prontos para uso

### Quadros sugeridos
- Backlog geral
- Priorizado / Sprint 1
- Em desenvolvimento
- Revisão / QA
- Bloqueado
- Concluído

### Cartão 1 — LOGIN E ACESSO POR PERFIL
- Prioridade: Alta
- Papel: Administrador / Operador
- Tipo: Épico
- Descrição: Implementar autenticação do usuário, identificação do perfil e navegação por módulos conforme permissões.
- Critérios de aceite:
  - usuário autenticado consegue acessar apenas os módulos permitidos;
  - perfil define ações e visibilidade;
  - acesso sem credencial deve ser bloqueado;
  - redirecionamento correto para dashboard ou triagem.

### Cartão 2 — SIDEBAR E NAVEGAÇÃO PRINCIPAL
- Prioridade: Alta
- Papel: Operador / Administrador
- Tipo: História
- Descrição: Criar menu lateral para acessar os módulos principais do processo.
- Critérios de aceite:
  - triagem, pedido, troca, garantia, dashboard, histórico e cadastros aparecem conforme perfil;
  - navegação é consistente em todas as telas;
  - o módulo ativo deve estar destacado.

### Cartão 3 — TELA DE TRIAGEM E CLASSIFICAÇÃO INICIAL
- Prioridade: Alta
- Papel: Operador de triagem
- Tipo: Épico
- Descrição: Implementar a tela inicial de triagem para identificar o tipo de demanda e iniciar o fluxo correto.
- Critérios de aceite:
  - o sistema diferencia corretamente triagem, pedido, troca e garantia;
  - campos obrigatórios são sinalizados;
  - o fluxo segue a etapa ativa e ações disponíveis.

### Cartão 4 — VALIDAR DADOS DO CLIENTE E DO PRODUTO NA TRIAGEM
- Prioridade: Média
- Papel: Operador de triagem
- Tipo: História
- Descrição: Garantir que cliente, produto, documento e dados essenciais sejam validados antes de avançar no processo.
- Critérios de aceite:
  - campos incompletos bloqueiam continuidade;
  - cliente sem cadastro válido não entra no fluxo;
  - produto sem código, quantidade ou descrição não pode seguir.

### Cartão 5 — STATUS POR ETAPA E FLUXO GUIADO
- Prioridade: Média
- Papel: Operador de triagem / Supervisor
- Tipo: História
- Descrição: Implementar indicadores visuais de status e orientar o usuário na sequência do processo.
- Critérios de aceite:
  - cada etapa exibirá status visual;
  - etapa atual destacada;
  - etapas concluídas e pendentes são diferenciadas;
  - processo incompleto fica visível e sinalizado.

### Cartão 6 — CADASTRO E REGISTRO DE PEDIDO DE VENDA
- Prioridade: Alta
- Papel: Operador de triagem / Analista comercial
- Tipo: Épico
- Descrição: Criar o ciclo de cadastro do pedido de venda com validação de cliente, produto, quantidade, valor e documentação.
- Critérios de aceite:
  - pedido só avança com dados mínimos válidos;
  - o sistema registra responsável e data da alteração;
  - pedido incompleto fica em status pendente.

### Cartão 7 — VALIDAÇÃO COMERCIAL E FINANCEIRA DO PEDIDO
- Prioridade: Média
- Papel: Analista comercial / Supervisor
- Tipo: História
- Descrição: Validar quantidade, preço, canal de venda e condições antes do processamento.
- Critérios de aceite:
  - divergência de valor ou quantidade é sinalizada;
  - o pedido é bloqueado ou enviado para revisão;
  - histórico de alteração é mantido.

### Cartão 8 — STATUS, PENDÊNCIAS E ENCAMINHAMENTO DO PEDIDO
- Prioridade: Baixa
- Papel: Supervisor / Operador
- Tipo: História
- Descrição: Gerenciar status do pedido e encaminhamento para faturamento, logística, garantia ou troca.
- Critérios de aceite:
  - status é atualizado por etapa;
  - pendências ficam visíveis;
  - encaminhamento para módulos seguintes funciona corretamente.

### Cartão 9 — REGISTRO DE TROCA E ORIGEM DO ITEM
- Prioridade: Alta
- Papel: Operador de triagem / Base de troca
- Tipo: Épico
- Descrição: Permitir registrar a solicitação de troca com referência ao pedido, cliente e produto.
- Critérios de aceite:
  - troca possui referência ao pedido e cliente;
  - justificativa do motivo é obrigatória;
  - item em condição inadequada gera pendência.

### Cartão 10 — AVALIAÇÃO DA CONDIÇÃO DO ITEM E ANÁLISE DA TROCA
- Prioridade: Média
- Papel: Analista de qualidade / Responsável de base de troca
- Tipo: História
- Descrição: Registrar análise técnica e estado do item antes da aprovação.
- Critérios de aceite:
  - condição do item é classificada;
  - observações técnicas são registradas;
  - troca pode ser aprovada, recusada ou enviada para revisão.

### Cartão 11 — DOCUMENTAÇÃO, ANEXOS E LOGÍSTICA DA TROCA
- Prioridade: Baixa
- Papel: Logística / Base de troca
- Tipo: História
- Descrição: Garantir que documentação e dados de retorno potenciem a integração com logística e a conclusão do processo.
- Critérios de aceite:
  - anexos são vinculados ao caso;
  - falta de documentação gera pendência;
  - trocas aprovadas podem ser encaminhadas para logística ou nova entrega.

### Cartão 12 — ABERTURA DE CASO DE GARANTIA
- Prioridade: Alta
- Papel: Operador de triagem
- Tipo: Épico
- Descrição: Registrar garantia recebida, cliente, produto e dados do recebimento.
- Critérios de aceite:
  - dados do cliente e do produto são obrigatórios;
  - data de recebimento é registrada;
  - processo inicia com status correto.

### Cartão 13 — ANÁLISE TÉCNICA DE GARANTIA
- Prioridade: Média
- Papel: Responsável técnico / Analista de garantia
- Tipo: História
- Descrição: Registrar defeito encontrado, avaliação técnica, conclusão e decisão final.
- Critérios de aceite:
  - responsável técnico pode classificar como procedente ou improcedente;
  - laudo e fotos podem ser anexados;
  - análise sem responsável ou sem documentação fica bloqueada.

### Cartão 14 — ENCAMINHAMENTO E ENCERRAMENTO DA GARANTIA
- Prioridade: Baixa
- Papel: Responsável técnico / Supervisor
- Tipo: História
- Descrição: Permitir o encaminhamento final após decisão, incluindo reposição, devolução, troca ou arquivamento.
- Critérios de aceite:
  - garantia só é encerrada com decisão registrada;
  - documentação final é exigida;
  - caso pode ser reaberto ou revisado quando necessário.

### Cartão 15 — DASHBOARD OPERACIONAL CONSOLIDADO
- Prioridade: Alta
- Papel: Supervisor / Gestor
- Tipo: Épico
- Descrição: Implementar painel com indicadores gerais de processos em andamento, pendências e atrasos.
- Critérios de aceite:
  - dashboard responde aos filtros aplicados;
  - indicadores mostram contexto e status;
  - casos críticos são destacados;
  - filtros por período, tipo de processo e responsável funcionam.

### Cartão 16 — AÇÕES RÁPIDAS E NAVEGAÇÃO DE CONTEXTO
- Prioridade: Baixa
- Papel: Supervisor / Operador
- Tipo: História
- Descrição: Permitir acesso rápido a casos críticos, pendências e áreas com risco operacional.
- Critérios de aceite:
  - ao clicar em um item do dashboard, o usuário é direcionado ao caso correto;
  - pendências e atrasos aparecem com prioridade visual;
  - o usuário navega sem perder o contexto.

### Cartão 17 — TIMELINE DE EVENTOS DO PROCESSO
- Prioridade: Média
- Papel: Operador / Auditor / Supervisor
- Tipo: Épico
- Descrição: Construir linha do tempo com todas as mudanças do caso e ações registradas.
- Critérios de aceite:
  - cada ação registra data, hora, responsável e observação;
  - status e decisões ficam visíveis no histórico;
  - timeline é ordenada cronologicamente.

### Cartão 18 — RELATÓRIO POR CASO E AGREGADO POR PERÍODO
- Prioridade: Baixa
- Papel: Gestão / Auditor / Administrador
- Tipo: História
- Descrição: Permitir consulta detalhada do caso e agregação de indicadores por período.
- Critérios de aceite:
  - filtro por caso, período, status e responsável funciona;
  - resumo do processo é exibido;
  - relatório pode ser exportado.

### Cartão 19 — VISUALIZAÇÃO DO FLUXO COMPLETO DA GARANTIA
- Prioridade: Média
- Papel: Responsável técnico / Supervisor / Operador
- Tipo: Épico
- Descrição: Representar em uma tela os estados da garantia desde abertura até encerramento.
- Critérios de aceite:
  - todas as etapas aparecem em sequência;
  - etapa atual e pendências são diferenciadas;
  - histórico da etapa e responsável ficam registrados.

### Cartão 20 — AUDITORIA E RASTREABILIDADE DO FLUXO DE GARANTIA
- Prioridade: Baixa
- Papel: Administrador / Auditor
- Tipo: História
- Descrição: Garantir que todas as alterações de etapa, decisão e responsável tenham registro completo.
- Critérios de aceite:
  - cada mudança gera log com data, usuário e observação;
  - estados inconsistentes são bloqueados;
  - histórico é suficiente para auditoria e suporte.

### Cartão 21 — PERMISSÕES POR PERFIL E REGRAS DE ACESSO
- Prioridade: Alta
- Papel: Administrador
- Tipo: Épico
- Descrição: Definir controle de acesso por perfil em todos os módulos.
- Critérios de aceite:
  - perfil e permissão são diferentes por função;
  - ações sensíveis ficam restritas;
  - dados financeiros e cadastrais são protegidos.

### Cartão 22 — LOGS DE AUDITORIA E RASTREABILIDADE
- Prioridade: Baixa
- Papel: Administrador / Auditor
- Tipo: História
- Descrição: Registrar alterações de estado, responsáveis, anexos e decisões.
- Critérios de aceite:
  - toda ação relevante gera log;
  - auditor consegue consultar quem alterou o dado e quando;
  - logs podem ser relacionados a um caso específico.

### Cartão 23 — UPLOAD E GESTÃO DE DOCUMENTOS DO PROCESSO
- Prioridade: Média
- Papel: Operador / Técnico / Logística
- Tipo: História
- Descrição: Permitir anexar fotos, laudos, comprovantes, notas e documentos internos a cada caso.
- Critérios de aceite:
  - documentos ficam vinculados ao processo correto;
  - anexos são exibidos por tipo e etapa;
  - arquivos ausentes geram pendência quando exigidos.

### Cartão 24 — VISUALIZAÇÃO E CONTROLE DE ANEXOS POR PERFIL
- Prioridade: Baixa
- Papel: Administrador / Supervisor
- Tipo: História
- Descrição: Ajustar visibilidade e permissões dos anexos conforme o tipo de usuário.
- Critérios de aceite:
  - dados sensíveis não são exibidos indevidamente;
  - perfil define acesso de leitura e edição;
  - anexos seguem regra de auditoria.

---

## 4. Lista detalhada de issues com título, descrição e critérios de aceite

### ISSUE-001 — Login e acesso por perfil
- Papel principal: Administrador / Operador
- Tipo: Épico
- Descrição: Implementar autenticação do usuário, identificação do perfil e navegação por módulos conforme permissões.
- Critérios de aceite:
  - usuário autenticado consegue acessar apenas os módulos permitidos;
  - perfil define ações e visibilidade;
  - acesso sem credencial deve ser bloqueado;
  - redirecionamento funcional para dashboard/triagem.

### ISSUE-002 — Sidebar e navegação principal
- Papel principal: Operador / Administrador
- Tipo: História
- Descrição: Criar menu lateral com acesso aos módulos do processo.
- Critérios de aceite:
  - triagem, pedido, troca, garantia, dashboard, histórico e cadastros aparecem conforme perfil;
  - navegação é consistente em todas as telas;
  - estado ativo do módulo é destacado.

### ISSUE-003 — Tela de triagem e classificação inicial
- Papel principal: Operador de triagem
- Tipo: Épico
- Descrição: Implementar a tela inicial de triagem para identificar o tipo de demanda e iniciar o fluxo correto.
- Critérios de aceite:
  - o sistema diferencia corretamente os tipos de demanda;
  - campos obrigatórios são sinalizados;
  - o fluxo segue a etapa ativa e as ações disponíveis.

### ISSUE-004 — Validar dados do cliente e do produto na triagem
- Papel principal: Operador de triagem
- Tipo: História
- Descrição: Garantir que cliente, produto, documento e dados essenciais sejam validados antes de avançar no processo.
- Critérios de aceite:
  - campos incompletos bloqueiam continuidade;
  - cliente sem cadastro válido não entra no fluxo;
  - produto sem código, quantidade ou descrição não pode seguir.

### ISSUE-005 — Status por etapa e fluxo guiado
- Papel principal: Operador de triagem / Supervisor
- Tipo: História
- Descrição: Implementar indicadores visuais de status e orientar o usuário na sequência correta do processo.
- Critérios de aceite:
  - cada etapa exibe status visual;
  - etapa atual é destacada;
  - etapas concluídas, pendentes e bloqueadas são diferenciadas;
  - processo incompleto permanece visível e sinalizado.

### ISSUE-006 — Cadastro e registro de pedido de venda
- Papel principal: Operador de triagem / Analista comercial
- Tipo: Épico
- Descrição: Criar o ciclo de cadastro do pedido de venda com validação de cliente, produto, quantidade, valor e documentação.
- Critérios de aceite:
  - pedido só avança com dados mínimos válidos;
  - o sistema registra responsável e data da alteração;
  - pedido incompleto fica em status pendente.

### ISSUE-007 — Validação comercial e financeira do pedido
- Papel principal: Analista comercial / Supervisor
- Tipo: História
- Descrição: Validar quantidade, preço, canal de venda e condições antes do processamento.
- Critérios de aceite:
  - divergência de valor ou quantidade é sinalizada;
  - o pedido é bloqueado ou enviado para revisão;
  - os dados podem ser atualizados com histórico de alteração.

### ISSUE-008 — Status, pendências e encaminhamento do pedido
- Papel principal: Supervisor / Operador
- Tipo: História
- Descrição: Gerenciar status do pedido e encaminhamento para faturamento, logística, garantia ou troca.
- Critérios de aceite:
  - status é atualizado por etapa;
  - pendências são visíveis;
  - encaminhamento para módulos seguintes é funcional.

### ISSUE-009 — Registro de troca e origem do item
- Papel principal: Operador de triagem / Base de troca
- Tipo: Épico
- Descrição: Permitir registrar a solicitação de troca com a origem do pedido, cliente e produto.
- Critérios de aceite:
  - troca possui referência ao pedido e cliente;
  - justificativa do motivo é obrigatória;
  - item com condição inadequada gera pendência.

### ISSUE-010 — Avaliação da condição do item e análise da troca
- Papel principal: Analista de qualidade / Responsável de base de troca
- Tipo: História
- Descrição: Registrar análise técnica e estado do produto antes da aprovação.
- Critérios de aceite:
  - condição do item é classificada;
  - observações técnicas são registradas;
  - troca pode ser aprovada, recusada ou enviada para revisão.

### ISSUE-011 — Documentação, anexos e logística da troca
- Papel principal: Logística / Base de troca
- Tipo: História
- Descrição: Garantir que documentação e dados de retorno apoiem a integração com logística e conclusão do processo.
- Critérios de aceite:
  - anexos são aceitos e associados ao caso;
  - falta de documentação gera pendência;
  - trocas aprovadas podem ser encaminhadas para logística ou nova entrega.

### ISSUE-012 — Abertura de caso de garantia
- Papel principal: Operador de triagem
- Tipo: Épico
- Descrição: Registrar garantia recebida, cliente, produto e dados do recebimento.
- Critérios de aceite:
  - dados do cliente e do produto são obrigatórios;
  - data de recebimento é registrada;
  - processo inicia com status correto.

### ISSUE-013 — Análise técnica de garantia
- Papel principal: Responsável técnico / Analista de garantia
- Tipo: História
- Descrição: Registrar defeito encontrado, observações técnicas, conclusão e decisão final.
- Critérios de aceite:
  - responsável técnico pode classificar como procedente ou improcedente;
  - laudo e fotos podem ser anexados;
  - análise sem responsável ou sem documentação fica bloqueada.

### ISSUE-014 — Encaminhamento e encerramento da garantia
- Papel principal: Responsável técnico / Supervisor
- Tipo: História
- Descrição: Permitir o encaminhamento final após decisão, incluindo reposição, devolução, troca ou arquivamento.
- Critérios de aceite:
  - garantia só é encerrada com decisão registrada;
  - documentação final é exigida;
  - caso pode ser reaberto ou revisado se necessário.

### ISSUE-015 — Dashboard operacional consolidado
- Papel principal: Supervisor / Gestor
- Tipo: Épico
- Descrição: Implementar painel com indicadores gerais de processos em andamento, pendências e atrasos.
- Critérios de aceite:
  - dashboard responde aos filtros aplicados;
  - indicadores mostram contexto e status;
  - casos críticos são destacados;
  - filtros por período, tipo de processo e responsável funcionam.

### ISSUE-016 — Ações rápidas e navegação de contexto
- Papel principal: Supervisor / Operador
- Tipo: História
- Descrição: Permitir acesso rápido a casos críticos, pendências e áreas com risco operacional.
- Critérios de aceite:
  - ao clicar em um item do dashboard, o usuário é direcionado ao caso correto;
  - pendências e atrasos aparecem com prioridade visual;
  - o usuário navega sem perder o contexto.

### ISSUE-017 — Timeline de eventos do processo
- Papel principal: Operador / Auditor / Supervisor
- Tipo: Épico
- Descrição: Construir timeline cronológica com todas as mudanças do caso e ações registradas.
- Critérios de aceite:
  - cada ação registra data, hora, responsável e observação;
  - status e decisões ficam visíveis no histórico;
  - timeline é ordenada cronologicamente.

### ISSUE-018 — Relatório por caso e agregado por período
- Papel principal: Gestão / Auditor / Administrador
- Tipo: História
- Descrição: Permitir consulta detalhada do caso e agregação de indicadores por período.
- Critérios de aceite:
  - filtro por caso, período, status e responsável funciona;
  - resumo do processo é exibido;
  - relatório pode ser exportado.

### ISSUE-019 — Visualização do fluxo completo da garantia
- Papel principal: Responsável técnico / Supervisor / Operador
- Tipo: Épico
- Descrição: Representar em uma tela os estados da garantia desde abertura até encerramento.
- Critérios de aceite:
  - todas as etapas aparecem em sequência;
  - etapa atual e pendências são diferenciadas;
  - histórico da etapa e responsável ficam registrados.

### ISSUE-020 — Auditoria e rastreabilidade do fluxo de garantia
- Papel principal: Administrador / Auditor
- Tipo: História
- Descrição: Garantir que todas as alterações de etapa, decisão e responsável tenham registro completo.
- Critérios de aceite:
  - cada mudança gera log com data, usuário e observação;
  - estados inconsistentes são bloqueados;
  - histórico é suficiente para auditoria e suporte.

### ISSUE-021 — Permissões por perfil e regras de acesso
- Papel principal: Administrador
- Tipo: Épico
- Descrição: Definir controle de acesso por perfil em todos os módulos.
- Critérios de aceite:
  - perfil e permissão são diferentes por função;
  - ações sensíveis ficam restritas;
  - dados financeiros e cadastrais são protegidos.

### ISSUE-022 — Logs de auditoria e rastreabilidade
- Papel principal: Administrador / Auditor
- Tipo: História
- Descrição: Registrar alterações de estado, responsáveis, anexos e decisões.
- Critérios de aceite:
  - toda ação relevante gera log;
  - auditor consegue consultar quem alterou o dado e quando;
  - logs podem ser relacionados a um caso específico.

### ISSUE-023 — Upload e gestão de documentos do processo
- Papel principal: Operador / Técnico / Logística
- Tipo: História
- Descrição: Permitir anexar fotos, laudos, comprovantes, notas e documentos internos a cada caso.
- Critérios de aceite:
  - documentos ficam vinculados ao processo correto;
  - anexos são exibidos por tipo e etapa;
  - arquivos ausentes geram pendência quando exigidos.

### ISSUE-024 — Visualização e controle de anexos por perfil
- Papel principal: Administrador / Supervisor
- Tipo: História
- Descrição: Ajustar visibilidade e permissões dos anexos conforme o tipo de usuário.
- Critérios de aceite:
  - dados sensíveis não são exibidos indevidamente;
  - perfil define acesso de leitura e edição;
  - anexos seguem regra de auditoria.

---

## 5. Prioridade sugerida para o Trello

### Prioridade alta
- ISSUE-001 Login e acesso por perfil
- ISSUE-003 Tela de triagem e classificação inicial
- ISSUE-006 Cadastro e registro de pedido de venda
- ISSUE-009 Registro de troca e origem do item
- ISSUE-012 Abertura de caso de garantia
- ISSUE-015 Dashboard operacional consolidado
- ISSUE-021 Permissões por perfil e regras de acesso

### Prioridade média
- ISSUE-004 Validar dados do cliente e do produto na triagem
- ISSUE-005 Status por etapa e fluxo guiado
- ISSUE-007 Validação comercial e financeira do pedido
- ISSUE-010 Avaliação da condição do item e análise da troca
- ISSUE-013 Análise técnica de garantia
- ISSUE-017 Timeline de eventos do processo
- ISSUE-019 Visualização do fluxo completo da garantia
- ISSUE-023 Upload e gestão de documentos do processo

### Prioridade baixa / fase 2
- ISSUE-008 Status, pendências e encaminhamento do pedido
- ISSUE-011 Documentação, anexos e logística da troca
- ISSUE-014 Encaminhamento e encerramento da garantia
- ISSUE-016 Ações rápidas e navegação de contexto
- ISSUE-018 Relatório por caso e agregado por período
- ISSUE-020 Auditoria e rastreabilidade do fluxo de garantia
- ISSUE-022 Logs de auditoria e rastreabilidade
- ISSUE-024 Visualização e controle de anexos por perfil

---

## 6. Observações finais

- A primeira rodada deve priorizar o fluxo principal: triagem → pedido ou troca ou garantia → acompanhamento → decisão → histórico.
- Autenticação, triagem e permissões precisam entrar antes dos módulos específicos.
- Status, auditoria e documentos são bases transversais para todos os fluxos.
- Esse backlog pode ser refinado em sprints futuras, com critérios de aceitação mais técnicos e por tela.

---

## 7. Estrutura recomendada do Trello

- Backlog geral
- Priorizado / Sprint 1
- Em desenvolvimento
- Revisão / QA
- Bloqueado
- Concluído

