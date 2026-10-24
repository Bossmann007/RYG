-- Case classification label on capa (issue #1, task 0.5.4).
-- Re-runnable through `npm run case-classification:apply`.
ALTER TABLE casos ADD COLUMN classification VARCHAR(32) NOT NULL DEFAULT 'sigiloso';
