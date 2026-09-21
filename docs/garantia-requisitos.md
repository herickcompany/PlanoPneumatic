# Detalhamento de requisitos – Tela de Garantia

## 1. Visão geral
A tela de garantia é o módulo responsável por registrar, analisar e concluir o processo de garantia de um produto recebido, seja por defeito, falha operacional, não conformidade ou condição de uso inadequada. Ela funciona como o ponto central para avaliar se a garantia é procedente ou improcedente, registrar a responsabilidade técnica, documentar a análise e encaminhar a conclusão do caso.

O módulo exige rigor porque envolve a relação entre cliente, produto, análise técnica e decisão final. Além disso, a garantia impacta diretamente a experiência do cliente, o controle interno da operação e a manutenção do histórico do produto.

---

## 2. Objetivo da funcionalidade
- Registrar a solicitação de garantia;
- Validar o produto recebido e a procedência da solicitação;
- Registrar a análise técnica do defeito;
- Definir se a garantia é procedente ou improcedente;
- Encaminhar o caso para o próximo passo conforme a decisão;
- Manter rastreabilidade e histórico do processo.

---

## 3. Usuários
- Operador de triagem;
- Responsável técnico;
- Analista de garantia;
- Supervisor de operações;
- Administrador;
- Representante comercial.

---

## 4. Contexto de uso
O usuário acessa a tela quando a solicitação foi identificada como garantia. Nessa etapa, ele registra a operação, valida a existência ou não de defeito, insere a análise técnica e define o resultado final do processo.

A tela precisa permitir:
- identificação do cliente e produto;
- registro da data e do número de documento;
- avaliação do tipo de defeito;
- análise técnica e decisão final;
- acompanhamento do status do processo;
- emissão de conclusão ou retorno ao fluxo.

---

## 5. Regras de negócio
- Toda garantia precisa ter cliente, produto, data de recebimento, status e responsável;
- O produto e o pedido de origem devem estar vinculados ao caso;
- A garantia deverá ser classificada como procedente, improcedente ou em análise;
- O processo depende da validação do responsável técnico;
- Caso exista evidência de defeito de fabricação, o processo tende a ser procedente;
- Caso o problema seja comprovadamente decorrente de uso indevido, falta de manutenção ou dano externo, o processo pode ser improcedente;
- Nenhuma garantia pode ser encerrada sem registro do responsável e da decisão final;
- O sistema deve manter histórico completo da análise para auditoria e defesa operacional.

### Regras de validação
- Cliente sem cadastro completo: bloqueia registro inicial;
- Produto sem dados essenciais: bloqueia avanço;
- Falta de documentação de entrada: gera pendência;
- Sem análise técnica: bloqueia finalização;
- Garantia com defeito recorrente ou risco operacional: exige revisão mais rigorosa.

---

## 6. Estrutura da tela

### 6.1 Layout geral
- sidebar lateral;
- cabeçalho institucional;
- barra de etapas do processo;
- área principal com dados do cliente e produto;
- quadro de análise técnica;
- painel lateral com dados de status, histórico e ações;
- rodapé com informações complementares.

### 6.2 Blocos principais
1. Cabeçalho da garantia
2. Dados do cliente e do pedido
3. Dados do produto e recebimento
4. Análise técnica e decisão
5. Documentação e anexos
6. Status do processo
7. Ações de análise, aprovação e encerramento

---

## 7. Requisitos funcionais

### RF01 – Acesso à tela
O sistema deve permitir o acesso à tela de garantia pela navegação principal.

### RF02 – Registro da garantia
O sistema deve permitir abrir um novo caso de garantia com dados do cliente, produto e entrada do item.

### RF03 – Dados do cliente
A tela deve exibir ou permitir atualizar:
- nome do cliente;
- documento;
- representante;
- endereço;
- contato;
- pedido de origem.

### RF04 – Dados do produto
A tela deve apresentar:
- código do produto;
- descrição;
- lote ou identificação;
- quantidade;
- data de recebimento;
- data de fabricação, se disponível;
- condição do item.

### RF05 – Registro de recebimento
A tela deve permitir registrar:
- data de recebimento;
- tipo de entrada;
- local de recebimento;
- responsável do recebimento;
- documento relacionado.

### RF06 – Análise técnica
A tela deve permitir registrar:
- defeito identificado;
- observações técnicas;
- fator de causa provável;
- avaliação do responsável técnico;
- fotos ou arquivos de apoio.

### RF07 – Decisão da garantia
A interface deve permitir classificar a garantia como:
- procedente;
- improcedente;
- pendente de análise;
- em validação final;
- concluída.

### RF08 – Status do processo
A tela deve exibir status como:
- em cadastro;
- aguardando análise;
- em análise;
- peça em validação;
- procedente;
- improcedente;
- concluída;
- encerrada.

### RF09 – Documentação e anexos
A interface deve permitir anexar:
- fotos do item;
- laudo técnico;
- nota fiscal;
- comprovante de entrega;
- documentos de garantia ou recebimento.

### RF10 – Ações do fluxo
Devem existir ações como:
- salvar;
- continuar;
- iniciar análise;
- concluir análise;
- aprovar garantia;
- rejeitar garantia;
- solicitar complementariedade;
- encerrar processo.

