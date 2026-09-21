# Detalhamento de requisitos – Tela de Triagem

## 1. Visão geral
A tela de triagem é o ponto de entrada do processo de gestão de pedidos, devoluções, base de troca e garantias. O objetivo principal é permitir ao operador identificar rapidamente o tipo de caso, validar dados do cliente, do produto e do pedido, e direcionar o fluxo correto de trabalho.

A interface foi pensada para reduzir erros manuais, acelerar o atendimento e manter a rastreabilidade do processo por status.

---

## 2. Objetivo da funcionalidade
- Registrar e classificar a solicitação de triagem;
- Identificar se o caso é de triagem, pedido de venda, base de troca ou garantia;
- Validar dados essenciais do cliente e do produto;
- Iniciar o processo com regras de status e canais de acompanhamento;
- Apresentar ao usuário um fluxo visual claro para continuidade do atendimento.

---

## 3. Usuários
- Operador de triagem;
- Gestor/comercial;
- Responsável por garantia;
- Administrador do sistema.

---

## 4. Contexto de uso
O usuário acessa a tela após autenticação no sistema. A partir dela, ele seleciona o tipo de demanda e trabalha em uma sequência guiada de etapas. A interface precisa indicar claramente:

- que etapa está ativa;
- quais campos são obrigatórios;
- quais ações podem ser executadas;
- o status atual da solicitação.

## 4.1 Requisitos de negócio
A solução deve funcionar como centro operacional do atendimento, não apenas como uma interface estática. O sistema precisa:

- classificar corretamente cada entrada do processo;
- unificar os fluxos de pedido, troca e garantia em uma mesma jornada de atendimento;
- registrar cada decisão, responsável e data da etapa;
- permitir o acompanhamento rápido por status e histórico;
- reduzir retrabalho e erros de entrada manual;
- facilitar a tomada de decisão por parte do operador e do responsável técnico.

## 4.2 Regras de negócio
- Toda demanda deve ter origem, tipo, responsável e status obrigatórios;
- O tipo de demanda determina o fluxo e os campos exibidos;
- Um pedido de venda só pode avançar para triagem quando o cliente e o produto estiverem validados;
- A base de troca depende da existência de produto, motivo, condição e documentação mínima;
- A garantia depende do registro do produto, data de recebimento, análise e responsável técnico;
- Alterações em status devem registrar data, hora e usuário responsável;
- Processos incompletos devem permanecer visíveis e sinalizados como pendentes ou atenção;
- O sistema deve impedir a finalização de um processo sem a validação dos campos obrigatórios.

## 4.3 Casos de uso principais
### Caso de uso 1 – Registro de triagem
O operador inicia uma nova triagem, preenche os dados do cliente e do produto e escolhe o tipo de demanda.

### Caso de uso 2 – Pedido de venda
O usuário verifica dados do pedido, confirma quantidade, valor e documentação, e encaminha para aprovação ou continuidade.

### Caso de uso 3 – Base de troca
Após a entrada do produto, o sistema solicita motivo da troca, avaliação do item e definição de status do processo.

### Caso de uso 4 – Garantia
O responsável valida a peça recebida, define se é procedente ou improcedente e gera o encaminhamento adequado.

### Caso de uso 5 – Acompanhamento do processo
O usuário consulta o status da solicitação, histórico, observações e dados de responsáveis por etapa.

## 4.4 Estados do processo
Os estados devem ser consistentes e reutilizáveis em todas as telas:

- Criado;
- Em andamento;
- Aguardando documentação;
- Em análise;
- Aguardando aprovação;
- Procedente;
- Improcedente;
- Concluído;
- Cancelado;
- Encerrado.

Cada estado deve ter representação visual, descrição e indicação de responsável.

## 4.5 Dados mínimos obrigatórios por processo
### Pedido de venda
- cliente;
- representante;
- produto;
- código;
- quantidade;
- valor;
- documento/nota fiscal;
- status da análise.

### Base de troca
- cliente;
- item trocado;
- motivo da troca;
- condição do produto;
- quantidade;
- responsável;
- status atual.

