/**
 * Phase 7: honorários ACL + append-only + audit without amount.
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run prova:financeiro
 */
require("../dist/register-aliases");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function boot() {
  process.env.GATEWAY_AUDIT_FILE = path.join(
    os.tmpdir(),
    `prova-financeiro-${process.pid}.jsonl`,
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
  const casoId = `fin-${process.pid}`;
  try {
    assert.strictEqual(
      (await pedir(base, "GET", `/api/casos/${casoId}/honorarios`)).status,
      401,
    );

    const est = await pedir(base, "POST", `/api/casos/${casoId}/honorarios`, "demo-estagiario", {
      amountCentavos: 150000,
      kind: "contratado",
    });
    assert.strictEqual(est.status, 403, "estagiario cannot write honorarios");

    const post = await pedir(base, "POST", `/api/casos/${casoId}/honorarios`, "demo-socio", {
      amountCentavos: 150000,
      kind: "contratado",
    });
    assert.strictEqual(post.status, 201);
    assert.strictEqual(post.json.zone, "internal");
    assert.strictEqual(post.json.lancamento.amountCentavos, 150000);
    assert.strictEqual(post.json.lancamento.kind, "contratado");

    const lista = await pedir(base, "GET", `/api/casos/${casoId}/honorarios`, "demo-socio");
    assert.strictEqual(lista.status, 200);
    assert.strictEqual(lista.json.lancamentos.length, 1);

    const adv = await pedir(base, "GET", `/api/casos/${casoId}/honorarios`, "demo-advogado");
    assert.strictEqual(adv.status, 403, "same-office non-member denied");

    const outro = await pedir(base, "GET", `/api/casos/${casoId}/honorarios`, "demo-outro");
    assert.strictEqual(outro.status, 404, "cross-office not found");

    const linhas = fs
      .readFileSync(auditFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const append = linhas.find((l) => l.ferramenta === "honorario_append");
    assert.ok(append, "append audited");
    assert.strictEqual(append.argumentos.amountCentavos, undefined);
    assert.ok(append.omitido.includes("amountCentavos"));
    assert.ok(append.argumentos.lancamentoId);

    console.log("prova-financeiro: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-financeiro failed: ${erro.message}`);
  process.exit(1);
});
