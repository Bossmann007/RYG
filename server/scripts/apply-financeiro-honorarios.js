/**
 * Apply server/migrations/20261029_caso_honorarios.sql
 *
 *   pnpm --dir server run financeiro:apply
 */
require("dotenv").config();
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

async function main() {
  const env = lerDbEnv();
  if (!env) {
    console.error("DB_* not configured");
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, "../migrations/20261029_caso_honorarios.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = mysql.createPool(opcoesPool(env));
  try {
    await pool.query(sql);
    console.log("financeiro:apply OK");
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`financeiro:apply failed: ${erro.message}`);
  process.exit(1);
});
