/**
 * Applies migrations/20260913_create_chat.sql (per-processo chat). Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-chat.js
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
      path.join(__dirname, "../migrations/20260913_create_chat.sql"),
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
      } catch (erro) {
        if (erro && (erro.code === "ER_TABLE_EXISTS_ERROR" || erro.errno === 1050)) {
          continue;
        }
        throw erro;
      }
    }
    console.log("chat: table ready");
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-chat failed: ${erro.code || erro.message}`);
  process.exit(1);
});