### Garantia
- cliente;
- produto;
- número do pedido;
- data de recebimento;
- motivo da solicitação;
- análise técnica;
- resultado final;
- responsável pela analise.

---

## 5. Estrutura da tela

### 5.1 Layout geral
- Sidebar lateral esquerda com navegação principal;
- Área principal com cabeçalho e blocos de processo;
- Barra de etapas horizontal no topo do conteúdo principal;
- Cards organizados em quatro blocos principais de fluxo;
- Rodapé com legendas de status e atalhos rápidos.

### 5.2 Sidebar
- Logo/identidade da marca;
- Menu com grupos de acesso:
  - Triagem;
  - Pedido de venda;
  - Base de troca;
  - Garantias;
  - Pendências;
  - Relatórios;
  - Cadastros e configurações.
- Área de login/usuário com nome, perfil e botão de entrada;
- Rodapé com informações institucionais e direitos reservados.

### 5.3 Área principal
A área principal é dividida em:
1. Cabeçalho institucional;
2. Barra de etapas do processo;
3. Blocos de triagem e fluxo;
4. Legenda de status;
5. Informações importantes;
6. Acesso por perfil;
7. Atalhos rápidos.

---

## 6. Requisitos funcionais

### RF01 – Navegação por triagem
O sistema deve permitir ao usuário acessar a tela de triagem a partir do menu lateral.

### RF02 – Identificação do tipo de demanda
A interface deve permitir que o usuário identifique se a demanda é:
- Triagem;
- Pedido de venda;
- Base de troca;
- Garantia.

### RF03 – Validação de dados do cliente
O sistema deve apresentar os campos relacionados ao cliente, como:
- Nome;
- Documento;
- Representante comercial;
- Dados da empresa;
- Endereço de faturamento e entrega.

### RF04 – Validação de dados do produto
O sistema deve permitir a visualização e validação de:
- Produto;
- Código;
- Quantidade;
- Valor;
- Observações;
- Garantia associada.

### RF05 – Registro do pedido
O sistema deve permitir cadastrar ou consultar informações de pedido e documento vinculado.

### RF06 – Registro de base de troca
A tela deve dar suporte ao cadastro de itens para troca, incluindo:
- origem do pedido;
- retorno do produto;
- condição do item;
- justificativa;
- quantidade;
- status de análise.

### RF07 – Registro de garantia
A tela deve permitir registrar uma garantia recebida, com informações de:
- data de recebimento;
- produto;
- número do documento;
- responsável técnico;
- resultado da análise;
- status final.

### RF08 – Status por etapa
Cada etapa do processo deve ter indicadores visuais de status, como:
- Em andamento;
- Aguardando análise;
- Atenção;
- Concluído;
- Improcedente;
- Cancelado.

### RF09 – Fluxo guiado
A interface deve orientar o usuário por etapas sequenciais, destacando a etapa ativa e as etapas concluídas.

### RF10 – Botões de ação
Devem existir ações de:
- Continuar;
- Salvar;
- Voltar;
- Iniciar processo;
- Confirmar;
- Gerar laudo automático;
- Encerrar.

### RF11 – Validação obrigatória
Campos obrigatórios devem ser identificados visualmente e impedir avanço do processo quando vazios ou inválidos.

### RF12 – Histórico de processo
A tela deve exibir um histórico dos eventos do processo, incluindo:
- data;
- responsável;
- etapa;
- observações;
- documentos anexados.

### RF13 – Acesso por perfil
A interface deve ajustar o conteúdo e os botões de ação conforme o perfil do usuário:
- Operador;
- Responsável técnico;
- Administrador;
- Cliente/representante.

### RF14 – Responsividade
A interface deve ser legível e funcionar em telas desktop e tablet, com adequação visual sem perdas de alinhamento.

### RF15 – Automação de lembretes
O sistema deve permitir alertas e lembretes automáticos quando uma etapa exigir acompanhamento ou documentos pendentes.

### RF16 – Documentos e anexos
O sistema deve disponibilizar anexação de documentos e visualização de arquivos relacionados ao processo, como notas, fotos, laudos e comprovantes.

