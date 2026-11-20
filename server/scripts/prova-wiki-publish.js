/**
 * Proves Phase 3 Task 3.3 wiki note create + hardvault publish over real HTTP.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-wiki-publish.js
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

function aplicar() {
  const saida = execFileSync(process.execPath, [path.join(__dirname, "apply-wiki-vault.js")], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  console.log(saida.trim());
}

async function limpar(pool, ids) {
  const { noteId, docId } = ids;
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
    await pool.query("DELETE FROM hardvault_publish_requests WHERE office_id = ? AND note_id = ?", [
      OFFICE_PRADO,
      noteId,
    ]);
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

  aplicar();

  const nonce = `${Date.now()}`;
  const marker = `wiki-publish-prova-${nonce}`;
  const corpoNota = `corpo pessoal ${marker} com texto longo suficiente para snippet`;

  const ids = { noteId: null, docId: null };

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const pedir = async (method, caminho, token, body) => {
    const resposta = await fetch(`${base}${caminho}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const corpo = await resposta.json().catch(() => ({}));
    console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
    return { status: resposta.status, corpo };
  };

  try {
    // POST notes without token → 401
    assert.strictEqual(
      (await pedir("POST", "/api/wiki/notes", null, { title: marker, body: corpoNota })).status,
      401,
    );
    console.log("assert: POST notes no token → 401");

    // demo-socio creates a note → 201
    const criada = await pedir("POST", "/api/wiki/notes", "demo-socio", {
      title: marker,
      body: corpoNota,
    });
    assert.strictEqual(criada.status, 201);
    assert.strictEqual(criada.corpo.zone, "internal");
    assert.ok(criada.corpo.note?.id);
    assert.strictEqual(criada.corpo.note?.title, marker);
    assert.ok(!("body" in (criada.corpo.note || {})), "create must not echo body");
    ids.noteId = String(criada.corpo.note.id);
    assert.ok(ids.noteId.length <= 32, "note id must fit VARCHAR(32)");
    console.log(`assert: demo-socio create note → 201 id=${ids.noteId}`);

    // demo-advogado GET that note → 404
    assert.strictEqual(
      (await pedir("GET", `/api/wiki/notes/${encodeURIComponent(ids.noteId)}`, "demo-advogado"))
        .status,
      404,
    );
    console.log("assert: demo-advogado GET note → 404");

    // demo-outro GET that note → 404
    assert.strictEqual(
      (await pedir("GET", `/api/wiki/notes/${encodeURIComponent(ids.noteId)}`, "demo-outro"))
        .status,
      404,
    );
    console.log("assert: demo-outro GET note → 404");

    // POST publish without confirm → 400, no hardvault hit
    const semConfirm = await pedir(
      "POST",
      `/api/wiki/notes/${encodeURIComponent(ids.noteId)}/publish`,
      "demo-socio",
      {},
    );
    assert.strictEqual(semConfirm.status, 400);
    const semConfirmFalse = await pedir(
      "POST",
      `/api/wiki/notes/${encodeURIComponent(ids.noteId)}/publish`,
      "demo-socio",
      { confirm: false },
    );
    assert.strictEqual(semConfirmFalse.status, 400);
    const antes = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-socio",
    );
    assert.strictEqual(antes.status, 200);
    assert.strictEqual(antes.corpo.hits.length, 0, "unconfirmed publish must not create searchable doc");
    console.log("assert: publish without confirm → 400, hardvault empty");

    // POST publish { confirm: true } → 200 with doc id, no full body
    const publicada = await pedir(
      "POST",
      `/api/wiki/notes/${encodeURIComponent(ids.noteId)}/publish`,
      "demo-socio",
      { confirm: true },
    );
    assert.strictEqual(publicada.status, 200);
    assert.strictEqual(publicada.corpo.zone, "internal");
    assert.ok(publicada.corpo.doc?.id);
    assert.strictEqual(publicada.corpo.doc?.title, marker);
    ids.docId = String(publicada.corpo.doc.id);
    assert.ok(!("body" in (publicada.corpo.doc || {})));
    assert.ok(
      !JSON.stringify(publicada.corpo).includes(corpoNota),
      "publish response must not echo full body",
    );
    console.log(`assert: demo-socio publish confirm → 200 doc=${ids.docId}`);

    // hardvault search as demo-socio returns that doc
    const socioHits = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-socio",
    );
    assert.strictEqual(socioHits.status, 200);
    assert.ok(socioHits.corpo.hits.some((h) => h.id === ids.docId));
    const hitSocio = socioHits.corpo.hits.find((h) => h.id === ids.docId);
    assert.ok(typeof hitSocio.snippet === "string");
    assert.ok(hitSocio.snippet.length <= 160);
    console.log("assert: demo-socio hardvault search returns published doc");

    // demo-advogado hardvault search returns hit; GET note stays 404
    const advHits = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-advogado",
    );
    assert.strictEqual(advHits.status, 200);
    assert.ok(advHits.corpo.hits.some((h) => h.id === ids.docId), "office ACL must expose doc");
    assert.strictEqual(
      (await pedir("GET", `/api/wiki/notes/${encodeURIComponent(ids.noteId)}`, "demo-advogado"))
        .status,
      404,
    );
    console.log("assert: demo-advogado hardvault hit + note still 404");

    // demo-outro hardvault search returns empty
    const outroHits = await pedir(
      "GET",
      `/api/wiki/hardvault?q=${encodeURIComponent(marker)}`,
      "demo-outro",
    );
    assert.strictEqual(outroHits.status, 200);
    assert.deepStrictEqual(outroHits.corpo.hits, []);
    console.log("assert: demo-outro hardvault → empty");

    // second publish → 409
    const segunda = await pedir(
      "POST",
      `/api/wiki/notes/${encodeURIComponent(ids.noteId)}/publish`,
      "demo-socio",
      { confirm: true },
    );
    assert.strictEqual(segunda.status, 409);
    console.log("assert: second publish → 409");

    // demo-advogado POST publish on socio note → 404
    assert.strictEqual(
      (
        await pedir(
          "POST",
          `/api/wiki/notes/${encodeURIComponent(ids.noteId)}/publish`,
          "demo-advogado",
          { confirm: true },
        )
      ).status,
      404,
    );
    console.log("assert: demo-advogado publish socio note → 404");

    // empty title → 400
    assert.strictEqual(
      (await pedir("POST", "/api/wiki/notes", "demo-socio", { title: "", body: "x" })).status,
      400,
    );
    assert.strictEqual(
      (await pedir("POST", "/api/wiki/notes", "demo-socio", { title: "   ", body: "x" })).status,
      400,
    );
    console.log("assert: empty title → 400");

    console.log("prova-wiki-publish: OK");
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
  console.error(`prova-wiki-publish failed: ${erro.message}`);
  process.exit(1);
});
