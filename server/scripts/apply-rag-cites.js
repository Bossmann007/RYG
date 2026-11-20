/**
 * Applies migrations/20261020_rag_cites.sql. Safe to re-run
 * (CREATE TABLE IF NOT EXISTS).
 *
 *   node server/scripts/apply-rag-cites.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const TABELAS = ["rag_cites"];

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261020_rag_cites.sql"),
      "utf8",
    );
    const comandos = sql
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((comando) => comando.trim())
      .filter(Boolean);

    for (const comando of comandos) {
      await pool.query(comando);
    }

    for (const tabela of TABELAS) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name = ?`,
        [tabela],
      );
      console.log(`${tabela}: ${Number(rows[0].n) > 0 ? "ready" : "MISSING"}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-rag-cites failed: ${erro.code || erro.message}`);
  process.exit(1);
});
