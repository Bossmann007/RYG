-- Wiki personal vault + office hardvault (Phase 3 Task 3.1).
-- Personal notes are never hardvault-searchable until an explicit publish
-- creates a hardvault_docs row. Re-runnable through apply-wiki-vault.js.
CREATE TABLE IF NOT EXISTS vault_personal_notes (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vault_personal_notes_office_owner (office_id, owner_id)
);

CREATE TABLE IF NOT EXISTS hardvault_docs (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  source_note_id VARCHAR(32) NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  published_by VARCHAR(64) NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hardvault_docs_office (office_id),
  KEY idx_hardvault_docs_office_source (office_id, source_note_id)
);

-- Deny-by-default ACL: a hardvault doc is readable only when a matching
-- principal row exists for the requesting office.
CREATE TABLE IF NOT EXISTS hardvault_acl (
  office_id VARCHAR(64) NOT NULL,
  doc_id VARCHAR(32) NOT NULL,
  principal_type VARCHAR(16) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  permission VARCHAR(16) NOT NULL,
  PRIMARY KEY (doc_id, principal_type, principal_id),
  KEY idx_hardvault_acl_office_doc (office_id, doc_id)
);

CREATE TABLE IF NOT EXISTS hardvault_publish_requests (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  note_id VARCHAR(32) NOT NULL,
  requested_by VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP NULL,
  decided_by VARCHAR(64) NULL,
  PRIMARY KEY (id),
  KEY idx_hardvault_publish_requests_office_note (office_id, note_id),
  KEY idx_hardvault_publish_requests_office_status (office_id, status)
);
