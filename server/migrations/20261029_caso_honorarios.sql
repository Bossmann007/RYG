-- Phase 7: append-only honorários per case (centavos BRL).
CREATE TABLE IF NOT EXISTS caso_honorarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  office_id VARCHAR(64) NOT NULL,
  caso_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'contratado',
  amount_centavos BIGINT NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_honorarios_office_caso (office_id, caso_id),
  CONSTRAINT chk_honorarios_kind CHECK (kind IN ('contratado')),
  CONSTRAINT chk_honorarios_amount CHECK (amount_centavos >= 0)
);
