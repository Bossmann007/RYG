-- Case classification label. Default sigiloso: an unlabeled case stays readable only by socio.
-- Re-runnable through `npm run classification:apply`, which skips a duplicate column
-- and rewrites null, empty, or unknown values to sigiloso.
-- documentos is not in this HubLegal schema; the label is caso-only.
ALTER TABLE casos ADD COLUMN classification VARCHAR(32) NOT NULL DEFAULT 'sigiloso';
