-- Deadline storage for the Prazo UI contract. Apply via `pnpm --dir server run prazos:apply`.
CREATE TABLE IF NOT EXISTS prazos (
  id INT NOT NULL AUTO_INCREMENT,
  processo_id BIGINT(20) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  tipo ENUM('manifestacao', 'recurso', 'prova', 'audiencia', 'interno', 'outro') NOT NULL,
  data_vencimento DATE NOT NULL,
  data_inicio DATE DEFAULT NULL,
  quantidade_dias INT UNSIGNED NOT NULL,
  contagem ENUM('uteis', 'corridos') NOT NULL,
  status ENUM('aberto', 'a_vencer', 'vencido', 'cumprido', 'suspenso') NOT NULL DEFAULT 'aberto',
  responsavel VARCHAR(255) NOT NULL,
  gatilho TEXT NOT NULL,
  gatilho_fonte ENUM('datajud', 'acervo_interno', 'inferencia', 'indisponivel') NOT NULL,
  observacoes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prazos_office_processo (office_id, processo_id),
  KEY idx_prazos_processo_status_vencimento (processo_id, status, data_vencimento),
  CONSTRAINT fk_prazos_processo FOREIGN KEY (processo_id)
    REFERENCES processos (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
