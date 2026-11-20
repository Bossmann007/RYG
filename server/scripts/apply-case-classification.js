/**
 * Adds casos.classification and backfills unknown values to sigiloso. Safe to re-run.
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

const JA_EXISTE = new Set(["ER_DUP_FIELDNAME"]);

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
        console.log("casos: classification added");
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log("casos: classification existed");
      }
    }

    const [resultado] = await pool.query(
      `UPDATE casos
       SET classification = 'sigiloso'
       WHERE classification IS NULL
          OR classification = ''
          OR classification NOT IN ('publico', 'interno', 'sigiloso', 'segredo_justica')`,
    );
    const [[contagem]] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(classification = 'sigiloso') AS sigiloso FROM casos",
    );
    console.log(
      `casos: backfilled=${resultado.affectedRows} total=${contagem.total} sigiloso=${Number(contagem.sigiloso)}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-case-classification failed: ${erro.code || erro.message}`);
  process.exit(1);
});
