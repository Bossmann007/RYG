/**
 * Adds office_id to child tables CasosRepository already reads, when the
 * table exists. Missing tables are skipped. Safe to re-run.
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

const OFFICE_BACKFILL = "prado-advogados";
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

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const [tabelas] = await pool.query("SHOW TABLES");
    const existentes = new Set(tabelas.map((linha) => String(Object.values(linha)[0])));

    for (const tabela of FILHAS) {
      if (!/^[A-Za-z0-9_]+$/.test(tabela)) {
        throw new Error(`invalid table ${tabela}`);
      }
      if (!existentes.has(tabela)) {
        console.log(`${tabela}: skipped absent`);
        continue;
      }

      try {
        await pool.query(`ALTER TABLE \`${tabela}\` ADD COLUMN office_id VARCHAR(64) NULL`);
        console.log(`${tabela}: column added`);
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log(`${tabela}: column existed`);
      }

      try {
        await pool.query(`CREATE INDEX \`idx_${tabela}_office_id\` ON \`${tabela}\` (office_id)`);
        console.log(`${tabela}: index added`);
      } catch (erro) {
        if (!JA_EXISTE.has(erro.code)) throw erro;
        console.log(`${tabela}: index existed`);
      }

      const [resultado] = await pool.query(
        `UPDATE \`${tabela}\` SET office_id = ? WHERE office_id IS NULL OR office_id = ''`,
        [OFFICE_BACKFILL]
      );
      const [[contagem]] = await pool.query(
        `SELECT COUNT(*) AS total, SUM(office_id = ?) AS escritorio FROM \`${tabela}\``,
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
  console.error(`apply-child-office-id failed: ${erro.code || erro.message}`);
  process.exit(1);
});
