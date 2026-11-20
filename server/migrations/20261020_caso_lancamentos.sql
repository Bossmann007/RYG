-- Case ledger (Phase 7, ADR 0006). Honorários, custas, and frozen faturas. BRL centavos only.
-- kind and status are VARCHAR on purpose: Nest rejects a bad value, the column does not.
-- No DELETE path exists for these rows.
-- Re-runnable through `node scripts/apply-caso-lancamentos.js`.
CREATE TABLE IF NOT EXISTS caso_lancamentos (
  id VARCHAR(20) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  caso_id VARCHAR(64) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  descricao VARCHAR(160) NOT NULL,
  centavos BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  fatura_id VARCHAR(20) NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_caso_lancamentos_office_caso (office_id, caso_id)
);
