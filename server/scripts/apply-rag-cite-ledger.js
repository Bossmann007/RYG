/**
 * Applies migrations/20261028_rag_cite_ledger.sql. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run rag:apply
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
    console.log("rag:apply skipped (DB_* unset)");
    return;
  }
  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261028_rag_cite_ledger.sql"),
      "utf8",
    );
    const comandos = sql
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean);
    for (const comando of comandos) {
      await pool.query(comando);
    }
    console.log("rag_cite_ledger: ready");
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-rag-cite-ledger failed: ${erro.code || erro.message}`);
  process.exit(1);
});
