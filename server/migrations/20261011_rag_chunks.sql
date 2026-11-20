CREATE TABLE IF NOT EXISTS rag_chunks (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  case_id VARCHAR(64) NULL,
  doc_id VARCHAR(64) NOT NULL,
  snippet VARCHAR(160) NOT NULL,
  embed_tag VARCHAR(64) NOT NULL,
  embed_digest CHAR(12) NOT NULL,
  embedding VECTOR(768) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_rag_chunks_office (office_id)
);
