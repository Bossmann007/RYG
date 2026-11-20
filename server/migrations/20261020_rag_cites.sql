-- Cite ledger for a retrieval. No question text, no snippet, no vector.
-- Re-runnable through node scripts/apply-rag-cites.js.
CREATE TABLE IF NOT EXISTS rag_cites (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  case_id VARCHAR(64) NULL,
  release_id VARCHAR(32) NOT NULL,
  source_id VARCHAR(64) NULL,
  cite_status VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rag_cites_office_release (office_id, release_id)
);
