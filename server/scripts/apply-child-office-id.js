/**
 * Adds office_id to child tables that exist in HubLegal. Missing tables skip.
 * Safe to re-run. Backfill uses capa office_id when processo_id/caso_id joins.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-child-office-id.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const FILHAS = [
  "clientes",
  "peticoes",
  "contratos",
  "documentos",
  "decisoes",
  "modelos",
  "historico",
  "prazos",
  "teses",
  "resultados",
  "conversas",
  "jurisprudencias",
  "jurimetria",
  "dissidios",
];

const JA_EXISTE = new Set(["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"]);
const OFFICE_BACKFILL = "prado-advogados";

async function tabelaExiste(pool, nome) {
  const [linhas] = await pool.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [nome],
  );
  return linhas.length > 0;
}

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    for (const tabela of FILHAS) {
      if (!(await tabelaExiste(pool, tabela))) {
        console.log(`${tabela}: skip (absent)`);
        continue;
      }
      try {
        await pool.query(
          `ALTER TABLE ${tabela} ADD COLUMN office_id VARCHAR(64) NULL`,
        );
        console.log(`${tabela}: column added`);
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log(`${tabela}: column existed`);
      }
      try {
        await pool.query(
          `CREATE INDEX idx_${tabela}_office_id ON ${tabela} (office_id)`,
        );
        console.log(`${tabela}: index added`);
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log(`${tabela}: index existed`);
      }
      const [resultado] = await pool.query(
        `UPDATE ${tabela} SET office_id = ? WHERE office_id IS NULL OR office_id = ''`,
        [OFFICE_BACKFILL],
      );
      console.log(`${tabela}: backfilled=${resultado.affectedRows}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-child-office-id failed: ${erro.code || erro.message}`);
  process.exit(1);
});
