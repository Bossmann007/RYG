-- office_id on child tables that CasosRepository already reads.
-- apply-child-office-id.js skips a table that is not in the database.
-- Re-run skips duplicate column and index, then backfills empty office_id
-- to prado-advogados.
ALTER TABLE clientes ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_clientes_office_id ON clientes (office_id);
ALTER TABLE peticoes ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_peticoes_office_id ON peticoes (office_id);
ALTER TABLE contratos ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_contratos_office_id ON contratos (office_id);
ALTER TABLE documentos ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_documentos_office_id ON documentos (office_id);
ALTER TABLE decisoes ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_decisoes_office_id ON decisoes (office_id);
ALTER TABLE modelos ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_modelos_office_id ON modelos (office_id);
ALTER TABLE historico ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_historico_office_id ON historico (office_id);
ALTER TABLE prazos ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_prazos_office_id ON prazos (office_id);
ALTER TABLE teses ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_teses_office_id ON teses (office_id);
ALTER TABLE resultados ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_resultados_office_id ON resultados (office_id);
ALTER TABLE conversas ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_conversas_office_id ON conversas (office_id);
ALTER TABLE jurisprudencias ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_jurisprudencias_office_id ON jurisprudencias (office_id);
ALTER TABLE jurimetria ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_jurimetria_office_id ON jurimetria (office_id);
ALTER TABLE dissidios ADD COLUMN office_id VARCHAR(64) NULL;
CREATE INDEX idx_dissidios_office_id ON dissidios (office_id);
