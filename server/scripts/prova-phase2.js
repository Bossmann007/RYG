/**
 * Phase 2 evidence: Backstage tools catalog, manual ProcessSource, prazo CPC.
 *
 *   PROCESS_SOURCE=manual pnpm --dir server run build
 *   PROCESS_SOURCE=manual node server/scripts/prova-phase2.js
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

const AUDIT_OK = path.join(os.tmpdir(), `ryg-phase2-${process.pid}.jsonl`);
const CNJ_MANUAL = "0000999-99.2026.8.16.0001";

async function boot() {
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
  process.env.PROCESS_SOURCE = "manual";
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
    const catalogo = await pedir(base, "GET", "/api/catalogo");
    assert.strictEqual(catalogo.status, 200);
    assert.strictEqual(catalogo.json.surface, "backstage");
    const tools = (catalogo.json.itens || []).filter((i) => i.kind === "tool");
    assert.ok(tools.length >= 5, `expected ≥5 tools, got ${tools.length}`);
    assert.ok(tools.some((t) => t.id === "tool-prazo-cpc"));
    assert.ok(tools.some((t) => t.id === "tool-datajud-capa"));
    assert.ok(tools.every((t) => typeof t.requerSafeDto === "boolean"));

    const fonte = await pedir(base, "GET", "/api/process/source");
    assert.strictEqual(fonte.status, 200);
    assert.strictEqual(fonte.json.kind, "manual");
    assert.strictEqual(fonte.json.configurado, true);

    assert.strictEqual(
      (await pedir(base, "GET", `/api/process/capa/${CNJ_MANUAL}`)).status,
      401,
    );

    const capa = await pedir(
      base,
      "GET",
      `/api/process/capa/${CNJ_MANUAL}`,
      "demo-socio",
    );
    assert.strictEqual(capa.status, 200);
    assert.strictEqual(capa.json.source, "manual");
    assert.strictEqual(capa.json.processo.processNumber, CNJ_MANUAL);

    const prazo = await pedir(base, "POST", "/api/tools/prazo-cpc", "demo-socio", {
      startedAt: "2026-10-01",
      days: 2,
      calendar: "uteis",
    });
    assert.strictEqual(prazo.status, 200);
    assert.strictEqual(prazo.json.tool, "prazo_cpc");
    assert.strictEqual(prazo.json.dueAt, "2026-10-05");

    assert.strictEqual(
      (await pedir(base, "POST", "/api/tools/prazo-cpc", undefined, {
        startedAt: "2026-10-01",
        days: 2,
        calendar: "uteis",
      })).status,
      401,
    );

    console.log(`prova-phase2: OK tools=${tools.length} capa=${CNJ_MANUAL}`);
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
