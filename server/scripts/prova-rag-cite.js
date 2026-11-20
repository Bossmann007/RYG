/**
 * Proves POST /api/rag/query cites a real embedded row: one inserted chunk is
 * found by demo-socio's office and absent for demo-outro. Deletes only the row
 * it inserted.
 *
 *   node server/scripts/prova-rag-cite.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const fs = require("fs");
const os = require("os");

const arquivoAuditoria = path.join(os.tmpdir(), `prova-rag-cite-audit-${Date.now()}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = arquivoAuditoria;

const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");
const { USUARIOS_POR_TOKEN } = require("../dist/fixtures/usuarios");

const OLLAMA = "http://127.0.0.1:11434";
const MODELO = "embeddinggemma:300m";
const DIGEST = "85462619ee72";
const PREFIXO_DOC = "title: none | text: ";
const TEXTO = "O prazo para contestação no procedimento comum é de quinze dias úteis.";
const SISTEMA = new Set(["sys", "mysql", "information_schema", "performance_schema", "metrics_schema"]);

async function main() {
  const env = lerDbEnv();
  assert.ok(env, "DB_* not configured");
  assert.ok(TEXTO.length <= 160, "snippet must be at most 160 chars");

  const officeSocio = USUARIOS_POR_TOKEN["demo-socio"].escritorio;
  const officeOutro = USUARIOS_POR_TOKEN["demo-outro"].escritorio;
  assert.ok(officeSocio && officeOutro && officeSocio !== officeOutro, "fixture offices must differ");

  const tags = await (await fetch(`${OLLAMA}/api/tags`)).json();
  const modelo = (tags.models || []).find((m) => m.name === MODELO);
  assert.ok(modelo, `${MODELO} not in /api/tags`);
  assert.ok(String(modelo.digest).startsWith(DIGEST), "local digest does not start with " + DIGEST);
  console.log(`assert: ${MODELO} digest starts with ${DIGEST}`);

  const respEmbed = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELO, input: PREFIXO_DOC + TEXTO, truncate: false }),
  });
  assert.strictEqual(respEmbed.status, 200, "embed status");
  const vetorBruto = (await respEmbed.json()).embeddings?.[0];
  assert.ok(Array.isArray(vetorBruto) && vetorBruto.length === 768, "embedding must be 768 wide");
  const vetor = "[" + vetorBruto.join(",") + "]";
  console.log("assert: document embedding length 768");

  const sufixo = `${Date.now()}`;
  const id = `prova-rag-cite-${sufixo}`;
  const docId = `prova-rag-cite-doc-${sufixo}`;

  const pool = mysql.createPool(opcoesPool(env));
  let app;
  let inseriu = false;
  let silencioId = null;
  let consultSilencioId = null;
  try {
    const [[atual]] = await pool.query("SELECT DATABASE() AS db");
    const nome = String(atual.db || "");
    assert.ok(nome && !SISTEMA.has(nome.toLowerCase()), "refusing to run on a system schema");

    const citesSql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261020_rag_cites.sql"),
      "utf8",
    );
    for (const comando of citesSql
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((comando) => comando.trim())
      .filter(Boolean)) {
      await pool.query(comando);
    }

    await pool.query(
      `INSERT INTO rag_chunks
        (id, office_id, case_id, doc_id, snippet, embed_tag, embed_digest, embedding)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
      [id, officeSocio, docId, TEXTO, MODELO, DIGEST, vetor],
    );
    inseriu = true;
    console.log("assert: one rag_chunks row inserted for demo-socio office");

    process.env.OFFICE_HOSTED_AI = officeSocio;
    delete process.env.OLLAMA_CONSULT_MODEL;
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, "127.0.0.1");
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

    const consultar = async (token) => {
      const resposta = await fetch(`${base}/api/rag/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ q: TEXTO }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      console.log(`POST /api/rag/query token=${token} -> ${resposta.status} citeStatus=${corpo.citeStatus}`);
      return { status: resposta.status, corpo };
    };

    const socio = await consultar("demo-socio");
    assert.strictEqual(socio.status, 200);
    assert.strictEqual(socio.corpo.citeStatus, "cited");
    const hit = socio.corpo.hits.find((h) => h.docId === docId);
    assert.ok(hit, "inserted docId must be in demo-socio hits");
    assert.ok(hit.snippet.length <= 160, "snippet must be at most 160 chars");
    assert.ok(socio.corpo.hits.every((h) => h.snippet.length <= 160), "every snippet at most 160 chars");
    console.log(`assert: demo-socio 200, cited, docId present, distance=${hit.distance.toFixed(4)}`);

    const [citas] = await pool.query(
      `SELECT office_id, user_id, case_id, release_id, source_id, cite_status
         FROM rag_cites WHERE source_id = ?`,
      [docId],
    );
    assert.strictEqual(citas.length, 1);
    assert.strictEqual(citas[0].office_id, officeSocio);
    assert.strictEqual(citas[0].user_id, USUARIOS_POR_TOKEN["demo-socio"].id);
    assert.strictEqual(citas[0].case_id, null);
    assert.match(String(citas[0].release_id), /^rel_[0-9a-f]{12}$/);
    assert.strictEqual(citas[0].cite_status, "cited");
    assert.ok(!JSON.stringify(citas[0]).includes(TEXTO), "ledger must not store the question");
    console.log("assert: cite ledger has source, release, user, and no question text");

    const consult = async (token) => {
      const resposta = await fetch(`${base}/api/rag/consult`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ q: TEXTO }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      console.log(`POST /api/rag/consult token=${token} -> ${resposta.status}`);
      return { status: resposta.status, corpo };
    };
    const local = await consult("demo-socio");
    assert.strictEqual(local.status, 200);
    assert.strictEqual(local.corpo.runtime, "office-hosted");
    assert.strictEqual(local.corpo.citeStatus, "cited");
    assert.strictEqual(local.corpo.generative, false);
    assert.strictEqual(local.corpo.notice, "Rascunho. Uma pessoa revisa antes de protocolar.");
    assert.ok(String(local.corpo.answer).includes("prazo"));
    assert.ok(local.corpo.hits.some((h) => h.docId === docId));
    const bloqueado = await consult("demo-outro");
    assert.strictEqual(bloqueado.status, 403);
    console.log("assert: office-hosted consult cites without a generative call; other office is off");

    const [[antesOutro]] = await pool.query(
      "SELECT COUNT(*) AS n FROM rag_cites WHERE user_id = ?",
      [USUARIOS_POR_TOKEN["demo-outro"].id],
    );
    const outro = await consultar("demo-outro");
    assert.strictEqual(outro.status, 200);
    assert.ok(!outro.corpo.hits.some((h) => h.docId === docId), "docId must be absent for demo-outro");
    console.log(`assert: demo-outro 200, docId absent, citeStatus=${outro.corpo.citeStatus}`);
    const [[depoisOutro]] = await pool.query(
      "SELECT COUNT(*) AS n FROM rag_cites WHERE user_id = ?",
      [USUARIOS_POR_TOKEN["demo-outro"].id],
    );
    assert.strictEqual(Number(depoisOutro.n), Number(antesOutro.n) + 1);
    const [silencio] = await pool.query(
      `SELECT id, source_id, cite_status FROM rag_cites
        WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      [USUARIOS_POR_TOKEN["demo-outro"].id],
    );
    assert.strictEqual(silencio[0].cite_status, "silent");
    assert.strictEqual(silencio[0].source_id, null);
    silencioId = silencio[0].id;
    assert.ok(!JSON.stringify(silencio[0]).includes(TEXTO));
    console.log("assert: silent retrieval ledgers a row with no source and no question");

    process.env.OLLAMA_CONSULT_MODEL = "modelo-inexistente";
    process.env.OFFICE_HOSTED_AI = `${officeSocio},${officeOutro}`;
    const calado = await consult("demo-outro");
    assert.strictEqual(calado.status, 200);
    assert.strictEqual(calado.corpo.citeStatus, "silent");
    assert.strictEqual(calado.corpo.answer, null);
    assert.strictEqual(calado.corpo.generative, false);
    const [caladoRow] = await pool.query(
      `SELECT id FROM rag_cites WHERE user_id = ? AND source_id IS NULL ORDER BY created_at DESC, id DESC LIMIT 1`,
      [USUARIOS_POR_TOKEN["demo-outro"].id],
    );
    consultSilencioId = caladoRow[0].id;
    const falho = await consult("demo-socio");
    assert.strictEqual(falho.status, 503);
    console.log("assert: silent consult skips the model; a cited consult calls it");

    console.log("prova-rag-cite: OK");
  } finally {
    if (app) {
      await app.close();
    }
    if (inseriu) {
      await pool.query("DELETE FROM rag_cites WHERE source_id = ?", [docId]);
      if (silencioId) {
        await pool.query("DELETE FROM rag_cites WHERE id = ?", [silencioId]);
      }
      if (consultSilencioId) {
        await pool.query("DELETE FROM rag_cites WHERE id = ?", [consultSilencioId]);
      }
      await pool.query("DELETE FROM rag_chunks WHERE id = ?", [id]);
    }
    await pool.end();
    fs.rmSync(arquivoAuditoria, { force: true });
  }
}

main().catch((erro) => {
  console.error(`prova-rag-cite failed: ${erro.message}`);
  process.exit(1);
});
