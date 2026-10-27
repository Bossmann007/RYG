/**
 * Applies migrations/20261026_wiki_vault.sql. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-wiki-vault.js
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
  if (!env) throw new Error("DB_* not configured");
  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261026_wiki_vault.sql"),
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
    console.log("wiki vault: tables ready");
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-wiki-vault failed: ${erro.code || erro.message}`);
  process.exit(1);
});
