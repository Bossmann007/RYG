/**
 * Phase 2.5: case has historico + prazos; CPC tool can persist to case.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-pms-depth.js
 *   node server/scripts/prova-pms-depth.js
 */
require("../dist/register-aliases");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const AUDIT_OK = path.join(os.tmpdir(), `ryg-pms-depth-${process.pid}.jsonl`);
const CASO_ID = "1";

async function boot() {
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

async function pedir(base, method, caminho, token, corpo) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (corpo) headers["Content-Type"] = "application/json";
  const resposta = await fetch(base + caminho, {
    method,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { bruto: texto };
  }
  console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
  return { status: resposta.status, json };
}

async function main() {
  fs.writeFileSync(AUDIT_OK, "");
  const { app, base } = await boot();
  try {
    const detalhe = await pedir(base, "GET", `/api/casos/${CASO_ID}`, "demo-socio");
    assert.strictEqual(detalhe.status, 200);
    const caso = detalhe.json.caso;
    assert.ok(caso);
    assert.ok(Array.isArray(caso.partes) && caso.partes.length >= 1, "partes required");
    assert.ok(caso.historico.length >= 1, "historico seed required");
    assert.ok(caso.prazos.length >= 1, "prazos seed required");
    console.log(
      `caso ${CASO_ID}: historico=${caso.historico.length} prazos=${caso.prazos.length} partes=${caso.partes.length}`,
    );

    const antes = caso.prazos.length;
    const cpc = await pedir(base, "POST", "/api/tools/prazo-cpc", "demo-socio", {
      startedAt: "2026-10-01",
      days: 5,
      calendar: "uteis",
      casoId: CASO_ID,
      title: "Prazo CPC prova PMS",
      kind: "manifestacao",
    });
    assert.strictEqual(cpc.status, 200);
    assert.strictEqual(cpc.json.persistido, true);
    assert.ok(cpc.json.prazoId);

    const negado = await pedir(base, "POST", "/api/tools/prazo-cpc", "demo-advogado", {
      startedAt: "2026-10-01",
      days: 5,
      calendar: "uteis",
      casoId: CASO_ID,
      title: "Sem membership",
    });
    assert.strictEqual(negado.status, 403);

    const depois = await pedir(base, "GET", `/api/casos/${CASO_ID}`, "demo-socio");
    assert.strictEqual(depois.status, 200);
    assert.ok(depois.json.caso.prazos.length >= antes + 1);
    assert.ok(
      depois.json.caso.prazos.some((p) => String(p.title).includes("Prazo CPC prova PMS")),
    );

    console.log("prova-pms-depth: OK");
  } finally {
    await app.close();
    try {
      fs.unlinkSync(AUDIT_OK);
    } catch {
      /* ignore */
    }
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
