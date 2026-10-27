-- Phase 3 wiki: personal vault + hardvault (deny-by-default).
-- Personal notes are never listed in hardvault search until published.

CREATE TABLE IF NOT EXISTS vault_personal_notes (
  id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body_md MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_vault_notes_owner (office_id, owner_user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hardvault_docs (
  id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  snippet VARCHAR(512) NOT NULL,
  body_md MEDIUMTEXT NOT NULL,
  source_note_id CHAR(36) NULL,
  published_by VARCHAR(64) NOT NULL,
  published_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  classification VARCHAR(32) NOT NULL DEFAULT 'interno',
  PRIMARY KEY (id),
  KEY idx_hardvault_office_published (office_id, published_at),
  KEY idx_hardvault_source_note (source_note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hardvault_acl (
  doc_id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  principal_type ENUM('user', 'role', 'office') NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (doc_id, principal_type, principal_id),
  KEY idx_hardvault_acl_office (office_id, principal_type, principal_id),
  CONSTRAINT fk_hardvault_acl_doc FOREIGN KEY (doc_id)
    REFERENCES hardvault_docs (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS vault_publish_requests (
  id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  note_id CHAR(36) NOT NULL,
  requested_by VARCHAR(64) NOT NULL,
  status ENUM('pending', 'published', 'rejected') NOT NULL DEFAULT 'pending',
  confirmed TINYINT(1) NOT NULL DEFAULT 0,
  hardvault_doc_id CHAR(36) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  decided_at TIMESTAMP(6) NULL,
  PRIMARY KEY (id),
  KEY idx_vault_publish_note (office_id, note_id),
  CONSTRAINT fk_vault_publish_note FOREIGN KEY (note_id)
    REFERENCES vault_personal_notes (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