### RF17 – Nível de detalhamento por perfil
Cada perfil deve visualizar a informação necessária ao seu papel sem expor dados redundantes ou irrelevantes.

### RF18 – Persistência de situações intermedias
O sistema deve salvar progresso parcial do processo para evitar perda de informação em caso de saída inesperada.

### RF19 – Rastreabilidade de decisões
Toda alteração de status, atribuição de responsável ou análise precisa gerar um registro de auditoria.

### RF20 – Encaminhamento inteligente
Com base no status e na natureza da demanda, o sistema deve sugerir o próximo passo ou área responsável.

### RF21 – Comparativo de histórico
A interface pode exibir histórico comparando demanda atual com ocorrências anteriores do mesmo cliente, produto ou pedido.

### RF22 – Indicadores de risco
O sistema deve marcar casos com risco operacional, como falta de documentação, produto com defeito recorrente ou garantia anterior.

---

## 7. Requisitos não funcionais

### RNF01 – Usabilidade
A tela deve ser intuitiva, com hierarquia visual clara e pouca necessidade de treinamento.

### RNF02 – Consistência visual
Todos os cards e componentes devem seguir a mesma linguagem visual: cores, espaçamento, bordas e tipografia.

### RNF03 – Acessibilidade
- Contraste adequado;
- Ícones com texto complementar;
- Boas áreas de clique;
- Informações de status em texto e cor.

### RNF04 – Performance
A interface deve responder rapidamente às ações e carregar blocos sem atrasos perceptíveis.

### RNF05 – Segurança
Dados sensíveis devem ser exibidos apenas conforme permissões do perfil.

### RNF06 – Confiabilidade
O sistema deve preservar o estado atual, validar ações e evitar inconsistência de dados entre uma etapa e outra.

### RNF07 – Manutenibilidade
A estrutura da tela deve permitir evolução para novos módulos sem reescrever a base visual e funcional.

### RNF08 – Localização
A interface deve ser preparada para textos em português, com suporte a regras específicas de formatos e moedas.

---

## 8. Design system sugerido

### 8.1 Paleta principal
- Azul escuro: #0d2e5c
- Azul médio: #1e5a8a
- Azul claro: #dfeaf7
- Verde: #2fa75f
- Laranja: #f39c32
- Vermelho: #d94d4d
- Cinza fundo: #eef2f7
- Preto texto: #1f2937
- Branco: #ffffff

### 8.2 Tipografia
- Títulos: bold / semibold
- Labels: 12–14px
- Texto principal: 13–15px
- Botões: 13–14px

### 8.3 Componentes
- Cards com borda suave e sombra leve;
- Botões com altura fixa;
- Chips de status com cor identificável;
- Campos com borda clara e foco visível;
- Ícones simples e consistentes.

---

## 9. Fluxo ideal de operações
1. Usuário acessa triagem;
2. Seleciona a categoria da demanda;
3. Preenche dados do cliente e do produto;
4. Valida a documentação e o histórico;
5. Sistema indica o próximo passo;
6. Operador realiza ação conforme status;
7. O processo é registrado com data, hora e responsável;
8. O status é atualizado no painel de acompanhamento.

## 9.1 Jornada completa de usuário
A jornada real do usuário não termina na seleção do tipo de demanda. Ela se estende para:

- revisar a necessidade do cliente;
- confirmar ou corrigir dados do pedido;
- validar o nível de urgência;
- anexar documentação;
- encaminhar para a área correta;
- acompanhar o status até a conclusão;
- registrar resultado final e próximos passos.

## 9.2 Fluxo recomendado por etapa
### Etapa 1 – Cadastro inicial
- identificação do cliente;
- origem da solicitação;
- seleção do tipo de demanda;
- validação de documento e dados básicos.

### Etapa 2 – Dados do produto
- tipo de item;
- código;
- quantidade;
- valor;
- observações;
- vínculo com pedido anterior ou garantia.

### Etapa 3 – Análise
- verificação da documentação;
- classificação da ocorrência;
- definição da responsabilidade;
- alerta de pendência ou risco.

### Etapa 4 – Encaminhamento
- envio para responsável técnico;
- geração de ação ou laudo;
- confirmação de recebimento;
- atualização de status para o cliente ou interno.

