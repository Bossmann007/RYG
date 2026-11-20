/**
 * Proves Phase 3 Task 3.1 wiki vault schema + deny-by-default publish gate.
 * Schema-only slice: SQL assertions (no HTTP API — that is Task 3.2).
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-wiki-vault.js
 *
 * Fail-closed: missing DB_* or unreachable TiDB → exit 1 (never pretends pass).
 */
require("../dist/register-aliases");
const assert = require("assert");
const { execFileSync } = require("child_process");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICE_PRADO = "prado-advogados";
const OFFICE_OUTRO = "outro-escritorio";
const OWNER_A = "u-001";
const USER_B = "u-002";

const TABELAS = [
  "vault_personal_notes",
  "hardvault_docs",
  "hardvault_acl",
  "hardvault_publish_requests",
];

function aplicar() {
  const saida = execFileSync(process.execPath, [path.join(__dirname, "apply-wiki-vault.js")], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  console.log(saida.trim());
  return saida;
}

/** Canonical hardvault search: hardvault_docs only — never vault_personal_notes. */
async function hardvaultSearch(pool, officeId, needle) {
  if (!officeId) {
    throw new Error("hardvault search refused: office_id required");
  }
  const like = `%${needle}%`;
  const [rows] = await pool.query(
    `SELECT d.id, d.title, d.source_note_id
       FROM hardvault_docs d
      WHERE d.office_id = ?
        AND (d.title LIKE ? OR d.body LIKE ?)
      ORDER BY d.published_at DESC`,
    [officeId, like, like],
  );
  return rows;
}

async function readPersonalNote(pool, officeId, noteId, readerId) {
  if (!officeId) {
    throw new Error("personal note read refused: office_id required");
  }
  const [rows] = await pool.query(
    `SELECT id, title, owner_id
       FROM vault_personal_notes
      WHERE office_id = ?
        AND id = ?
        AND owner_id = ?`,
    [officeId, noteId, readerId],
  );
  return rows;
}

async function limpar(pool, ids) {
  const { noteId, docId, reqId } = ids;
  if (reqId) {
    await pool.query("DELETE FROM hardvault_publish_requests WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      reqId,
    ]);
  }
  if (docId) {
    await pool.query("DELETE FROM hardvault_acl WHERE office_id = ? AND doc_id = ?", [
      OFFICE_PRADO,
      docId,
    ]);
    await pool.query("DELETE FROM hardvault_docs WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      docId,
    ]);
  }
  if (noteId) {
    await pool.query("DELETE FROM vault_personal_notes WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      noteId,
    ]);
  }
}

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  let pool;
  try {
    pool = mysql.createPool(opcoesPool(env));
    await pool.query("SELECT 1");
  } catch (erro) {
    throw new Error(`TiDB unreachable: ${erro.code || erro.message}`);
  }

  const nonce = `${Date.now()}`;
  const noteId = `vpn${nonce}`.slice(0, 32);
  const docId = `hvd${nonce}`.slice(0, 32);
  const reqId = `hpr${nonce}`.slice(0, 32);
  const marker = `wiki-vault-prova-${nonce}`;

  try {
    const applyOut = aplicar();
    for (const tabela of TABELAS) {
      assert.ok(applyOut.includes(`${tabela}: ready`), `apply missing ready line for ${tabela}`);
    }
    console.log("assert: migration apply ready");

    // Re-apply must skip cleanly (IF NOT EXISTS → still ready).
    const reapplyOut = aplicar();
    for (const tabela of TABELAS) {
      assert.ok(reapplyOut.includes(`${tabela}: ready`), `re-apply missing ready for ${tabela}`);
    }
    console.log("assert: re-apply skip-clean ready");

    await pool.query(
      `INSERT INTO vault_personal_notes (id, office_id, owner_id, title, body)
       VALUES (?, ?, ?, ?, ?)`,
      [noteId, OFFICE_PRADO, OWNER_A, marker, `secret body ${marker}`],
    );
    console.log(`inserted personal note ${noteId} owner=${OWNER_A}`);

    const beforePublish = await hardvaultSearch(pool, OFFICE_PRADO, marker);
    assert.strictEqual(beforePublish.length, 0, "unpublished personal note must not hit hardvault search");
    console.log("assert: unpublished note absent from hardvault search (0 rows)");

    const asOwner = await readPersonalNote(pool, OFFICE_PRADO, noteId, OWNER_A);
    assert.strictEqual(asOwner.length, 1, "owner must read own personal note");
    console.log("assert: owner A reads personal note (1 row)");

    const asOther = await readPersonalNote(pool, OFFICE_PRADO, noteId, USER_B);
    assert.strictEqual(asOther.length, 0, "other user must not read A's personal note");
    console.log("assert: user B cannot read A's personal note (0 rows)");

    await pool.query(
      `INSERT INTO hardvault_publish_requests
         (id, office_id, note_id, requested_by, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [reqId, OFFICE_PRADO, noteId, OWNER_A],
    );

    // Explicit publish: hardvault_docs row + office ACL (still no personal table join).
    await pool.query(
      `INSERT INTO hardvault_docs
         (id, office_id, source_note_id, title, body, published_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, OFFICE_PRADO, noteId, marker, `published ${marker}`, OWNER_A],
    );
    await pool.query(
      `INSERT INTO hardvault_acl
         (office_id, doc_id, principal_type, principal_id, permission)
       VALUES (?, ?, 'office', ?, 'read')`,
      [OFFICE_PRADO, docId, OFFICE_PRADO],
    );
    await pool.query(
      `UPDATE hardvault_publish_requests
          SET status = 'approved', decided_at = CURRENT_TIMESTAMP, decided_by = ?
        WHERE office_id = ? AND id = ?`,
      [OWNER_A, OFFICE_PRADO, reqId],
    );
    console.log(`published hardvault doc ${docId} from note ${noteId}`);

    const afterPublish = await hardvaultSearch(pool, OFFICE_PRADO, marker);
    assert.strictEqual(afterPublish.length, 1, "published doc must appear in hardvault search");
    assert.strictEqual(String(afterPublish[0].id), docId);
    assert.strictEqual(String(afterPublish[0].source_note_id), noteId);
    console.log("assert: published doc searchable in hardvault (1 row)");

    const otherOffice = await hardvaultSearch(pool, OFFICE_OUTRO, marker);
    assert.strictEqual(otherOffice.length, 0, "other office must not see published doc");
    console.log("assert: other office hardvault search empty (0 rows)");

    // Guard: refuse unscoped search (fail-closed contract for Task 3.2).
    let refused = false;
    try {
      await hardvaultSearch(pool, "", marker);
    } catch {
      refused = true;
    }
    assert.ok(refused, "hardvault search without office_id must refuse");
    console.log("assert: hardvault search without office_id refused");

    console.log("prova-wiki-vault: PASS");
  } finally {
    try {
      await limpar(pool, { noteId, docId, reqId });
    } catch (erro) {
      console.error(`cleanup warning: ${erro.code || erro.message}`);
    }
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`prova-wiki-vault failed: ${erro.code || erro.message}`);
  process.exit(1);
});
