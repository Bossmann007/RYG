/**
 * Applies migrations/20260927_office_id_casos_processos.sql and backfills
 * office_id on casos and processos. Safe to re-run. Prints counts only.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/apply-office-id.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICE_BACKFILL = "prado-advogados";
const TABELAS = ["casos", "processos"];
const JA_EXISTE = new Set(["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"]);

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20260927_office_id_casos_processos.sql"),
      "utf8"
    );
    const comandos = sql
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((comando) => comando.trim())
      .filter(Boolean);

    for (const comando of comandos) {
      const tabela = comando.match(/(?:TABLE|ON)\s+(\w+)/i)[1];
      const tipo = /ADD COLUMN/i.test(comando) ? "column" : "index";
      try {
        await pool.query(comando);
        console.log(`${tabela}: ${tipo} added`);
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log(`${tabela}: ${tipo} existed`);
      }
    }

    for (const tabela of TABELAS) {
      const [resultado] = await pool.query(
        `UPDATE ${tabela} SET office_id = ? WHERE office_id IS NULL OR office_id = ''`,
        [OFFICE_BACKFILL]
      );
      const [[contagem]] = await pool.query(
        `SELECT COUNT(*) AS total, SUM(office_id = ?) AS escritorio FROM ${tabela}`,
        [OFFICE_BACKFILL]
      );
      console.log(
        `${tabela}: backfilled=${resultado.affectedRows} total=${contagem.total} ${OFFICE_BACKFILL}=${Number(contagem.escritorio)}`
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-office-id failed: ${erro.code || erro.message}`);
  process.exit(1);
});
