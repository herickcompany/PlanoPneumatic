-- Pedido de venda (pedido da Plano, nov/2026):
-- 1) Observacao por item e marcacao de "base de troca" (a peca gera debito de carcaca automaticamente).
-- 2) Informacoes que devem constar na nota fiscal (separadas das observacoes internas).
-- 3) Vendedor e prazo padrao do cliente vindos do Omie (cadastro do cliente > recomendacoes).

ALTER TABLE case_items
  ADD COLUMN IF NOT EXISTS notes VARCHAR(500),
  ADD COLUMN IF NOT EXISTS carcass BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Vendedores e condicoes de pagamento (parcelas) do Omie, para mostrar nomes no lugar de codigos.
CREATE TABLE IF NOT EXISTS omie_sellers (
  code BIGINT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS omie_payment_terms (
  code VARCHAR(20) PRIMARY KEY,
  description VARCHAR(120) NOT NULL,
  installments INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS omie_seller_code BIGINT,
  ADD COLUMN IF NOT EXISTS omie_payment_code VARCHAR(20);

-- Historico de precos: busca de itens de pedidos do app por codigo de produto.
CREATE INDEX IF NOT EXISTS case_items_product_code_idx ON case_items(lower(product_code));
