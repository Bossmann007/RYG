/**
 * Phase 6: ACL retrieval + cite-or-silent + consult pack (no mutation tools).
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run prova:rag
 */
require("../dist/register-aliases");
const assert = require("assert");
const os = require("os");
const path = require("path");

async function boot(envExtra = {}) {
  for (const [k, v] of Object.entries(envExtra)) {
    if (v === null) delete process.env[k];
    else process.env[k] = v;
  }
  process.env.GATEWAY_AUDIT_FILE = path.join(
    os.tmpdir(),
    `prova-rag-${process.pid}-${Date.now()}.jsonl`,
  );
  const { NestFactory } = require("@nestjs/core");
  const { AppModule } = require("../dist/app.module");
  const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

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
  delete process.env.OFFICE_HOSTED_AI;
  const ligado = await boot({});
  try {
    const acl = await pedir(ligado.base, "POST", "/api/rag/query", "demo-socio", {
      q: "Doc de outro office",
    });
    assert.strictEqual(acl.status, 200);
    assert.strictEqual(acl.json.silent, true);
    assert.strictEqual(acl.json.hits.length, 0, "cross-office must be zero hits");

    const silent = await pedir(ligado.base, "POST", "/api/rag/query", "demo-socio", {
      q: "Nota sem ementa",
    });
    assert.strictEqual(silent.status, 200);
    assert.strictEqual(silent.json.silent, true, "empty snippet → silent");

    const ok = await pedir(ligado.base, "POST", "/api/rag/query", "demo-socio", {
      q: "CDC consumo",
      runtime: "linked-provider",
    });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.json.silent, false);
    assert.ok(ok.json.hits.length >= 1);
    assert.strictEqual(ok.json.hits[0].citeStatus, "ok");
    assert.ok(ok.json.ledgerIds.length >= 1);

    const est = await pedir(ligado.base, "POST", "/api/rag/query", "demo-estagiario", {
      q: "Memorando sigiloso",
    });
    assert.strictEqual(est.status, 200);
    assert.strictEqual(est.json.hits.length, 0, "estagiario clearance blocks sigiloso");

    const hostedOff = await pedir(ligado.base, "POST", "/api/rag/consult", "demo-socio", {
      q: "CDC consumo",
      runtime: "office-hosted",
    });
    assert.strictEqual(hostedOff.status, 403, "office-hosted requires flag");
  } finally {
    await ligado.app.close();
  }

  const hosted = await boot({ OFFICE_HOSTED_AI: "true" });
  try {
    const consult = await pedir(hosted.base, "POST", "/api/rag/consult", "demo-socio", {
      q: "CDC consumo",
      runtime: "office-hosted",
    });
    assert.strictEqual(consult.status, 200);
    assert.strictEqual(consult.json.mode, "consult");
    assert.strictEqual(consult.json.runtime, "office-hosted");
    assert.deepStrictEqual(consult.json.mutationTools, []);
    assert.ok(String(consult.json.notice || "").includes("Revisão humana"));
    assert.ok(consult.json.hits.length >= 1);

    const ledger = await pedir(hosted.base, "GET", "/api/rag/ledger", "demo-socio");
    assert.strictEqual(ledger.status, 200);
    assert.ok(Array.isArray(ledger.json.rows));
    assert.ok(ledger.json.rows.length >= 1);

    console.log("prova-rag: OK");
  } finally {
    await hosted.app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-rag failed: ${erro.message}`);
  process.exit(1);
});
