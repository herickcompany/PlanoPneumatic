# Detalhamento de requisitos – Fluxo completo de garantia com múltiplos estados

## 1. Visão geral
O fluxo completo de garantia representa a jornada operacional do caso desde a abertura até o encerramento, incluindo todos os estados possíveis em que a solicitação pode ficar durante a análise. Esse fluxo não é apenas visual: ele organiza a lógica de negócio, a responsabilidade técnica, o histórico da operação e a relação com o cliente.

A principal função da tela de fluxo completo é transmitir, de forma clara e objetiva, em qual etapa o caso se encontra, o que falta para avançar, quem é responsável e qual foi a decisão final aplicada. Esse nível de transparência é essencial para reduzir erros, agilizar a análise e manter a rastreabilidade total do processo.

---

## 2. Objetivo da funcionalidade
- Acompanhar a garantia do início ao encerramento;
- Exibir todos os estados de cada caso em uma visão sequencial;
- Registrar quem participou de cada etapa;
- Facilitar a tomada de decisão técnica;
- Identificar pendências e bloqueios do processo;
- Dar visão clara do resultado final para cliente, gestão e operação.

---

## 3. Usuários
- Operador de triagem;
- Responsável técnico;
- Analista de garantia;
- Supervisor de operações;
- Administração;
- Gestor comercial;
- Cliente interno ou externo, quando houver visualização específica.

---

## 4. Contexto de uso
O usuário acessa o fluxo completo de garantia após a abertura do caso. A partir dali, ele acompanha todas as etapas do processo em formato sequencial, visualizando o estado atual, os eventos ocorridos e as pendências que precisam ser tratadas antes da conclusão.

A tela precisa dar resposta a perguntas fundamentais do usuário:
- Em que etapa o caso está?
- O que precisa acontecer para continuar?
- Existe alguma pendência crítica?
- Quem é o responsável?
- O caso já foi decidido?
- O resultado foi procedente ou improcedente?

---

## 5. Regras de negócio
- Todo caso de garantia deve iniciar em estado de abertura ou cadastro;
- A garantia deve evoluir por etapas lógicas: abertura, análise, decisão, encaminhamento e encerramento;
- O sistema deve impedir a finalização sem decisão técnica registrada;
- Não pode haver estado inconsistente, como “concluído” sem responsável e sem resultado final;
- O histórico da garantia deve registrar cada etapa, ação e responsável;
- Alterações de status devem ser rastreáveis e visíveis para auditoria;
- Casos com pendência devem permanecer visíveis e sinalizados de forma clara.

## 5.1 Estados esperados
Os estados do fluxo devem ser modelados como uma sequência clara e auditável:

1. Abertura / registro da garantia
2. Recebimento do produto
3. Análise inicial
4. Análise técnica
5. Análise concluída / pendente de decisão
6. Procedente
7. Improcedente
8. Encaminhamento
9. Encerramento
10. Cancelamento / revisão

Alguns fluxos podem variar conforme o cenário, mas a lógica base deve permanecer consistente.

---

## 6. Estrutura da tela

### 6.1 Layout geral
- sidebar lateral com navegação;
- cabeçalho institucional;
- título do processo e status atual;
- linha de fluxo com etapas sequenciais;
- cards de cada etapa com informações detalhadas;
- painel lateral para histórico e pendências;
- área de ações e acompanhamento.

### 6.2 Estrutura do fluxo
A tela deve apresentar uma sequência gráfica de etapas, com status visual por cada etapa:
- etapa concluída;
- etapa atual;
- etapa pendente;
- etapa bloqueada;
- etapa cancelada ou reprovada.

A organização do fluxo pode ser em um grid horizontal com cards em linha ou em uma visualização vertical em coluna, dependendo do nível de complexidade e da resolução da tela.

---

## 7. Requisitos funcionais

### RF01 – Visualização do fluxo completo
O sistema deve permitir visualizar todas as etapas do caso de garantia em uma sequência clara.

### RF02 – Status por etapa
Cada etapa do fluxo deve possuir visual de estado, como:
- concluída;
- ativa;
- pendente;
- bloqueada;
- com alerta;
- cancelada.

### RF03 – Registro do caso
O sistema deve permitir registrar:
- número do caso;
- cliente;
- produto;
- data de recebimento;
- responsável atual;
- status geral.

### RF04 – Abertura e recebimento
A tela deve registrar a abertura da garantia e o recebimento do item, com dados essenciais do produto e do cliente.

### RF05 – Análise inicial
O sistema deve permitir registrar a primeira avaliação do problema e identificar se o caso precisa de documentação adicional.

### RF06 – Análise técnica
O responsável técnico deve poder registrar:
- defeito encontrado;
- gravidade;
- observações;
- conclusão técnica;
- risco operacional, se houver.

### RF07 – Decisão final
O sistema deve permitir decidir entre:
- procedente;
- improcedente;
- pendente por informação;
- reabertura ou revisão.

### RF08 – Encaminhamento após decisão
O caso deve poder seguir para:
- reposição;
- troca;
- devolução;
- arquivamento;
- manutenção;
- reprocesso.

### RF09 – Encerramento
O sistema deve permitir encerrar o caso quando a decisão final, o responsável e a documentação estiverem completos.

### RF10 – Histórico do processo
Cada etapa do fluxo deve mostrar:
- data;
- responsável;
- observação;
- documentação associada;
- resultado.

### RF11 – Pendências
A interface deve indicar claramente:
- itens faltantes;
- processos bloqueados;
- divergências em análise;
- documentos pendentes;
- decisões sem confirmação.

