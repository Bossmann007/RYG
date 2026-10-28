-- Phase 5.0: retention policy + legal hold on cases.
-- Re-runnable through `pnpm --dir server run retention:apply`.

CREATE TABLE IF NOT EXISTS office_retention_policy (
  office_id VARCHAR(64) NOT NULL,
  default_retention_days INT NOT NULL DEFAULT 2555,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (office_id)
);

-- TiDB/MySQL: add columns if missing (apply script also idempotent).
ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS legal_hold TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_until DATE NULL;
