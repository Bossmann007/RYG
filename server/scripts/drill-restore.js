/**
 * Restore drill (Phase 5 Task 5.0b). Touches ONLY a throwaway table (dr_drill).
 * Creates it, exports it to a temp file outside the repo, deletes the row,
 * restores from the file, checks, then removes the table and the file.
 *
 * Stops on the first export failure. Never dumps the whole database, never
 * drops a table that existed before the run, never prints connection details.
 *
 *   node server/scripts/drill-restore.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const TABELA = "dr_drill";
const SISTEMA = new Set(["sys", "mysql", "information_schema", "performance_schema", "metrics_schema"]);

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }
  const pool = mysql.createPool(opcoesPool(env));
  let criouTabela = false;
  let arquivo = null;

  try {
    try {
      await pool.query("SELECT 1");
    } catch (erro) {
      throw new Error(`TiDB unreachable: ${erro.code || erro.message}`);
    }
    const [[atual]] = await pool.query("SELECT DATABASE() AS db");
    assert.ok(atual.db && !SISTEMA.has(String(atual.db).toLowerCase()), "refusing to run on a system schema");
    console.log(`drill database=${atual.db}`);

    // 1. throwaway table; a pre-existing dr_drill is never touched
    try {
      await pool.query(
        `CREATE TABLE ${TABELA} (
           id VARCHAR(32) NOT NULL,
           marker VARCHAR(64) NOT NULL,
           payload VARCHAR(255) NOT NULL,
           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (id)
         )`,
      );
    } catch (erro) {
      if (erro.code === "ER_TABLE_EXISTS_ERROR") {
        throw new Error(`${TABELA} already exists; refusing to touch it`);
      }
      throw erro;
    }
    criouTabela = true;

    const nonce = `${Date.now()}`;
    const linha = {
      id: `dr_${crypto.randomBytes(6).toString("hex")}`,
      marker: `restore-drill-${nonce}`,
      payload: `drill payload ${crypto.randomBytes(8).toString("hex")}`,
    };
    await pool.query(`INSERT INTO ${TABELA} (id, marker, payload) VALUES (?, ?, ?)`, [
      linha.id,
      linha.marker,
      linha.payload,
    ]);

    // 2. export only this table
    const [exportadas] = await pool.query(`SELECT id, marker, payload FROM ${TABELA}`);
    assert.strictEqual(exportadas.length, 1, "export must see exactly the marked row");
    arquivo = path.join(os.tmpdir(), `${TABELA}-${nonce}.json`);
    const conteudo = JSON.stringify({ table: TABELA, rows: exportadas });
    fs.writeFileSync(arquivo, conteudo, { mode: 0o600 });
    const soma = crypto.createHash("sha256").update(conteudo).digest("hex");
    assert.ok(fs.statSync(arquivo).size > 0, "export file is empty");
    assert.ok(!path.resolve(arquivo).startsWith(path.resolve(__dirname, "../..")), "export must live outside the repo");
    console.log(`exported rows=${exportadas.length} sha256=${soma.slice(0, 12)}`);

    // 3. lose the row
    await pool.query(`DELETE FROM ${TABELA} WHERE id = ?`, [linha.id]);
    const [[vazia]] = await pool.query(`SELECT COUNT(*) AS n FROM ${TABELA}`);
    assert.strictEqual(Number(vazia.n), 0, "row must be gone before restore");
    console.log("row deleted, table empty");

    // 4. restore from the file
    const lido = fs.readFileSync(arquivo, "utf8");
    assert.strictEqual(crypto.createHash("sha256").update(lido).digest("hex"), soma, "export file changed on disk");
    const backup = JSON.parse(lido);
    assert.strictEqual(backup.table, TABELA);
    for (const item of backup.rows) {
      await pool.query(`INSERT INTO ${TABELA} (id, marker, payload) VALUES (?, ?, ?)`, [
        item.id,
        item.marker,
        item.payload,
      ]);
    }

    // 5. check
    const [voltaram] = await pool.query(`SELECT id, marker, payload FROM ${TABELA}`);
    assert.strictEqual(voltaram.length, 1);
    assert.deepStrictEqual(
      { id: voltaram[0].id, marker: voltaram[0].marker, payload: voltaram[0].payload },
      linha,
    );
    console.log(`restored rows=${voltaram.length} match=true`);
    console.log("drill-restore: OK");
  } finally {
    if (criouTabela) {
      try {
        await pool.query(`DROP TABLE ${TABELA}`);
      } catch (erro) {
        console.error(`cleanup warning (table): ${erro.code || erro.message}`);
      }
    }
    if (arquivo) {
      try {
        fs.rmSync(arquivo, { force: true });
      } catch (erro) {
        console.error(`cleanup warning (file): ${erro.code || erro.message}`);
      }
    }
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`drill-restore failed: ${erro.code || erro.message}`);
  process.exit(1);
});
