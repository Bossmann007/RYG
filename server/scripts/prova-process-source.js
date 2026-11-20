/**
 * Proves ManualProcessSource and fail-closed unconfigured sources.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-process-source.js
 *
 * Sets PROCESS_SOURCE before NestFactory.create. No DataJud/network clients.
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const NUMERO_OK = "0000001-00.0000.0.00.0001";
const NUMERO_MISS = "0000002-00.0000.0.00.0002";

async function boot() {
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
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const resposta = await fetch(base + caminho, {
    method,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const json = await resposta.json().catch(() => ({}));
  console.log(
    `${method} ${caminho} token=${token || "-"} -> ${resposta.status}` +
      (json.kind ? ` kind=${json.kind}` : "") +
      (json.configurado !== undefined ? ` configurado=${json.configurado}` : "") +
      (json.processo?.court ? ` court=${json.processo.court}` : "")
  );
  return { status: resposta.status, json };
}

async function main() {
  process.env.PROCESS_SOURCE = "manual";
  const manual = await boot();
  try {
    const fonte = await pedir(manual.base, "GET", "/api/process/source");
    assert.strictEqual(fonte.status, 200, "source must be 200 without token");
    assert.strictEqual(fonte.json.kind, "manual", "kind must be manual");
    assert.strictEqual(fonte.json.configurado, true, "manual must be configurado");

    const semToken = await pedir(manual.base, "POST", "/api/process/manual", undefined, {
      processNumber: NUMERO_OK,
      court: "TJSP",
      subjects: ["bancário"],
    });
    assert.strictEqual(semToken.status, 401, "POST manual without token must be 401");

    const criado = await pedir(manual.base, "POST", "/api/process/manual", "demo-socio", {
      processNumber: NUMERO_OK,
      court: "TJSP",
      subjects: ["bancário"],
    });
    assert.strictEqual(criado.status, 201, "POST manual with demo-socio must be 201");

    const capa = await pedir(
      manual.base,
      "GET",
      `/api/process/capa?numero=${encodeURIComponent(NUMERO_OK)}`,
      "demo-socio"
    );
    assert.strictEqual(capa.status, 200, "GET capa known must be 200");
    assert.strictEqual(capa.json.processo?.court, "TJSP", "court must match");

    const miss = await pedir(
      manual.base,
      "GET",
      `/api/process/capa?numero=${encodeURIComponent(NUMERO_MISS)}`,
      "demo-socio"
    );
    assert.strictEqual(miss.status, 404, "GET capa unknown must be 404");
  } finally {
    await manual.app.close();
  }

  process.env.PROCESS_SOURCE = "datajud";
  const datajud = await boot();
  try {
    const fonte = await pedir(datajud.base, "GET", "/api/process/source");
    assert.strictEqual(fonte.status, 200, "datajud source must be 200");
    assert.strictEqual(fonte.json.kind, "datajud", "kind must be datajud");
    assert.strictEqual(fonte.json.configurado, false, "datajud must not be configurado");

    const capa = await pedir(
      datajud.base,
      "GET",
      `/api/process/capa?numero=${encodeURIComponent(NUMERO_OK)}`,
      "demo-socio"
    );
    assert.strictEqual(capa.status, 503, "unconfigured capa must be 503");
  } finally {
    await datajud.app.close();
  }

  console.log("prova-process-source: OK");
}

main().catch((erro) => {
  console.error(`prova-process-source failed: ${erro.message}`);
  process.exit(1);
});