### RF12 – Ações de execução
A tela deve permitir ações como:
- iniciar análise;
- salvar progresso;
- confirmar recebimento;
- gerar laudo;
- aprovar;
- rejeitar;
- encerrar;
- reabrir.

### RF13 – Documentos anexados
O sistema deve exibir documentos relevantes por etapa, como fotos, laudos, comprovantes e relatórios técnicos.

### RF14 – Acesso por perfil
A interface deve adaptar conteúdo e permissões conforme o perfil do usuário.

### RF15 – Auditoria
Toda alteração de etapa, decisão ou responsável deve ficar registrada com data e usuário.

---

## 8. Requisitos não funcionais

### RNF01 – Clareza visual
A sequência de etapas deve ser compreensível em poucos segundos.

### RNF02 – Consistência
O fluxo completo deve manter a mesma padronização de nomenclatura, status e cores usadas nas demais telas.

### RNF03 – Acessibilidade
A tela precisa garantir:
- contraste adequado;
- legibilidade de textos e chips;
- acesso por teclado e foco visível;
- ícones com textos ou rótulos associados.

### RNF04 – Performance
A tela deve carregar todas as etapas, anexos e histórico sem lentidão excessiva.

### RNF05 – Segurança
Dados confidenciais devem ser exibidos apenas conforme permissão.

### RNF06 – Rastreabilidade
O sistema deve manter histórico suficiente para auditoria, suporte e acompanhamento.

---

## 9. Estrutura de dados e informações por etapa

### 9.1 Etapa 1 – Abertura da garantia
Informações mínimas:
- número do caso;
- cliente;
- produto;
- data da abertura;
- responsável;
- status inicial.

### 9.2 Etapa 2 – Recebimento do produto
- data de recebimento;
- condição do item;
- responsável pelo recebimento;
- documento de entrada;
- fotos e observações.

### 9.3 Etapa 3 – Análise inicial
- avaliação preliminar;
- necessidade de documentação;
- risco identificado;
- observação do operador;
- pendência inicial.

### 9.4 Etapa 4 – Análise técnica
- defeito constatado;
- causa provável;
- laudo técnico;
- fotos e anexos;
- responsável técnico;
- conclusão.

### 9.5 Etapa 5 – Decisão final
- procedente ou improcedente;
- motivo base da decisão;
- responsável;
- data da decisão;
- validação final.

### 9.6 Etapa 6 – Encaminhamento
- reposição;
- troca;
- devolução;
- logística;
- manutenção;
- arquivamento.

### 9.7 Etapa 7 – Encerramento
- data do encerramento;
- usuário responsável;
- evidência do fechamento;
- status final.

---

## 10. Fluxo completo sugerido
1. Abertura da garantia;
2. Recebimento do produto;
3. Análise inicial;
4. Análise técnica;
5. Decisão comercial/técnica;
6. Procedente ou improcedente;
7. Encaminhamento do caso;
8. Encerramento;
9. Possibilidade de reabertura, revisão ou cancelamento.

Esse fluxo pode ser executado de forma linear ou com ramificações conforme o cenário.

---

## 11. Critérios de aceitação
- O usuário consegue ler o fluxo completo da garantia em uma única visão;
- Cada etapa mostra status, responsável e data;
- O processo permite diferenciar etapas concluídas, em andamento e pendentes;
- A tela expõe pendências e bloqueios visivelmente;
- O caso só pode ser encerrado com decisão registrada;
- O histórico da garantia é completo e auditável;
- O usuário consegue visualizar a conclusão final do caso sem perder o contexto do processo;
- A interface funciona com consistência visual em desktop.

---

## 12. Sugestão para reprodução no Figma
### Frame principal
- tamanho sugerido: 1440 x 1024;
- estrutura: 1 coluna principal com fluxo em linha + painel lateral.

### Camadas sugeridas
- background da aplicação;
- sidebar;
- cabeçalho do processo;
- barra de etapas ou cards de fluxo;
- card do caso atual;
- painel lateral de histórico;
- anexos e pendências;
- ações e botões.

### Componentes reutilizáveis
- card de etapa;
- chip de status;
- timeline de histórico;
- botão de ação;
- alertas de pendência;
- campo com observação;
- elemento de processo em linha.

### Regras visuais sugeridas
- etapa ativa em azul escuro;
- etapa concluída em verde;
- etapa pendente em cinza;
- etapa em alerta em laranja;
- etapa bloqueada ou cancelada em vermelho;
- espaçamento consistente entre cards;
- fonte legível, forte hierarquia e desenho simples.

---

## 13. Resumo executivo
O fluxo completo de garantia é a representação do ciclo de vida completo do caso. Ele vai além da tela de análise e oferece visão holística do processo, desde a abertura até o encerramento, permitindo que o usuário compreenda exatamente em que ponto o caso se encontra e o que precisa acontecer para seguir adiante.

Essa visão é crucial para aplicar o mesmo padrão de execução em todo o sistema, além de dar consistência ao acompanhamento do cliente e à operação interna.

---

## 14. Observações para implementação
- Continuar utilizando nomenclatura consistente em todas as telas;
- Garantir que os estados do processo sejam logicamente encadeados;
- Priorizar leitura rápida do fluxo e do status atual;
- Registrar cada alteração com data e responsável;
- Usar alertas e pendências para reduzir bloqueios operacionais;
- Preparar o sistema para futuras ações como reabertura, revisão e auditoria.
