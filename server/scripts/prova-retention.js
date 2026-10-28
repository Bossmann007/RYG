/**
 * Proves legal hold blocks case delete (Phase 5.0).
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run prova:retention
 */
require("../dist/register-aliases");
const assert = require("assert");
const os = require("os");
const path = require("path");

process.env.GATEWAY_AUDIT_FILE = path.join(os.tmpdir(), `prova-retention-${process.pid}.jsonl`);

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

async function pedir(base, method, caminho, token, corpo) {
  const headers = { Authorization: `Bearer ${token}` };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const resposta = await fetch(base + caminho, {
    method,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { bruto: texto };
  }
  return { status: resposta.status, json };
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  try {
    const casoId = `hold-${process.pid}`;
    const put = await pedir(base, "PUT", `/api/casos/${casoId}/retention`, "demo-socio", {
      legalHold: true,
      retentionUntil: "2030-12-31",
    });
    assert.strictEqual(put.status, 200, `put hold HTTP ${put.status}`);
    assert.strictEqual(put.json.zone, "internal");
    assert.strictEqual(put.json.retention.legalHold, true);

    const get = await pedir(base, "GET", `/api/casos/${casoId}/retention`, "demo-socio");
    assert.strictEqual(get.status, 200);
    assert.strictEqual(get.json.retention.legalHold, true);

    const adv = await pedir(base, "PUT", `/api/casos/${casoId}/retention`, "demo-advogado", {
      legalHold: false,
    });
    assert.strictEqual(adv.status, 403, "advogado cannot clear hold");

    const { RetentionService } = require("../dist/modules/retention/retention.service");
    const retention = app.get(RetentionService);
    let bloqueou = false;
    try {
      await retention.assertPodeApagar("prado-advogados", casoId);
    } catch (erro) {
      bloqueou = true;
      assert.strictEqual(erro.status, 409);
    }
    assert.ok(bloqueou, "assertPodeApagar must conflict under hold");

    await retention.definirHold(
      { id: "u-001", nome: "x", papel: "socio", escritorio: "prado-advogados" },
      casoId,
      false,
      null,
    );
    await retention.assertPodeApagar("prado-advogados", casoId);

    console.log("prova-retention: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-retention failed: ${erro.message}`);
  process.exit(1);
});
