-- Phase 4.1: MCP SafeDTO agent-run history for the case Xirp panel.
-- Metadata + SafeDTO summary only. No raw tool-arg dumps, no CNJ column.
CREATE TABLE IF NOT EXISTS agent_runs (
  id VARCHAR(64) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  caso_id VARCHAR(64) NULL,
  user_id VARCHAR(64) NOT NULL,
  tool_name VARCHAR(128) NOT NULL,
  release_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  cite_status VARCHAR(16) NOT NULL,
  summary VARCHAR(600) NOT NULL,
  reference_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_runs_release (release_id),
  KEY idx_agent_runs_caso (office_id, caso_id, created_at),
  KEY idx_agent_runs_office (office_id, created_at)
);