### RF11 – Histórico de decisão
A tela deve manter um histórico com:
- data;
- responsável;
- etapa;
- decisão final;
- observações.

### RF12 – Pendências
O sistema deve sinalizar pendências como:
- documentação ausente;
- produto sem histórico;
- laudo incompleto;
- análise sem responsável;
- garantia sem conclusão documental.

### RF13 – Acesso por perfil
A interface deve ajustar ações conforme o perfil:
- operador;
- técnico;
- supervisor;
- administrador.

### RF14 – Avaliação de risco
O sistema deve permitir destacar casos com risco operacional, defeitos recorrentes ou necessidade de atenção especial.

### RF15 – Encaminhamento posterior
Depois da decisão final, o processo deve poder continuar para:
- reposição;
- devolução;
- troca;
- faturamento;
- manutenção;
- arquivamento.

---

## 8. Requisitos não funcionais

### RNF01 – Usabilidade
A tela deve ser clara e objetiva, reduzindo a necessidade de treinamento longo.

### RNF02 – Consistência visual
A tela deve manter a mesma linguagem visual do restante do sistema.

### RNF03 – Acessibilidade
A interface deve apresentar:
- contraste adequado;
- texto legível;
- foco em campos e botões;
- ícones com rótulos;
- boa organização visual.

### RNF04 – Performance
O sistema deve processar ações como upload, análise e mudança de status de forma rápida.

### RNF05 – Segurança
Dados do cliente e do produto devem estar protegidos por permissão adequada.

### RNF06 – Auditoria
Toda ação relevante deve ser registrada com usuário, data e motivo da alteração.

---

## 9. Estrutura de informação sugerida

### 9.1 Cabeçalho da garantia
- número da garantia;
- data do recebimento;
- cliente;
- produto;
- status atual;
- responsável ativo.

### 9.2 Dados do cliente e do pedido
- nome do cliente;
- documento;
- contato;
- pedido de origem;
- representante;
- tipo de operação.

### 9.3 Dados do produto
- código;
- descrição;
- modelo;
- data de recebimento;
- lote, se aplicável;
- condição do produto;
- quantidade.

### 9.4 Análise técnica
- defeito reportado;
- avaliação técnica;
- causa provável;
- indicação de procedência;
- observações do técnico.

### 9.5 Documentação e anexos
- fotos;
- nota fiscal;
- comprovante de entrega;
- laudo técnico;
- outros anexos relevantes.

### 9.6 Painel lateral
- status do processo;
- pendências;
- datas de eventos;
- próximo passo;
- histórico resumido;
- ações rápidas.

---

## 10. Fluxo sugerido
1. Usuário acessa a garantia;
2. Registra dados do cliente e do produto;
3. Define data de recebimento e documentação;
4. Inicia análise técnica;
5. Registra defeito e observações;
6. Anexa fotos ou laudo;
7. Classifica a garantia como procedente ou improcedente;
8. Emite conclusão com histórico e responsável;
9. Encaminha para reposição, troca, devolução ou encerramento;
10. Finaliza o processo com registro completo.

---

## 11. Critérios de aceitação
- O usuário consegue abrir e completar um caso de garantia sem ambiguidade;
- O produto e o cliente ficam claramente identificados;
- O processo exige análise técnica antes da conclusão;
- Status e pendências são visíveis com clareza;
- A decisão final está associada a responsável e data;
- A tela permite anexar documentos e fotos;
- O caso pode ser encaminhado para o próximo módulo sem perda de contexto;
- O histórico da garantia é rastreável e auditável;
- A interface funciona em desktop com organização visual consistente.

---

## 12. Sugestão para reprodução no Figma
### Frame principal
- tamanho sugerido: 1440 x 1024;
- estrutura em 3 partes principais:
  - sidebar;
  - conteúdo principal;
  - painel lateral de status e ações.

### Camadas sugeridas
- background da aplicação;
- sidebar;
- cabeçalho;
- etapas do processo;
- bloco de dados do cliente;
- bloco de dados do produto;
- bloco de análise técnica;
- painel de pendências e anexos;
- histórico e ações.

### Componentes reutilizáveis
- card de dados;
- chip de status;
- botão primário;
- botão secundário;
- campo de texto;
- textarea;
- upload de arquivo;
- timeline de histórico.

### Espaçamento recomendado
- padding de cards: 16px;
- gap entre blocos: 16–20px;
- status com cores para procedente, improcedente e pendente;
- botões com padrões claros para aprovação ou encerramento.

---

## 13. Resumo executivo
A tela de garantia é o ponto de decisão técnica e operacional do processo. Ela centraliza dados do cliente, do produto, do histórico e da análise do defeito, permitindo uma decisão final mais segura e consistente.

Além disso, essa funcionalidade tem papel estratégico no relacionamento com o cliente, pois evita retrabalho, documenta a decisão corretamente e oferece transparência sobre o que foi analisado e confirmado.

---

## 14. Observações para implementação
- Manter a mesma linguagem visual do fluxo anterior;
- Diferenciar claramente procedente, improcedente e pendente;
- Garantir a presença do responsável técnico na análise final;
- Impedir encerramento sem decisão registrada;
- Registrar a auditoria completa do caso;
- Preparar a tela para integração com devolução, troca, reposição e logística.
