-- Phase 6: append-only cite ledger for RAG consult (derived index stays Nest-side in v0).
-- Re-runnable through `pnpm --dir server run rag:apply`.

CREATE TABLE IF NOT EXISTS rag_cite_ledger (
  id VARCHAR(64) NOT NULL,
  office_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  caso_id VARCHAR(64) NULL,
  source_id VARCHAR(64) NOT NULL,
  release_id VARCHAR(64) NULL,
  cite_status VARCHAR(32) NOT NULL,
  query_text VARCHAR(512) NOT NULL,
  runtime VARCHAR(32) NOT NULL DEFAULT 'consult',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rag_cite_office_created (office_id, created_at)
);
