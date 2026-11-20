-- Case retention + legal hold (Phase 5 Task 5.0). Columns only.
-- retain_until is a stored date: nothing deletes on its own (no job, no cron).
-- Re-runnable through `node scripts/apply-case-retention.js`.
ALTER TABLE casos ADD COLUMN legal_hold TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE casos ADD COLUMN retain_until DATE NULL;
