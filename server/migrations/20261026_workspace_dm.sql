-- Workspace DMs + mention index (Phase 1). Keep per-processo `chat` intact.
-- Re-runnable via `npm run workspace-dm:apply`.

CREATE TABLE IF NOT EXISTS workspace_channels (
  id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  title VARCHAR(128) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_workspace_channels_office_kind (office_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_channel_members (
  channel_id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  joined_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (channel_id, user_id),
  KEY idx_workspace_members_office_user (office_id, user_id),
  CONSTRAINT fk_wcm_channel FOREIGN KEY (channel_id)
    REFERENCES workspace_channels (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_dm_pairs (
  office_id VARCHAR(64) NOT NULL,
  user_a VARCHAR(64) NOT NULL,
  user_b VARCHAR(64) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  PRIMARY KEY (office_id, user_a, user_b),
  UNIQUE KEY uq_workspace_dm_channel (channel_id),
  CONSTRAINT fk_wdm_channel FOREIGN KEY (channel_id)
    REFERENCES workspace_channels (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_messages (
  id CHAR(36) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  author_user_id VARCHAR(64) NOT NULL,
  author_nome VARCHAR(128) NOT NULL,
  author_papel VARCHAR(64) NOT NULL,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_workspace_messages_channel_created (channel_id, created_at, id),
  CONSTRAINT fk_wm_channel FOREIGN KEY (channel_id)
    REFERENCES workspace_channels (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_mentions (
  id CHAR(36) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  message_id CHAR(36) NOT NULL,
  mentioned_user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_workspace_mentions_user (office_id, mentioned_user_id, created_at),
  KEY idx_workspace_mentions_message (message_id),
  CONSTRAINT fk_wmention_message FOREIGN KEY (message_id)
    REFERENCES workspace_messages (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
