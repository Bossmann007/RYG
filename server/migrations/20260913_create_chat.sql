-- Persistent process chat for the explicitly enabled local demo.
-- No seed data: every row must come from an actual user submission.
CREATE TABLE IF NOT EXISTS chat (
  id CHAR(36) NOT NULL,
  processo_id BIGINT(20) NOT NULL,
  remetente_nome VARCHAR(128) NOT NULL,
  remetente_papel VARCHAR(64) NOT NULL,
  remetente_simulado TINYINT(1) NOT NULL DEFAULT 1,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_chat_processo_created_id (processo_id, created_at, id),
  CONSTRAINT fk_chat_processo FOREIGN KEY (processo_id)
    REFERENCES processos (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
