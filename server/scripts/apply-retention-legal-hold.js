/**
 * Applies migrations/20261028_retention_legal_hold.sql. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run retention:apply
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS office_retention_policy (
        office_id VARCHAR(64) NOT NULL,
        default_retention_days INT NOT NULL DEFAULT 2555,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (office_id)
      )`);
    console.log("office_retention_policy: ready");

    for (const col of [
      "ADD COLUMN legal_hold TINYINT(1) NOT NULL DEFAULT 0",
      "ADD COLUMN retention_until DATE NULL",
    ]) {
      try {
        await pool.query(`ALTER TABLE casos ${col}`);
        console.log(`casos: ${col}`);
      } catch (erro) {
        if (erro && (erro.errno === 1060 || /Duplicate column/i.test(String(erro.message)))) {
          console.log(`casos: column already present (${col})`);
        } else {
          throw erro;
        }
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-retention-legal-hold failed: ${erro.code || erro.message}`);
  process.exit(1);
});
