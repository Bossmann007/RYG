-- Case membership and conflict parties (issue #1, task 0.5.3).
-- Re-runnable through `npm run case-acl:apply`.
CREATE TABLE IF NOT EXISTS case_memberships (
  office_id VARCHAR(64) NOT NULL,
  caso_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  PRIMARY KEY (caso_id, user_id),
  KEY idx_case_memberships_office_user (office_id, user_id)
);

CREATE TABLE IF NOT EXISTS case_parties (
  office_id VARCHAR(64) NOT NULL,
  caso_id VARCHAR(64) NOT NULL,
  side VARCHAR(16) NOT NULL,
  name_key VARCHAR(255) NOT NULL,
  PRIMARY KEY (caso_id, side, name_key),
  KEY idx_case_parties_office_name (office_id, name_key, side)
);
