/**
 * Applies migrations/20260928_case_classification.sql and backfills
 * missing labels to sigiloso. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-case-classification.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const JA_EXISTE = new Set(["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"]);

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20260928_case_classification.sql"),
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
        console.log("casos: classification column added");
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log("casos: classification column existed");
      }
    }

    const [resultado] = await pool.query(
      `UPDATE casos SET classification = 'sigiloso'
       WHERE classification IS NULL OR classification = ''`,
    );
    const [[contagem]] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(classification = 'sigiloso') AS sigilosos
       FROM casos`,
    );
    console.log(
      `casos: backfilled=${resultado.affectedRows} total=${contagem.total} sigiloso=${Number(contagem.sigilosos)}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-case-classification failed: ${erro.code || erro.message}`);
  process.exit(1);
});
