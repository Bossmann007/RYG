/**
 * Phase 0.5 gap close: catalog + process/source auth, SafeDTO export gate.
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run prova:trust-gaps
 */
require("../dist/register-aliases");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function boot() {
  process.env.GATEWAY_AUDIT_FILE = path.join(
    os.tmpdir(),
    `prova-trust-gaps-${process.pid}.jsonl`,
  );
  fs.writeFileSync(process.env.GATEWAY_AUDIT_FILE, "");
  const { NestFactory } = require("@nestjs/core");
  const { AppModule } = require("../dist/app.module");
  const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base, auditFile: process.env.GATEWAY_AUDIT_FILE };
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
  const { app, base, auditFile } = await boot();
  try {
    assert.strictEqual((await pedir(base, "GET", "/api/catalogo")).status, 401);
    assert.strictEqual((await pedir(base, "GET", "/api/process/source")).status, 401);

    const lista = await pedir(base, "GET", "/api/catalogo", "demo-socio");
    assert.strictEqual(lista.status, 200);
    assert.ok(Array.isArray(lista.json.itens));

    const limpo = await pedir(
      base,
      "GET",
      "/api/catalogo/export/prompt-capa-bancario",
      "demo-socio",
    );
    assert.strictEqual(limpo.status, 200);
    assert.strictEqual(limpo.json.requerSafeDto, false);

    const semRelease = await pedir(
      base,
      "GET",
      "/api/catalogo/export/prompt-checklist-revisao",
      "demo-socio",
    );
    assert.strictEqual(semRelease.status, 400, "requerSafeDto export needs release id");

    const comRelease = await pedir(
      base,
      "GET",
      "/api/catalogo/export/prompt-checklist-revisao?safeDtoReleaseId=rel_prova",
      "demo-socio",
    );
    assert.strictEqual(comRelease.status, 200);
    assert.strictEqual(comRelease.json.requerSafeDto, true);

    const linhas = fs
      .readFileSync(auditFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    assert.ok(
      linhas.some((l) => l.ferramenta === "catalog_export" && l.decisao === "negado"),
      "denied SafeDTO export audited",
    );
    assert.ok(
      linhas.some((l) => l.ferramenta === "catalog_export" && l.decisao === "permitido"),
      "allowed export audited",
    );

    console.log("prova-trust-gaps: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-trust-gaps failed: ${erro.message}`);
  process.exit(1);
});
