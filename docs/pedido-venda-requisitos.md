# Detalhamento de requisitos – Tela de Pedido de Venda

## 1. Visão geral
A tela de pedido de venda é o módulo responsável por registrar, validar e acompanhar as vendas realizadas antes do encaminhamento para processamento, base de troca ou garantia. Ela funciona como o ponto de consolidação das informações comerciais e operacionais de um pedido, garantindo que o cliente, o produto, a quantidade, o valor e a documentação estejam consistentes antes de prosseguir no fluxo.

A interface precisa ser clara e objetiva, pois o usuário geralmente precisa validar vários dados em poucos segundos. O mesmo pedido também pode ser consultado em etapas posteriores, por isso a tela deve manter histórico, status e rastreabilidade do processo.

---

## 2. Objetivo da funcionalidade
- Registrar um pedido de venda de forma estruturada;
- Validar dados do cliente e do produto antes da continuidade do processo;
- Permitir acompanhamento do status do pedido;
- Facilitar o fluxo de aprovação, faturamento e processamento;
- Reduzir retrabalho e inconsistências de venda;
- Apoiar a integração entre comercial, operação e garantia.

---

## 3. Usuários
- Operador de triagem;
- Analista comercial;
- Responsável de vendas;
- Administrador do sistema;
- Responsável técnico;
- Supervisor operacional.

---

## 4. Contexto de uso
O usuário entra na tela após identificar que a demanda corresponde a um pedido de venda. Nessa etapa, ele verifica se os dados do cliente e do produto foram preenchidos corretamente e, em seguida, avança para aprovação, processamento ou encaminhamento para outra área.

A tela precisa permitir:
- visualização rápida do pedido;
- validação de campos obrigatórios;
- identificação do status da venda;
- confirmação ou ajuste de dados antes do processamento;
- acesso ao histórico e documentos relacionados.

---

## 5. Regras de negócio
- Todo pedido deve ter cliente, produto, quantidade, valor e status obrigatórios;
- O pedido só pode ser processado quando não houver pendências críticas;
- A alteração de dados do pedido deve ser registrada com data, hora e usuário;
- Caso exista divergência entre pedido e produção, o sistema deve sinalizar para revisão;
- O pedido pode ser encaminhado para faturamento, logística, garantia ou base de troca, dependendo do cenário;
- O status deve refletir a etapa atual e permitir acompanhamento em tempo real;
- O sistema deve impedir o encerramento do pedido se houver dados obrigatórios ausentes.

### Regras de validação
- Cliente sem documento ou cadastro incompleto: bloqueia avanço;
- Produto sem código ou descrição válida: bloqueia avanço;
- Quantidade ou valor em branco: impede processamento;
- Pedido com inconsistência entre documentação e produto: sinaliza atenção;
- Caso de devolução ou troca futura: o pedido deve ficar associado ao histórico do cliente e do item.

---

## 6. Estrutura da tela

### 6.1 Layout geral
A tela deve seguir a estrutura padrão do sistema:
- sidebar lateral com navegação;
- cabeçalho institucional;
- barra de etapas do processo;
- área principal com dados do pedido;
- painel lateral com resumo e ações;
- histórico e observações;
- rodapé com status e informações complementares.

### 6.2 Blocos principais
1. Cabeçalho do pedido
2. Dados do cliente
3. Dados do produto
4. Dados comerciais e financeiros
5. Documentos e anexos
6. Status e histórico
7. Ações do fluxo

---

## 7. Requisitos funcionais

### RF01 – Acesso à tela
O sistema deve permitir que o usuário acesse a tela de pedido de venda pela navegação principal.

### RF02 – Cadastro de pedido
O sistema deve permitir cadastrar um novo pedido com campo de identificação da origem, cliente e produto.

### RF03 – Dados do cliente
A tela deve exibir e permitir edição de:
- nome do cliente;
- documento/CPF/CNPJ;
- representante comercial;
- endereço de faturamento;
- tipo de operação;
- status do cliente.

### RF04 – Dados do produto
A tela deve apresentar:
- código do produto;
- descrição;
- categoria;
- quantidade;
- unidade;
- valor unitário;
- valor total;
- observações técnicas.

### RF05 – Dados comerciais
A tela deve permitir visualizar e atualizar:
- canal de venda;
- vendedor responsável;
- data do pedido;
- prazo previsto;
- condições de pagamento;
- frete e logística;
- percentual de desconto, se houver.

### RF06 – Validação de preço e quantidade
O sistema deve verificar se os valores e quantidades informados estão coerentes com o contrato ou pedido anterior.

### RF07 – Documento do pedido
A tela deve permitir associar ao pedido:
- nota fiscal;
- contrato;
- pedido comercial;
- anexos complementares;
- comprovante de entrega ou transporte.

### RF08 – Status do pedido
A tela deve exibir status como:
- em cadastro;
- em análise;
- pendente documentação;
- aprovado;
- em faturamento;
- processando;
- concluído;
- cancelado.

### RF09 – Ações do fluxo
Os usuários devem poder realizar ações como:
- salvar;
- continuar;
- atualizar dados;
- aprovar pedido;
- enviar para faturamento;
- cancelar pedido;
- gerar documentos.

### RF10 – Histórico de alterações
O sistema deve registrar as mudanças no pedido, incluindo:
- data;
- usuário que alterou;
- campo alterado;
- motivo da alteração.

