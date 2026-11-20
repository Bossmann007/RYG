/**
 * Applies migrations/20261020_caso_lancamentos.sql. Safe to re-run
 * (CREATE TABLE IF NOT EXISTS).
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-caso-lancamentos.js
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
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261020_caso_lancamentos.sql"),
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

    const [[contagem]] = await pool.query("SELECT COUNT(*) AS total FROM caso_lancamentos");
    console.log(`caso_lancamentos: ready rows=${Number(contagem.total)}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-caso-lancamentos failed: ${erro.code || erro.message}`);
  process.exit(1);
});
