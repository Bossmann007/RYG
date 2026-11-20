/**
 * Adds casos.legal_hold and casos.retain_until. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-case-retention.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const JA_EXISTE = new Set(["ER_DUP_FIELDNAME"]);

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20260929_case_retention.sql"),
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
      try {
        await pool.query(comando);
        console.log(`casos: ${comando.match(/ADD COLUMN (\w+)/)[1]} added`);
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log(`casos: ${comando.match(/ADD COLUMN (\w+)/)[1]} existed`);
      }
    }

    const [[contagem]] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(legal_hold = 1) AS em_hold FROM casos",
    );
    console.log(`casos: total=${contagem.total} legal_hold=${Number(contagem.em_hold)}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-case-retention failed: ${erro.code || erro.message}`);
  process.exit(1);
});
