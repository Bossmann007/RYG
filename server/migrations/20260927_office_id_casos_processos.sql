-- Tenant row filter for the two capa tables only (issue #1 thin slice).
-- Child tables stay without office_id; they are reached through a scoped capa.
-- Re-runnable through `npm run office-id:apply`, which skips duplicate
-- column/index errors and backfills NULL or empty office_id to 'prado-advogados'.
ALTER TABLE casos ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_casos_office_id ON casos (office_id);
ALTER TABLE processos ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_processos_office_id ON processos (office_id);
