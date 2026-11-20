/**
 * Proves POST /api/rag/query: auth, q bounds, case gate, and fail-closed embed.
 * The request text is not audited.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-rag-query.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const fs = require("fs");
const os = require("os");

const arquivoAuditoria = path.join(os.tmpdir(), `prova-rag-query-audit-${Date.now()}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = arquivoAuditoria;

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { AuditService } = require("../dist/modules/gateway/audit.service");

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const audit = app.get(AuditService, { strict: false });

  const pedir = async (method, caminho, token, body) => {
    const resposta = await fetch(`${base}${caminho}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const texto = await resposta.text();
    let corpo = {};
    try {
      corpo = JSON.parse(texto);
    } catch {
      /* not json */
    }
    console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
    return { status: resposta.status, corpo, texto };
  };

  const marker = `rag-marker-${Date.now()}`;

  try {
    assert.strictEqual((await pedir("POST", "/api/rag/query", null, { q: "oi" })).status, 401);
    console.log("assert: no token → 401");

    assert.strictEqual((await pedir("POST", "/api/rag/query", "demo-socio", { q: "" })).status, 400);
    assert.strictEqual(
      (await pedir("POST", "/api/rag/query", "demo-socio", { q: "x".repeat(501) })).status,
      400,
    );
    console.log("assert: empty q and q longer than 500 → 400");

    const lista = await pedir("GET", "/api/casos", "demo-socio");
    const casoId = lista.status === 200 ? String(lista.corpo.casos?.[0]?.id || "") : "";
    if (!casoId) {
      console.log("assert: no demo case id, skipped 403 and 404");
    } else {
      assert.strictEqual(
        (await pedir("POST", "/api/rag/query", "demo-advogado", { q: marker, caseId: casoId })).status,
        403,
      );
      assert.strictEqual(
        (await pedir("POST", "/api/rag/query", "demo-outro", { q: marker, caseId: casoId })).status,
        404,
      );
      console.log("assert: demo-advogado 403, demo-outro 404, before embed");
      const memoria = JSON.stringify(audit.listar(200));
      const arquivo = fs.existsSync(arquivoAuditoria) ? fs.readFileSync(arquivoAuditoria, "utf8") : "";
      assert.ok(!memoria.includes(marker) && !arquivo.includes(marker), "audit must not hold q");
      console.log("assert: audit does not hold q");
    }

    assert.strictEqual((await pedir("POST", "/api/rag/query", "demo-socio", { q: "oi" })).status, 503);
    console.log("assert: demo-socio q oi, no caseId → 503");

    const get = await pedir("GET", "/api/rag/query", "demo-socio");
    assert.notStrictEqual(get.status, 200);
    console.log("assert: GET /api/rag/query is not a route");

    console.log("prova-rag-query: OK");
  } finally {
    fs.rmSync(arquivoAuditoria, { force: true });
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-rag-query failed: ${erro.message}`);
  process.exit(1);
});
