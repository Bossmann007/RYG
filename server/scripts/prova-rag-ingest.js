/**
 * Proves POST /api/rag/ingest embeds one ACL-readable hardvault doc into
 * rag_chunks, that /api/rag/query then cites it, that a 600-character body is
 * split into several rows, and that other offices and unpublished notes add no
 * row. Deletes only the rows it created.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-rag-ingest.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const fs = require("fs");
const os = require("os");

const arquivoAuditoria = path.join(os.tmpdir(), `prova-rag-ingest-audit-${Date.now()}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = arquivoAuditoria;

const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");
const { USUARIOS_POR_TOKEN } = require("../dist/fixtures/usuarios");

const SISTEMA = new Set(["sys", "mysql", "information_schema", "performance_schema", "metrics_schema"]);

async function main() {
  const env = lerDbEnv();
  assert.ok(env, "DB_* not configured");
  const officeSocio = USUARIOS_POR_TOKEN["demo-socio"].escritorio;
  const officeOutro = USUARIOS_POR_TOKEN["demo-outro"].escritorio;
  assert.ok(officeSocio && officeOutro && officeSocio !== officeOutro, "fixture offices must differ");

  const nonce = `${Date.now()}`;
  const corpoCurto = `Prova ingest ${nonce}: o prazo de apelação é de quinze dias úteis.`;
  // Digits tokenize one per token, so 600 characters pass the 512-token chunk limit.
  let corpoLongo = `Prova ingest longa ${nonce} `;
  for (let i = 0; corpoLongo.length < 600; i++) {
    corpoLongo += i % 10;
  }
  const notas = [];
  const docs = [];

  const pool = mysql.createPool(opcoesPool(env));
  let app;
  try {
    const [[atual]] = await pool.query("SELECT DATABASE() AS db");
    const nome = String(atual.db || "");
    assert.ok(nome && !SISTEMA.has(nome.toLowerCase()), "refusing to run on a system schema");

    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, "127.0.0.1");
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

    const pedir = async (caminho, token, body) => {
      const resposta = await fetch(`${base}${caminho}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const corpo = await resposta.json().catch(() => ({}));
      console.log(`POST ${caminho} token=${token || "-"} -> ${resposta.status}`);
      return { status: resposta.status, corpo };
    };
    const linhasRag = async (office, docId) => {
      const [linhas] = await pool.query(
        "SELECT COUNT(*) AS n FROM rag_chunks WHERE office_id = ? AND doc_id = ?",
        [office, docId],
      );
      return Number(linhas[0].n);
    };
    const criarNota = async (title, body) => {
      const criada = await pedir("/api/wiki/notes", "demo-socio", { title, body });
      assert.strictEqual(criada.status, 201, "create note");
      notas.push(String(criada.corpo.note.id));
      return String(criada.corpo.note.id);
    };
    const publicar = async (noteId) => {
      const publicada = await pedir(`/api/wiki/notes/${encodeURIComponent(noteId)}/publish`, "demo-socio", {
        confirm: true,
      });
      assert.strictEqual(publicada.status, 200, "publish note");
      docs.push(String(publicada.corpo.doc.id));
      return String(publicada.corpo.doc.id);
    };

    const docId = await publicar(await criarNota(`prova-rag-ingest-${nonce}`, corpoCurto));
    console.log(`assert: demo-socio note published as hardvault doc ${docId}`);

    assert.strictEqual((await pedir("/api/rag/ingest", null, { docId })).status, 401, "no bearer → 401");
    assert.strictEqual((await pedir("/api/rag/ingest", "demo-socio", {})).status, 400, "missing docId → 400");
    assert.strictEqual((await pedir("/api/rag/ingest", "demo-socio", { docId: "" })).status, 400, "empty docId → 400");
    console.log("assert: no bearer 401, missing or empty docId 400");

    const ingest = await pedir("/api/rag/ingest", "demo-socio", { docId });
    assert.strictEqual(ingest.status, 200);
    assert.deepStrictEqual(ingest.corpo, { docId, chunks: 1 }, "response must be exactly { docId, chunks: 1 }");
    assert.strictEqual(await linhasRag(officeSocio, docId), 1);
    const [[linha]] = await pool.query(
      "SELECT snippet, embed_tag, embed_digest, case_id FROM rag_chunks WHERE office_id = ? AND doc_id = ?",
      [officeSocio, docId],
    );
    assert.strictEqual(linha.snippet, corpoCurto);
    assert.strictEqual(linha.embed_tag, "embeddinggemma:300m");
    assert.strictEqual(linha.embed_digest, "85462619ee72");
    assert.strictEqual(linha.case_id, null);
    console.log("assert: demo-socio ingest 200, chunks 1, one row with pinned tag and digest");

    const [[antes]] = await pool.query("SELECT id FROM rag_chunks WHERE office_id = ? AND doc_id = ?", [
      officeSocio,
      docId,
    ]);
    assert.strictEqual((await pedir("/api/rag/ingest", "demo-socio", { docId })).status, 200);
    const [[depois]] = await pool.query("SELECT id FROM rag_chunks WHERE office_id = ? AND doc_id = ?", [
      officeSocio,
      docId,
    ]);
    assert.strictEqual(await linhasRag(officeSocio, docId), 1, "re-ingest must keep one row");
    assert.notStrictEqual(antes.id, depois.id, "re-ingest must replace with a new id");
    console.log("assert: re-ingest replaces, still one row, new id");

    const consulta = await pedir("/api/rag/query", "demo-socio", { q: corpoCurto });
    assert.strictEqual(consulta.status, 200);
    assert.strictEqual(consulta.corpo.citeStatus, "cited");
    const hit = consulta.corpo.hits.find((h) => h.docId === docId);
    assert.ok(hit, "ingested docId must be cited");
    console.log(`assert: demo-socio query cited docId distance=${hit.distance.toFixed(4)}`);

    assert.strictEqual((await pedir("/api/rag/ingest", "demo-outro", { docId })).status, 404);
    assert.strictEqual(await linhasRag(officeOutro, docId), 0, "no row for demo-outro office");
    console.log("assert: demo-outro ingest 404, no row for other office");

    const notaPrivada = await criarNota(`prova-rag-ingest-privada-${nonce}`, `nota privada ${nonce}`);
    assert.strictEqual((await pedir("/api/rag/ingest", "demo-socio", { docId: notaPrivada })).status, 404);
    assert.strictEqual(await linhasRag(officeSocio, notaPrivada), 0);
    console.log("assert: unpublished personal note id 404, no rag row");

    const docLongo = await publicar(await criarNota(`prova-rag-ingest-longa-${nonce}`, corpoLongo));
    const longo = await pedir("/api/rag/ingest", "demo-socio", { docId: docLongo });
    assert.strictEqual(longo.status, 200);
    assert.strictEqual(longo.corpo.docId, docLongo);
    assert.ok(longo.corpo.chunks >= 2, `long body must split, got ${longo.corpo.chunks}`);
    assert.strictEqual(await linhasRag(officeSocio, docLongo), longo.corpo.chunks, "rows must equal chunks");
    const [snippets] = await pool.query("SELECT snippet FROM rag_chunks WHERE office_id = ? AND doc_id = ?", [
      officeSocio,
      docLongo,
    ]);
    assert.ok(snippets.every((r) => r.snippet.length >= 1 && r.snippet.length <= 160), "snippet length 1..160");
    const consultaLonga = await pedir("/api/rag/query", "demo-socio", { q: corpoLongo.slice(0, 120) });
    assert.strictEqual(consultaLonga.status, 200);
    assert.strictEqual(consultaLonga.corpo.citeStatus, "cited");
    assert.ok(consultaLonga.corpo.hits.some((h) => h.docId === docLongo), "long docId must be cited");
    console.log(`assert: ${corpoLongo.length}-char body 200, chunks ${longo.corpo.chunks}, rows match, snippets <= 160, cited`);

    console.log("prova-rag-ingest: OK");
  } finally {
    if (app) {
      await app.close();
    }
    for (const docId of docs) {
      await pool.query("DELETE FROM rag_cites WHERE source_id = ?", [docId]);
      await pool.query("DELETE FROM rag_chunks WHERE office_id IN (?, ?) AND doc_id = ?", [
        officeSocio,
        officeOutro,
        docId,
      ]);
      await pool.query("DELETE FROM hardvault_acl WHERE office_id = ? AND doc_id = ?", [officeSocio, docId]);
      await pool.query("DELETE FROM hardvault_docs WHERE office_id = ? AND id = ?", [officeSocio, docId]);
    }
    for (const noteId of notas) {
      await pool.query("DELETE FROM rag_chunks WHERE office_id = ? AND doc_id = ?", [officeSocio, noteId]);
      await pool.query("DELETE FROM hardvault_publish_requests WHERE office_id = ? AND note_id = ?", [
        officeSocio,
        noteId,
      ]);
      await pool.query("DELETE FROM vault_personal_notes WHERE office_id = ? AND id = ?", [officeSocio, noteId]);
    }
    await pool.end();
    fs.rmSync(arquivoAuditoria, { force: true });
  }
}

main().catch((erro) => {
  console.error(`prova-rag-ingest failed: ${erro.message}`);
  process.exit(1);
});