### RF11 – Anexos e observações
A interface deve permitir inserção de observações internas e anexos relevantes, com visibilidade conforme o perfil do usuário.

### RF12 – Acompanhamento de pendências
O sistema deve sinalizar pendências críticas e mostrar quais itens ainda precisam ser revisados antes do processo continuar.

### RF13 – Acesso por perfil
A tela deve adaptar o conteúdo e ações de acordo com o perfil:
- operador;
- vendedor;
- responsável de faturamento;
- administrador.

### RF14 – Visualização resumida e detalhada
O usuário deve poder alternar entre:
- visão resumida do pedido;
- visão detalhada com todos os campos e anexos.

### RF15 – Integração com outros módulos
A tela deve permitir que o pedido seja encaminhado para:
- triagem;
- logística;
- garantia;
- base de troca;
- faturamento.

---

## 8. Requisitos não funcionais

### RNF01 – Usabilidade
A tela deve ser intuitiva, com pouca curva de aprendizagem e organização por blocos lógicos.

### RNF02 – Consistência visual
Os componentes devem usar a mesma linguagem do restante do sistema: botões, chips, cards, status e tipografia.

### RNF03 – Acessibilidade
A tela precisa garantir:
- contraste adequado;
- foco visível em campos;
- texto legível;
- ícones com rótulo associado;
- componentes com acessibilidade suficiente para teclado e leitura assistiva.

### RNF04 – Performance
A tela deve responder rapidamente à edição dos campos e carregamento de anexos ou históricos.

### RNF05 – Segurança
Dados financeiros e cadastrais devem estar protegidos por permissões adequadas.

### RNF06 – Confiabilidade
O sistema deve evitar perda de informação em navegação, autosave ou troca de etapas.

---

## 9. Estrutura de informação sugerida

### 9.1 Cabeçalho do pedido
- número do pedido;
- data de criação;
- cliente;
- status atual;
- responsável;
- botão de ação principal.

### 9.2 Bloco de cliente
- nome;
- documento;
- contato;
- endereço;
- representante comercial;
- classificação do cliente.

### 9.3 Bloco de produto
- código;
- descrição;
- categoria;
- quantidade;
- valor unitário;
- valor total;
- observações.

### 9.4 Bloco financeiro/comercial
- forma de pagamento;
- valor total;
- condições;
- canal de vendas;
- tipo de entrega;
- prazo;
- vendedor responsável.

### 9.5 Painel lateral
- status do pedido;
- pendências;
- documentos anexados;
- histórico resumido;
- ações rápidas.

---

## 10. Status e fluxo sugerido
Os estados mais comuns para o pedido devem ser:
- Em cadastro;
- Aguardando validação;
- Em revisão;
- Aprovado;
- Em faturamento;
- Processando;
- Concluído;
- Cancelado;
- Pendência documental.

O status deve sempre ser visualizado em destaque no topo da tela.

---

## 11. Critérios de aceitação
- O usuário consegue cadastrar um pedido novo sem ambiguidade;
- Os dados principais do cliente e do produto são visíveis no topo da tela;
- Campos obrigatórios são sinais visuais e bloqueiam avanço caso vazios;
- O sistema apresenta pendências antes do processamento;
- O pedido pode ser salvo e retomado depois;
- O histórico é rastreável por data, usuário e ação;
- O status do pedido é atualizado de forma consistente;
- O usuário consegue encaminhar o pedido para o próximo módulo sem perder contexto;
- A interface funciona em desktop com leitura clara e organização visual consistente.

---

## 12. Sugestão para reprodução no Figma
### Frame principal
- tamanho sugerido: 1440 x 1024;
- estrutura em 3 colunas principais:
  - sidebar;
  - conteúdo principal;
  - painel lateral de resumo.

### Camadas sugeridas
- background da aplicação;
- sidebar;
- cabeçalho do sistema;
- barra de etapas;
- bloco de dados do cliente;
- bloco de dados do produto;
- bloco financeiro/comercial;
- painel lateral de status;
- histórico;
- ações.

### Componentes reutilizáveis
- card de cadastro;
- input de texto;
- combobox/select;
- botão primário;
- botão secundário;
- chip de status;
- lista de pendências;
- timeline de histórico.

### Espaçamento recomendado
- padding dos cards: 16px;
- gap entre seções: 18px;
- borda suave e shadow leve;
- títulos em destaque com uppercase ou semibold;
- status com chips de cor por categoria.

---

## 13. Resumo executivo
A tela de pedido de venda deve funcionar como o coração do processo comercial. Ela centraliza os dados do cliente, do produto e do negócio em um único ponto, permitindo validá-los rapidamente e encaminhar o pedido para o próximo estágio com segurança.

Mais do que um cadastro, ela representa o controle operacional do fluxo comercial, com rastreabilidade, validação de regras e acompanhamento de pendências.

---

## 14. Observações para implementação
- Priorizar clareza e velocidade de uso;
- Manter a lógica de status consistente com a triagem e as telas seguintes;
- Separar visualmente dados operacionais de dados financeiros;
- Garantir que o fornecedor ou cliente consiga perceber rapidamente o que falta para aprovação;
- Usar histórico e pendências para reduzir retrabalho e erros de processamento;
- Preparar a tela para futuras integrações com faturamento, logística e garantia.
