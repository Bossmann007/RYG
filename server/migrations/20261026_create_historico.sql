-- Case movements / andamentos for hub PMS (Phase 2.5).
CREATE TABLE IF NOT EXISTS historico (
  id INT NOT NULL AUTO_INCREMENT,
  processo_id BIGINT(20) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  data DATE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  detalhe TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_historico_office_processo (office_id, processo_id, data),
  CONSTRAINT fk_historico_processo FOREIGN KEY (processo_id)
    REFERENCES processos (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
