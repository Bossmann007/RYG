/**
 * Creates prazos + historico tables and seeds processo 1 (prado-advogados).
 * Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-pms-depth.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICE = "prado-advogados";
const PROCESSO_ID = 1;

async function aplicarSql(pool, arquivo) {
  const sql = fs.readFileSync(path.join(__dirname, "../migrations", arquivo), "utf8");
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
}

async function main() {
  const env = lerDbEnv();
  if (!env) throw new Error("DB_* not configured");
  const pool = mysql.createPool(opcoesPool(env));
  try {
    await aplicarSql(pool, "20260913_create_prazos.sql");
    console.log("prazos: table ready");
    await aplicarSql(pool, "20261026_create_historico.sql");
    console.log("historico: table ready");

    for (const tabela of ["prazos", "historico"]) {
      try {
        await pool.query(
          `ALTER TABLE ${tabela} ADD COLUMN office_id VARCHAR(64) NULL`,
        );
        console.log(`${tabela}: office_id column added (legacy upgrade)`);
      } catch (erro) {
        if (erro.code !== "ER_DUP_FIELDNAME") throw erro;
      }
      await pool.query(
        `UPDATE ${tabela} SET office_id = ? WHERE office_id IS NULL OR office_id = ''`,
        [OFFICE],
      );
    }

    const [[proc]] = await pool.query(
      "SELECT id FROM processos WHERE id = ? AND office_id = ? LIMIT 1",
      [PROCESSO_ID, OFFICE],
    );
    if (!proc) {
      throw new Error(`processo ${PROCESSO_ID} missing for ${OFFICE}`);
    }

    const [[hist]] = await pool.query(
      "SELECT COUNT(*) AS n FROM historico WHERE office_id = ? AND processo_id = ?",
      [OFFICE, PROCESSO_ID],
    );
    if (Number(hist.n) === 0) {
      await pool.query(
        `INSERT INTO historico (processo_id, office_id, data, titulo, detalhe) VALUES
         (?, ?, '2026-09-01', 'Distribuição', 'Processo distribuído à vara (seed PMS).'),
         (?, ?, '2026-09-15', 'Contestação juntada', 'Banco apresentou contestação. Contagem de prazo interno.'),
         (?, ?, '2026-10-01', 'Despacho de alegações', 'Abertas alegações finais em 15 dias úteis.')`,
        [PROCESSO_ID, OFFICE, PROCESSO_ID, OFFICE, PROCESSO_ID, OFFICE],
      );
      console.log("historico: seed rows for processo 1");
    } else {
      console.log(`historico: seed skipped (n=${hist.n})`);
    }

    const [[prz]] = await pool.query(
      "SELECT COUNT(*) AS n FROM prazos WHERE office_id = ? AND processo_id = ?",
      [OFFICE, PROCESSO_ID],
    );
    if (Number(prz.n) === 0) {
      await pool.query(
        `INSERT INTO prazos
          (processo_id, office_id, titulo, tipo, data_vencimento, data_inicio,
           quantidade_dias, contagem, status, responsavel, gatilho, gatilho_fonte, observacoes)
         VALUES
          (?, ?, 'Alegações finais', 'manifestacao', '2026-10-22', '2026-10-01',
           15, 'uteis', 'a_vencer', 'Dra. Helena Prado',
           'Despacho de 01/10/2026 abrindo prazo comum.', 'acervo_interno',
           'Seed Phase 2.5'),
          (?, ?, 'Revisão interna da peça', 'interno', '2026-10-20', '2026-10-15',
           3, 'uteis', 'aberto', 'Dr. Rafael Nunes',
           'Controle do escritório antes do protocolo.', 'acervo_interno', NULL)`,
        [PROCESSO_ID, OFFICE, PROCESSO_ID, OFFICE],
      );
      console.log("prazos: seed rows for processo 1");
    } else {
      console.log(`prazos: seed skipped (n=${prz.n})`);
    }

    const [capa] = await pool.query(
      `UPDATE casos
          SET cliente_nome = COALESCE(NULLIF(cliente_nome, ''), 'Consumidor demo'),
              resumo = COALESCE(NULLIF(resumo, ''), 'Seed PMS 2.5 — alienação fiduciária.')
        WHERE id = ? AND office_id = ?`,
      [PROCESSO_ID, OFFICE],
    );
    console.log(`casos: cliente_nome backfill affected=${capa.affectedRows}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-pms-depth failed: ${erro.code || erro.message}`);
  process.exit(1);
});
