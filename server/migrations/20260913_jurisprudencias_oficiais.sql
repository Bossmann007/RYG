-- Official TJPR portal juris provenance + citation eligibility.
-- Seed placeholders move to jurisprudencias_seed_quarantine; do not cite them.

CREATE TABLE IF NOT EXISTS jurisprudencias_seed_quarantine (
  id BIGINT NOT NULL,
  processo_id INT NOT NULL,
  numero_cnj VARCHAR(32) NOT NULL,
  process_number VARCHAR(64) NOT NULL,
  acordao VARCHAR(128) NOT NULL,
  court VARCHAR(64) NOT NULL,
  chamber VARCHAR(255) NOT NULL,
  reporter VARCHAR(128) NOT NULL,
  date VARCHAR(32) NOT NULL,
  status VARCHAR(64) NOT NULL,
  alignment VARCHAR(16) NOT NULL,
  ementa TEXT NOT NULL,
  pontos_json JSON NOT NULL,
  essencial_json JSON NOT NULL,
  fortalecer_json JSON NOT NULL,
  blindar_json JSON NOT NULL,
  contrapor_json JSON NOT NULL,
  seed_fonte VARCHAR(64) NOT NULL,
  aviso_fonte VARCHAR(255) NULL,
  quarantined_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_juris_seed_q_processo (processo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE jurisprudencias
  ADD COLUMN IF NOT EXISTS citavel BOOLEAN NOT NULL DEFAULT FALSE AFTER aviso_fonte,
  ADD COLUMN IF NOT EXISTS source_document_id VARCHAR(64) NULL AFTER citavel,
  ADD COLUMN IF NOT EXISTS source_url TEXT NULL AFTER source_document_id,
  ADD COLUMN IF NOT EXISTS source_retrieved_at DATETIME(3) NULL AFTER source_url,
  ADD COLUMN IF NOT EXISTS ementa_sha256 CHAR(64) NULL AFTER source_retrieved_at,
  ADD COLUMN IF NOT EXISTS relation VARCHAR(32) NULL AFTER ementa_sha256,
  ADD COLUMN IF NOT EXISTS fonte VARCHAR(32) NOT NULL DEFAULT 'acervo_interno' AFTER relation;

-- TiDB may not support ADD COLUMN IF NOT EXISTS on older versions; script handles fallback.
