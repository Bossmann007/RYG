-- Xirp: metadata-only trail of MCP tools/call runs (Phase 4 Task 4.1).
-- No tool arguments, no case body, no phone. case_id is NULL when the call carried no case id.
-- Re-runnable through `node scripts/apply-mcp-runs.js`.
CREATE TABLE IF NOT EXISTS mcp_runs (
  id VARCHAR(32) NOT NULL,
  office_id VARCHAR(64) NOT NULL,
  case_id VARCHAR(64) NULL,
  user_id VARCHAR(64) NOT NULL,
  tool_name VARCHAR(64) NOT NULL,
  release_id VARCHAR(32) NULL,
  cite_status VARCHAR(16) NOT NULL,
  summary VARCHAR(240) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mcp_runs_office_case_created (office_id, case_id, created_at)
);
