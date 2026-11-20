/**
 * Applies migrations/20261011_rag_chunks.sql. Safe to re-run
 * (CREATE TABLE IF NOT EXISTS). Prints the database name, never the host.
 *
 *   node server/scripts/apply-rag-chunks.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const TABELA = "rag_chunks";
const SISTEMA = new Set([
  "sys",
  "mysql",
  "information_schema",
  "performance_schema",
  "metrics_schema",
]);

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const [[atual]] = await pool.query("SELECT DATABASE() AS db");
    const nome = String(atual.db || "");
    if (!nome || SISTEMA.has(nome.toLowerCase())) {
      throw new Error("refusing to run on a system schema");
    }

    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261011_rag_chunks.sql"),
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

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = ?`,
      [TABELA],
    );
    console.log(`database=${nome}`);
    console.log(`${TABELA}: ${Number(rows[0].n) > 0 ? "ready" : "MISSING"}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(erro.code || erro.message);
  process.exit(1);
});
