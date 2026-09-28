#!/usr/bin/env node
/**
 * One-shot: create HubLegal + processos from malformed CSV export.
 * Loads server/.env. Never prints password.
 *
 * Usage: node scripts/bootstrap-hublegal-from-csv.js [path/to/processos.csv]
 */
const fs = require("fs");
const path = require("path");
const mysql = require(path.join(__dirname, "..", "server", "node_modules", "mysql2/promise"));

const ROOT = path.join(__dirname, "..");
const CSV_DEFAULT = path.join(ROOT, "processos_2026-09-27.csv");

function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Broken export: "a""b""c" instead of "a","b","c" */
function parseBrokenCsvLine(line) {
  const parts = line.split('""');
  return parts.map((p, i) => {
    if (i === 0) return p.startsWith('"') ? p.slice(1) : p;
    if (i === parts.length - 1) return p.endsWith('"') ? p.slice(0, -1) : p;
    return p;
  });
}

function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.length);
  const header = parseBrokenCsvLine(lines[0]);
  const rows = [];
  const skipped = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseBrokenCsvLine(lines[i]);
    if (cols.length !== header.length) {
      skipped.push({ line: i + 1, cols: cols.length });
      continue;
    }
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx];
    });
    rows.push(obj);
  }
  return { header, rows, skipped };
}

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.length ? s : null;
}

async function main() {
  const csvPath = path.resolve(process.argv[2] || CSV_DEFAULT);
  const envPath = path.join(ROOT, "server", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Missing server/.env");
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error("Missing CSV:", csvPath);
    process.exit(1);
  }

  const env = loadEnv(envPath);
  const host = env.DB_HOST;
  const user = env.DB_USERNAME;
  const password = env.DB_PASSWORD ?? "";
  const database = env.DB_DATABASE || "HubLegal";
  const port = parseInt(env.DB_PORT || "4000", 10);
  const ssl = (env.DB_SSL || "true") !== "false";

  if (!host || !user || !database) {
    console.error("DB_HOST / DB_USERNAME / DB_DATABASE required");
    process.exit(1);
  }
  if (database === "sys" || database === "mysql" || database === "INFORMATION_SCHEMA") {
    console.error("Refusing system schema as DB_DATABASE:", database);
    process.exit(1);
  }
  if (host.includes("example.tidbcloud")) {
    console.error("Refusing example placeholder host");
    process.exit(1);
  }

  const { rows, skipped } = parseCsv(csvPath);
  console.log(`CSV rows ok=${rows.length} skipped=${skipped.length}`);
  if (skipped.length) console.log("skipped lines:", skipped);

  const baseOpts = {
    host,
    port,
    user,
    password,
    connectTimeout: 20000,
    ssl: ssl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
  };

  // Connect without default database to CREATE DATABASE
  const admin = await mysql.createConnection(baseOpts);
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, "")}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`CREATE DATABASE IF NOT EXISTS ${database}: ok`);
  } finally {
    await admin.end();
  }

  const conn = await mysql.createConnection({ ...baseOpts, database });
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS processos (
        id BIGINT PRIMARY KEY,
        numero_cnj VARCHAR(32) NOT NULL,
        tribunal VARCHAR(16) NULL,
        grau VARCHAR(8) NULL,
        classe_codigo INT NULL,
        classe_nome VARCHAR(255) NULL,
        assuntos_json TEXT NULL,
        orgao_julgador VARCHAR(255) NULL,
        data_ajuizamento VARCHAR(32) NULL,
        data_hora_ultima_atualizacao VARCHAR(64) NULL,
        nivel_sigilo INT NULL,
        formato VARCHAR(64) NULL,
        sistema VARCHAR(64) NULL,
        movimentos_json MEDIUMTEXT NULL,
        raw_json LONGTEXT NULL,
        fonte VARCHAR(64) NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        KEY idx_processos_cnj (numero_cnj)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("CREATE TABLE processos: ok");

    // Minimal casos so list prefers casos when present; hub can also use processos as capas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS casos (
        id BIGINT PRIMARY KEY,
        processo_id BIGINT NULL,
        numero_cnj VARCHAR(32) NULL,
        titulo VARCHAR(512) NULL,
        tema VARCHAR(255) NULL,
        subtema VARCHAR(255) NULL,
        tribunal VARCHAR(16) NULL,
        orgao_julgador VARCHAR(255) NULL,
        status VARCHAR(64) NULL,
        cliente_nome VARCHAR(255) NULL,
        resumo TEXT NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        KEY idx_casos_processo (processo_id),
        KEY idx_casos_cnj (numero_cnj)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("CREATE TABLE casos: ok");

    const cols = [
      "id",
      "numero_cnj",
      "tribunal",
      "grau",
      "classe_codigo",
      "classe_nome",
      "assuntos_json",
      "orgao_julgador",
      "data_ajuizamento",
      "data_hora_ultima_atualizacao",
      "nivel_sigilo",
      "formato",
      "sistema",
      "movimentos_json",
      "raw_json",
      "fonte",
      "created_at",
      "updated_at",
    ];
    const placeholders = cols.map(() => "?").join(",");
    const sql = `REPLACE INTO processos (${cols.join(",")}) VALUES (${placeholders})`;

    let n = 0;
    for (const row of rows) {
      const values = cols.map((c) => {
        const v = nullIfEmpty(row[c]);
        if (c === "id" || c === "classe_codigo" || c === "nivel_sigilo") {
          if (v === null) return null;
          const num = Number(v);
          return Number.isFinite(num) ? num : null;
        }
        return v;
      });
      await conn.query(sql, values);

      // seed a thin caso row pointing at processo for assembler path that prefers casos
      const pid = values[0];
      const cnj = values[1];
      const tribunal = values[2];
      const orgao = values[7];
      const assunto = values[6];
      const created = values[16];
      const updated = values[17];
      await conn.query(
        `REPLACE INTO casos (id, processo_id, numero_cnj, titulo, tema, tribunal, orgao_julgador, status, resumo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pid,
          pid,
          cnj,
          assunto || `Processo ${cnj}`,
          assunto,
          tribunal,
          orgao,
          "ativo",
          null,
          created,
          updated,
        ]
      );
      n += 1;
    }
    console.log(`REPLACE INTO processos+casos: ${n} rows`);

    const [[{ c }]] = await conn.query("SELECT COUNT(*) AS c FROM processos");
    const [[{ k }]] = await conn.query("SELECT COUNT(*) AS c FROM casos");
    console.log(`counts processos=${c} casos=${k}`);
  } finally {
    await conn.end();
  }

  console.log("Done. Restart Nest, then: curl -H 'Authorization: Bearer demo-socio' http://127.0.0.1:3000/api/casos");
}

main().catch((err) => {
  console.error("bootstrap failed:", err.code || err.message);
  process.exit(1);
});
