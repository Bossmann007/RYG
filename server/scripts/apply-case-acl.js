/**
 * Applies migrations/20260928_case_acl.sql and backfills demo membership
 * plus client parties from casos.cliente_nome. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-case-acl.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");
const { normalizarNomeParte } = require("../dist/common/security/case-acl");
const { USUARIOS_POR_TOKEN, MEMBROS_DEMO_ESCRITORIO } = require("../dist/fixtures/usuarios");

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20260928_case_acl.sql"),
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
    console.log("case_memberships: table ready");
    console.log("case_parties: table ready");

    let membros = 0;
    for (const token of MEMBROS_DEMO_ESCRITORIO) {
      const usuario = USUARIOS_POR_TOKEN[token];
      if (!usuario) {
        throw new Error(`fixture token missing: ${token}`);
      }
      const [resultado] = await pool.query(
        `INSERT INTO case_memberships (office_id, caso_id, user_id, role)
         SELECT office_id, CAST(id AS CHAR), ?, ?
         FROM casos
         WHERE office_id = ?
         ON DUPLICATE KEY UPDATE role = role`,
        [usuario.id, usuario.papel, usuario.escritorio],
      );
      membros += resultado.affectedRows;
      const [[contagem]] = await pool.query(
        "SELECT COUNT(*) AS n FROM case_memberships WHERE office_id = ? AND user_id = ?",
        [usuario.escritorio, usuario.id],
      );
      console.log(`${token}: memberships=${contagem.n} affected=${resultado.affectedRows}`);
    }

    const [linhas] = await pool.query(
      `SELECT CAST(id AS CHAR) AS id, office_id, cliente_nome
       FROM casos
       WHERE office_id IS NOT NULL AND office_id <> ''
         AND cliente_nome IS NOT NULL AND cliente_nome <> ''`,
    );
    let partes = 0;
    for (const linha of linhas) {
      const nameKey = normalizarNomeParte(String(linha.cliente_nome));
      if (!nameKey) {
        continue;
      }
      const [resultado] = await pool.query(
        `INSERT IGNORE INTO case_parties (office_id, caso_id, side, name_key)
         VALUES (?, ?, 'client', ?)`,
        [linha.office_id, linha.id, nameKey],
      );
      partes += resultado.affectedRows;
    }
    console.log(`case_parties: client rows inserted=${partes} scanned=${linhas.length} membership_writes=${membros}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-case-acl failed: ${erro.code || erro.message}`);
  process.exit(1);
});
