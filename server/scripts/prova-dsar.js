/**
 * Proves Phase 5 Task 5.0c: DSAR inbox stub over real HTTP.
 * Issues an opaque protocol; the request text is never stored, audited, logged or echoed.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-dsar.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const fs = require("fs");
const os = require("os");

// Keep the audit trail of this run out of the repo.
const arquivoAuditoria = path.join(os.tmpdir(), `prova-dsar-audit-${Date.now()}.jsonl`);
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

  const marker = `dsar-marker-${Date.now()}`;
  const pedido = `pedido de teste ${marker}`;

  try {
    assert.strictEqual((await pedir("POST", "/api/dsar", null, { pedido })).status, 401);
    console.log("assert: no token → 401");

    for (const corpo of [{ pedido: "" }, { pedido: "   " }, {}, { pedido: 42 }, { pedido: "x".repeat(5001) }]) {
      assert.strictEqual((await pedir("POST", "/api/dsar", "demo-socio", corpo)).status, 400);
    }
    console.log("assert: empty / missing / non-string / oversized pedido → 400");

    const ok = await pedir("POST", "/api/dsar", "demo-socio", { pedido });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.corpo.zone, "internal");
    assert.match(ok.corpo.protocol, /^dsar_[0-9a-f]{16}$/);
    assert.deepStrictEqual(Object.keys(ok.corpo).sort(), ["protocol", "zone"]);
    assert.ok(!ok.texto.includes(marker), "response must not repeat the request text");
    const outro = await pedir("POST", "/api/dsar", "demo-advogado", { pedido });
    assert.notStrictEqual(outro.corpo.protocol, ok.corpo.protocol);
    console.log("assert: demo-socio → 200, opaque protocol, text not echoed");

    // no listing
    for (const token of [null, "demo-socio"]) {
      const lista = await pedir("GET", "/api/dsar", token);
      assert.notStrictEqual(lista.status, 200);
      assert.ok(!lista.texto.includes(ok.corpo.protocol));
    }
    console.log("assert: GET /api/dsar is not a listing");

    // trail keeps the protocol, never the text
    const memoria = JSON.stringify(audit.listar(200));
    const arquivo = fs.readFileSync(arquivoAuditoria, "utf8");
    assert.ok(memoria.includes(ok.corpo.protocol) && arquivo.includes(ok.corpo.protocol));
    assert.ok(!memoria.includes(marker) && !arquivo.includes(marker), "audit must not hold the request text");
    console.log("assert: audit has the protocol, not the request text");

    console.log("prova-dsar: OK");
  } finally {
    fs.rmSync(arquivoAuditoria, { force: true });
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-dsar failed: ${erro.message}`);
  process.exit(1);
});