### Etapa 5 – Conclusão
- status final registrado;
- processo com data, hora, usuário e histórico completo;
- possibilidade de nova abertura ou continuidade.

---

## 10. Critérios de aceitação
- A tela deve apresentar a navegação lateral e o bloco principal conforme a estrutura definida;
- Todos os principais módulos de triagem devem estar visíveis de forma organizada;
- O usuário deve conseguir identificar a etapa ativa em andamento;
- Cada status deve ter um visual distinto e legível;
- O processo deve permitir avanço sem ambiguidades;
- O histórico de processo deve ser facilmente consultável;
- A tela deve funcionar em desktop com leitura clara e alinhamento consistente;
- Campos obrigatórios devem ser sinalizados e bloquear continuidade inadequada;
- O sistema deve permitir rastreio completo do processo por usuário e data;
- O fluxo deve ser suficiente para sustentar as próximas telas do site sem conflitos de informação.

---

## 11. Sugestão para reprodução no Figma
Para reproduzir a interface no Figma, organize o arquivo em camadas e frames:

### Frame principal
- Tamanho: 1440 x 1024 (ou 1365 x 768 conforme necessidade da apresentação);
- Layout: 2 colunas;
  - Sidebar: 260px;
  - Conteúdo: restante da largura.

### Estrutura Figma
- Layer 1: background da aplicação;
- Layer 2: sidebar;
- Layer 3: cabeçalho institucional;
- Layer 4: barra de etapas;
- Layer 5: cards principais de triagem;
- Layer 6: cards de fluxo detalhado;
- Layer 7: legenda de status;
- Layer 8: rodapé / informações complementares.

### Componentes reutilizáveis
- Card de etapa;
- Card de produto;
- Chip de status;
- Botão primário;
- Botão secundário;
- Campo de texto;
- Ícone/emoji ou SVG de apoio.

### Regras de espaçamento
- Gap entre cards: 16px;
- Margem interna dos cards: 16px;
- Padding do sidebar: 20px;
- Espaçamento entre blocos: 24px;

---

## 12. Resumo executivo
A tela de triagem funciona como centro de gestão do atendimento, oferecendo visão geral do fluxo, validação de dados e controle de status. Sua principal característica é a clareza operacional: o usuário entende, em poucos segundos, onde está, o que precisa fazer e qual é o próximo passo no processo.

Ela deve servir como base de um ecossistema maior de processos, apoiando não apenas a entrada de dados, mas também as decisões de análise, o controle operacional e a rastreabilidade da demanda até o fim do ciclo.

---

## 13. Evolução para as próximas telas do site
A partir desta tela, o produto pode evoluir para:

- dashboard de acompanhamento geral;
- tela de relatório por status;
- painel de pendências e alertas;
- histórico por cliente e produto;
- página de detalhe da garantia;
- módulo de base de troca com listagem e filtros;
- gestão de usuários e permissões por perfil;
- tela de auditoria e logs de operação.

Essas telas devem manter a mesma linguagem visual e a mesma lógica de status para garantir consistência do sistema.

---

## 14. Observações para implementação
- Priorizar clareza visual sobre excesso de dados;
- Segmentar informações por bloco para facilitar leitura;
- Usar ícones de status para reduzir ambiguidades;
- Mantenha consistência entre os estados ativos e inativos;
- Garantir que a tela possa evoluir para módulos de fluxo mais detalhados;
- Definir regras de validação antes da implementação front-end para evitar retrabalho;
- Criptografar e controlar permissões de dados sensíveis;
- Registrar cada ação do processo para controle interno e auditoria.

---

## 15. Conclusão
Este documento deve ser usado como base de negócio e de UX para a construção do protótipo e para a evolução das telas subsequentes. A intenção é que a visão da aplicação seja mais completa do que o protótipo visual, cobrindo também regras de processo, responsabilidades, validações e rastreabilidade operacional.

Ao seguir esse nível de detalhamento, a equipe de design, produto e tecnologia consegue construir uma solução mais coerente, escalável e alinhada ao fluxo real de negócio.
