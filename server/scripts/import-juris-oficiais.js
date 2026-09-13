#!/usr/bin/env node
/**
 * Quarantine non-official seed juris and import verified TJPR portal ementas.
 * Cite-or-silent: only rows with citavel=true + official fields may be cited.
 * Does not invent ementas for processes without a portal hit.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const STAGED = path.join(__dirname, "import-data", "decisions-staged.json");
const EMPTY_BLOCO = JSON.stringify({ itens: [], resumo: "" });
const EMPTY_PONTOS = JSON.stringify([]);

function formatCnj(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.length !== 20) return String(digits || "");
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

function parseBrDateToSql(br) {
  const m = String(br || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].n) > 0;
}

async function ensureSchema(conn) {
  await conn.query(`
CREATE TABLE IF NOT EXISTS jurisprudencias_seed_quarantine (
  id BIGINT NOT NULL,
  processo_id INT NOT NULL,
  numero_cnj VARCHAR(32) NOT NULL,
  process_number VARCHAR(64) NOT NULL,
  acordao VARCHAR(128) NOT NULL,
  court VARCHAR(64) NOT NULL,
  chamber VARCHAR(255) NOT NULL,
  reporter VARCHAR(128) NOT NULL,
  date VARCHAR(32) NOT NULL,
  status VARCHAR(64) NOT NULL,
  alignment VARCHAR(16) NOT NULL,
  ementa TEXT NOT NULL,
  pontos_json JSON NOT NULL,
  essencial_json JSON NOT NULL,
  fortalecer_json JSON NOT NULL,
  blindar_json JSON NOT NULL,
  contrapor_json JSON NOT NULL,
  seed_fonte VARCHAR(64) NOT NULL,
  aviso_fonte VARCHAR(255) NULL,
  quarantined_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_juris_seed_q_processo (processo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const adds = [
    ["citavel", "BOOLEAN NOT NULL DEFAULT FALSE"],
    ["source_document_id", "VARCHAR(64) NULL"],
    ["source_url", "TEXT NULL"],
    ["source_retrieved_at", "DATETIME(3) NULL"],
    ["ementa_sha256", "CHAR(64) NULL"],
    ["relation", "VARCHAR(32) NULL"],
    ["fonte", "VARCHAR(32) NOT NULL DEFAULT 'acervo_interno'"],
  ];
  for (const [name, def] of adds) {
    if (!(await columnExists(conn, "jurisprudencias", name))) {
      await conn.query(`ALTER TABLE jurisprudencias ADD COLUMN ${name} ${def}`);
      console.log("added column", name);
    }
  }
  // unique on source_document_id when present (idempotent)
  try {
    await conn.query(
      `ALTER TABLE jurisprudencias ADD UNIQUE KEY uq_juris_source_document (source_document_id)`
    );
  } catch (e) {
    if (!/Duplicate|already exists/i.test(e.message)) {
      // nullable unique is fine; ignore if exists
      if (!/exists|Duplicate/i.test(String(e.message))) {
        console.warn("unique key note:", e.message);
      }
    }
  }
}

async function quarantineSeed(conn) {
  const [existing] = await conn.query(
    `SELECT COUNT(*) AS n FROM jurisprudencias WHERE seed_fonte = 'tema_offline_sem_ementa'`
  );
  const n = Number(existing[0].n);
  if (n === 0) {
    console.log("quarantine: no seed rows left in jurisprudencias");
    return 0;
  }
  await conn.query(`
INSERT INTO jurisprudencias_seed_quarantine (
  id, processo_id, numero_cnj, process_number, acordao, court, chamber, reporter,
  date, status, alignment, ementa, pontos_json, essencial_json, fortalecer_json,
  blindar_json, contrapor_json, seed_fonte, aviso_fonte
)
SELECT
  id, processo_id, numero_cnj, process_number, acordao, court, chamber, reporter,
  date, status, alignment, ementa, pontos_json, essencial_json, fortalecer_json,
  blindar_json, contrapor_json, seed_fonte, aviso_fonte
FROM jurisprudencias
WHERE seed_fonte = 'tema_offline_sem_ementa'
  AND id NOT IN (SELECT id FROM jurisprudencias_seed_quarantine)
`);
  const [del] = await conn.query(
    `DELETE FROM jurisprudencias WHERE seed_fonte = 'tema_offline_sem_ementa'`
  );
  console.log("quarantined seed rows:", del.affectedRows ?? n);
  return del.affectedRows ?? n;
}

async function importOfficial(conn, decisions) {
  const [procs] = await conn.query(`SELECT id, numero_cnj FROM processos`);
  const byId = new Map(procs.map((p) => [Number(p.id), p]));

  let inserted = 0;
  let updated = 0;
  for (const d of decisions) {
    if (!d.ementa || !String(d.ementa).trim()) {
      console.warn("skip empty ementa", d.source_document_id);
      continue;
    }
    if (!d.same_process_verified || !d.public || !d.metadata_verified || !d.source_verified) {
      console.warn("skip unverified", d.source_document_id);
      continue;
    }
    const proc = byId.get(Number(d.processo_id));
    if (!proc) {
      console.warn("skip unknown processo_id", d.processo_id);
      continue;
    }
    const numero_cnj = proc.numero_cnj;
    const process_number = formatCnj(numero_cnj);
    const acordao = `TJPR-${d.source_document_id}`;
    const chamber = String(d.chamber || "").slice(0, 255) || "Não informado";
    const reporter = String(d.reporter || "Não informado").slice(0, 128);
    const date = String(d.date || "").slice(0, 32);
    const ementa = String(d.ementa).trim();
    const retrieved = d.source_retrieved_at
      ? new Date(d.source_retrieved_at)
      : null;
    const retrievedSql = retrieved && !Number.isNaN(retrieved.getTime())
      ? retrieved.toISOString().slice(0, 23).replace("T", " ")
      : null;

    const row = {
      processo_id: Number(d.processo_id),
      numero_cnj,
      process_number,
      acordao,
      court: String(d.court || "TJPR").slice(0, 64),
      chamber,
      reporter,
      date,
      status: "PUBLICADO_PORTAL",
      alignment: "unknown",
      ementa,
      pontos_json: EMPTY_PONTOS,
      essencial_json: EMPTY_BLOCO,
      fortalecer_json: EMPTY_BLOCO,
      blindar_json: EMPTY_BLOCO,
      contrapor_json: EMPTY_BLOCO,
      seed_fonte: "tjpr_portal_publico",
      aviso_fonte: "Ementa oficial portal público TJPR; citável com URL e digest.",
      citavel: 1,
      source_document_id: String(d.source_document_id),
      source_url: String(d.source_url || ""),
      source_retrieved_at: retrievedSql,
      ementa_sha256: String(d.ementa_sha256 || ""),
      relation: String(d.relation || "mesmo_processo").slice(0, 32),
      fonte: "tjpr",
    };

    const [exist] = await conn.query(
      `SELECT id FROM jurisprudencias WHERE source_document_id = ? LIMIT 1`,
      [row.source_document_id]
    );
    if (exist.length) {
      await conn.query(
        `UPDATE jurisprudencias SET
          processo_id=?, numero_cnj=?, process_number=?, acordao=?, court=?, chamber=?,
          reporter=?, date=?, status=?, alignment=?, ementa=?,
          pontos_json=CAST(? AS JSON), essencial_json=CAST(? AS JSON),
          fortalecer_json=CAST(? AS JSON), blindar_json=CAST(? AS JSON),
          contrapor_json=CAST(? AS JSON), seed_fonte=?, aviso_fonte=?, citavel=?,
          source_url=?, source_retrieved_at=?, ementa_sha256=?, relation=?, fonte=?
        WHERE id=?`,
        [
          row.processo_id, row.numero_cnj, row.process_number, row.acordao, row.court, row.chamber,
          row.reporter, row.date, row.status, row.alignment, row.ementa,
          row.pontos_json, row.essencial_json, row.fortalecer_json, row.blindar_json,
          row.contrapor_json, row.seed_fonte, row.aviso_fonte, row.citavel,
          row.source_url, row.source_retrieved_at, row.ementa_sha256, row.relation, row.fonte,
          exist[0].id,
        ]
      );
      updated += 1;
    } else {
      await conn.query(
        `INSERT INTO jurisprudencias (
          processo_id, numero_cnj, process_number, acordao, court, chamber, reporter,
          date, status, alignment, ementa, pontos_json, essencial_json, fortalecer_json,
          blindar_json, contrapor_json, seed_fonte, aviso_fonte, citavel,
          source_document_id, source_url, source_retrieved_at, ementa_sha256, relation, fonte
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),CAST(? AS JSON),CAST(? AS JSON),CAST(? AS JSON),CAST(? AS JSON),?,?,?,?,?,?,?,?,?)`,
        [
          row.processo_id, row.numero_cnj, row.process_number, row.acordao, row.court, row.chamber, row.reporter,
          row.date, row.status, row.alignment, row.ementa,
          row.pontos_json, row.essencial_json, row.fortalecer_json, row.blindar_json, row.contrapor_json,
          row.seed_fonte, row.aviso_fonte, row.citavel,
          row.source_document_id, row.source_url, row.source_retrieved_at, row.ementa_sha256, row.relation, row.fonte,
        ]
      );
      inserted += 1;
    }
  }
  return { inserted, updated };
}

async function main() {
  if (!fs.existsSync(STAGED)) {
    throw new Error(`Missing staged file: ${STAGED}`);
  }
  const decisions = JSON.parse(fs.readFileSync(STAGED, "utf8"));
  if (!Array.isArray(decisions) || decisions.length === 0) {
    throw new Error("staged decisions empty");
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionLimit: 2,
  });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await ensureSchema(conn);
    const q = await quarantineSeed(conn);
    const { inserted, updated } = await importOfficial(conn, decisions);
    await conn.commit();

    const [stats] = await conn.query(`
      SELECT seed_fonte, citavel, COUNT(*) AS n
      FROM jurisprudencias
      GROUP BY seed_fonte, citavel
      ORDER BY seed_fonte, citavel`);
    const [qcount] = await conn.query(
      `SELECT COUNT(*) AS n FROM jurisprudencias_seed_quarantine`
    );
    const [citaveis] = await conn.query(`
      SELECT id, processo_id, process_number, LEFT(acordao,40) AS acordao,
             LEFT(chamber,40) AS chamber, date, citavel, fonte, seed_fonte,
             LEFT(ementa,80) AS ementa_head
      FROM jurisprudencias
      WHERE citavel = 1
      ORDER BY processo_id, date`);
    console.log(JSON.stringify({
      quarantined_moved: q,
      quarantine_total: Number(qcount[0].n),
      inserted,
      updated,
      staged: decisions.length,
      stats,
      citaveis: citaveis.map((r) => ({
        id: r.id,
        processo_id: r.processo_id,
        process_number: r.process_number,
        chamber: r.chamber,
        date: r.date,
        fonte: r.fonte,
        ementa_head: r.ementa_head,
      })),
    }, null, 2));
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("IMPORT_FAILED", e.message);
  process.exit(1);
});
