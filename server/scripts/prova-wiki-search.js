/**
 * Proves Phase 3 Task 3.2 hardvault search + load pack over real HTTP.
 * Seeds rows with SQL (same shape as prova-wiki-vault.js), then hits Nest.
 * Does not weaken ACL to match the schema probe helper.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-wiki-search.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICE_PRADO = "prado-advogados";
const OWNER_A = "u-001";
const USER_B = "u-002";

function aplicar() {
  const saida = execFileSync(process.execPath, [path.join(__dirname, "apply-wiki-vault.js")], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  console.log(saida.trim());
}

async function limpar(pool, ids) {
  const { noteId, noteBId, docId, docNoAclId, reqId } = ids;
  if (reqId) {
    await pool.query("DELETE FROM hardvault_publish_requests WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      reqId,
    ]);
  }
  for (const id of [docId, docNoAclId].filter(Boolean)) {
    await pool.query("DELETE FROM hardvault_acl WHERE office_id = ? AND doc_id = ?", [
      OFFICE_PRADO,
      id,
    ]);
    await pool.query("DELETE FROM hardvault_docs WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      id,
    ]);
  }
  for (const id of [noteId, noteBId].filter(Boolean)) {
    await pool.query("DELETE FROM vault_personal_notes WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      id,
    ]);
  }
}

function jsonTemCampoBodyCompleto(valor, corpoCompleto) {
  const texto = JSON.stringify(valor);
  return texto.includes(corpoCompleto);
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

  aplicar();

  const nonce = `${Date.now()}`;
  const noteId = `vpn${nonce}`.slice(0, 32);
  const noteBId = `vpb${nonce}`.slice(0, 32);
  const docId = `hvd${nonce}`.slice(0, 32);
  const docNoAclId = `hvn${nonce}`.slice(0, 32);
  const reqId = `hpr${nonce}`.slice(0, 32);
  const marker = `wiki-search-prova-${nonce}`;
  const corpoLongo =
    `published ${marker} ` +
    "X".repeat(200) +
    ` end-${marker}`;
  const corpoPessoal = `secret personal body ${marker} never-hardvault`;

  const ids = { noteId, noteBId, docId, docNoAclId, reqId };

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const pedir = async (method, caminho, token) => {
    const resposta = await fetch(`${base}${caminho}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const corpo = await resposta.json().catch(() => ({}));
    console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
    return { status: resposta.status, corpo };
  };

  try {
    await pool.query(
      `INSERT INTO vault_personal_notes (id, office_id, owner_id, title, body)
       VALUES (?, ?, ?, ?, ?)`,
      [noteId, OFFICE_PRADO, OWNER_A, marker, corpoPessoal],
    );
    await pool.query(
      `INSERT INTO vault_personal_notes (id, office_id, owner_id, title, body)
       VALUES (?, ?, ?, ?, ?)`,
      [noteBId, OFFICE_PRADO, USER_B, `other-${marker}`, `other user body ${marker}`],
    );
    console.log(`seeded personal notes ${noteId} (u-001) and ${noteBId} (u-002)`);

    // no token → 401
    assert.strictEqual((await pedir("GET", `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`)).status, 401);
    console.log("assert: no token hardvault search → 401");

    // unpublished personal text must not appear in hardvault search
    const antes = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-socio",
    );
    assert.strictEqual(antes.status, 200);
    assert.strictEqual(antes.corpo.zone, "internal");
    assert.ok(Array.isArray(antes.corpo.hits));
    assert.strictEqual(antes.corpo.hits.length, 0, "unpublished note must not hit hardvault");
    assert.ok(
      !JSON.stringify(antes.corpo).includes(corpoPessoal),
      "personal body must not appear in hardvault response",
    );
    console.log("assert: unpublished personal note absent from hardvault search");

    // empty q → 400
    assert.strictEqual((await pedir("GET", "/api/wiki/hardvault", "demo-socio")).status, 400);
    assert.strictEqual((await pedir("GET", "/api/wiki/hardvault?q=", "demo-socio")).status, 400);
    console.log("assert: empty q → 400");

    // other user cannot read personal note → 404
    const outroUser = await pedir("GET", `/api/wiki/notes/${encodeURIComponent(noteId)}`, "demo-advogado");
    assert.strictEqual(outroUser.status, 404);
    console.log("assert: demo-advogado GET note → 404");

    // owner reads note → 200 + zone internal
    const dono = await pedir("GET", `/api/wiki/notes/${encodeURIComponent(noteId)}`, "demo-socio");
    assert.strictEqual(dono.status, 200);
    assert.strictEqual(dono.corpo.zone, "internal");
    assert.strictEqual(dono.corpo.note?.id, noteId);
    assert.strictEqual(dono.corpo.note?.body, corpoPessoal);
    console.log("assert: demo-socio GET own note → 200 zone internal");

    // publish with office ACL
    await pool.query(
      `INSERT INTO hardvault_publish_requests
         (id, office_id, note_id, requested_by, status, decided_at, decided_by)
       VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP, ?)`,
      [reqId, OFFICE_PRADO, noteId, OWNER_A, OWNER_A],
    );
    await pool.query(
      `INSERT INTO hardvault_docs
         (id, office_id, source_note_id, title, body, published_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, OFFICE_PRADO, noteId, marker, corpoLongo, OWNER_A],
    );
    await pool.query(
      `INSERT INTO hardvault_acl
         (office_id, doc_id, principal_type, principal_id, permission)
       VALUES (?, ?, 'office', ?, 'read')`,
      [OFFICE_PRADO, docId, OFFICE_PRADO],
    );
    console.log(`published hardvault doc ${docId} with office ACL`);

    // doc with NO acl row must stay invisible
    await pool.query(
      `INSERT INTO hardvault_docs
         (id, office_id, source_note_id, title, body, published_by)
       VALUES (?, ?, NULL, ?, ?, ?)`,
      [docNoAclId, OFFICE_PRADO, `noacl-${marker}`, `no acl ${marker} body`, OWNER_A],
    );
    console.log(`seeded hardvault doc ${docNoAclId} without ACL`);

    const depois = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-socio",
    );
    assert.strictEqual(depois.status, 200);
    assert.strictEqual(depois.corpo.zone, "internal");
    assert.strictEqual(depois.corpo.hits.length, 1, "exactly one ACL-visible published doc");
    const hit = depois.corpo.hits[0];
    assert.strictEqual(hit.id, docId);
    assert.strictEqual(hit.title, marker);
    assert.ok(typeof hit.snippet === "string");
    assert.ok(hit.snippet.length <= 160, "snippet max 160");
    assert.ok(hit.snippet.length < corpoLongo.length, "snippet shorter than full body");
    assert.ok(!("body" in hit), "hit must not expose body field");
    assert.ok(
      !depois.corpo.hits.some((h) => h.id === noteId),
      "personal note id must not appear as hit id",
    );
    assert.ok(
      !depois.corpo.hits.some((h) => h.id === docNoAclId),
      "doc without ACL must be absent",
    );
    assert.ok(
      !jsonTemCampoBodyCompleto(depois.corpo, corpoLongo),
      "response must not include full body",
    );
    assert.ok(
      !JSON.stringify(depois.corpo).includes(corpoPessoal),
      "personal body must not leak into hardvault search",
    );
    console.log("assert: demo-socio hardvault search returns ACL doc only, snippet capped");

    const outroOffice = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-outro",
    );
    assert.strictEqual(outroOffice.status, 200);
    assert.deepStrictEqual(outroOffice.corpo.hits, []);
    console.log("assert: demo-outro hardvault search → empty hits");

    // load without q: own note pointers only, no hardvault dump
    const loadSemQ = await pedir("GET", "/api/wiki/load", "demo-socio");
    assert.strictEqual(loadSemQ.status, 200);
    assert.strictEqual(loadSemQ.corpo.zone, "internal");
    assert.ok(Array.isArray(loadSemQ.corpo.notes));
    assert.ok(Array.isArray(loadSemQ.corpo.hardvault));
    assert.strictEqual(loadSemQ.corpo.hardvault.length, 0, "load without q must not dump hardvault");
    assert.ok(
      !loadSemQ.corpo.notes.some((n) => n.id === noteBId),
      "must never include another user's personal notes",
    );
    assert.ok(
      loadSemQ.corpo.notes.every((n) => typeof n.snippet === "string" && !("body" in n)),
      "load notes are pointers only",
    );
    assert.ok(loadSemQ.corpo.notes.length <= 5);
    console.log("assert: load without q → own notes only, no hardvault");

    // load with q: capped hardvault + own notes, still no other user's note
    const loadComQ = await pedir(
      "GET",
      `/api/wiki/load?q=${encodeURIComponent(marker)}`,
      "demo-socio",
    );
    assert.strictEqual(loadComQ.status, 200);
    assert.ok(loadComQ.corpo.hardvault.length <= 5);
    assert.ok(loadComQ.corpo.notes.length <= 5);
    assert.ok(loadComQ.corpo.hardvault.some((h) => h.id === docId));
    assert.ok(!loadComQ.corpo.notes.some((n) => n.id === noteBId));
    assert.ok(!loadComQ.corpo.hardvault.some((h) => h.id === noteId));
    assert.ok(!jsonTemCampoBodyCompleto(loadComQ.corpo, corpoLongo));
    console.log("assert: load with q → capped hardvault hits, no other-user notes");

    console.log("prova-wiki-search: OK");
  } finally {
    try {
      await limpar(pool, ids);
    } catch (erro) {
      console.error(`cleanup warning: ${erro.message}`);
    }
    await app.close();
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`prova-wiki-search failed: ${erro.message}`);
  process.exit(1);
});
