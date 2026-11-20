-- Workspace DMs + mentions (Phase 1 thin slice). Per-case `chat` stays untouched.
-- Re-runnable through `node scripts/apply-workspace-dm.js`.
CREATE TABLE IF NOT EXISTS workspace_threads (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workspace_threads_office (office_id)
);

CREATE TABLE IF NOT EXISTS workspace_thread_members (
  office_id VARCHAR(64) NOT NULL,
  thread_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (thread_id, user_id),
  KEY idx_workspace_thread_members_office (office_id)
);

CREATE TABLE IF NOT EXISTS workspace_messages (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  thread_id VARCHAR(32) NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workspace_messages_thread_created (thread_id, created_at)
);

CREATE TABLE IF NOT EXISTS workspace_mentions (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  thread_id VARCHAR(32) NOT NULL,
  message_id VARCHAR(32) NOT NULL,
  mentioned_user_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_workspace_mentions_message (message_id)
);
