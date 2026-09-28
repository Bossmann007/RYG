/**
 * Proves WhatsApp send is human-confirmed and fail-closed on audit.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-hitl-whatsapp.js
 *
 * Without confirmacao the stub must not run (409 + desafio).
 * With that one-shot token and Bearer demo-socio the stub returns ok.
 * A broken audit file must 503 before any send.
 */
require("../dist/register-aliases");
const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const PEDIDO = { para: "+5541999990000", texto: "oi hitl" };

async function boot() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

async function post(base, caminho, token, corpo) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(base + caminho, {
    method: "POST",
    headers,
    body: JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { bruto: texto.slice(0, 120) };
  }
  return { status: resposta.status, json };
}

async function main() {
  const ligado = await boot();
  try {
    const stub = await post(ligado.base, "/api/whatsapp/conectar-stub", null, {});
    assert.strictEqual(stub.status, 200, "stub connect stays public");

    const sem = await post(ligado.base, "/api/whatsapp/enviar", "demo-socio", PEDIDO);
    console.log(`POST enviar sem confirmacao -> ${sem.status} desafio=${Boolean(sem.json && sem.json.desafio)}`);
    assert.strictEqual(sem.status, 409, "missing confirm must be 409");
    assert.strictEqual(sem.json.confirmacaoNecessaria, true);
    assert.strictEqual(typeof sem.json.desafio, "string");
    assert.notStrictEqual(sem.json.ok, true, "stub must not send without confirm");

    const falso = await post(ligado.base, "/api/whatsapp/enviar", "demo-socio", {
      ...PEDIDO,
      confirmacao: "nao-e-o-desafio",
    });
    console.log(`POST enviar confirmacao falsa -> ${falso.status}`);
    assert.strictEqual(falso.status, 409);
    assert.notStrictEqual(falso.json.ok, true);

    const com = await post(ligado.base, "/api/whatsapp/enviar", "demo-socio", {
      ...PEDIDO,
      confirmacao: sem.json.desafio,
    });
    console.log(`POST enviar com desafio demo-socio -> ${com.status} ok=${com.json && com.json.ok}`);
    assert.strictEqual(com.status, 200);
    assert.strictEqual(com.json.ok, true);
    assert.strictEqual(com.json.modo, "stub_fila_local");

    const replay = await post(ligado.base, "/api/whatsapp/enviar", "demo-socio", {
      ...PEDIDO,
      confirmacao: sem.json.desafio,
    });
    console.log(`POST enviar replay do desafio -> ${replay.status}`);
    assert.strictEqual(replay.status, 409, "one-shot token must not send twice");
    assert.notStrictEqual(replay.json.ok, true);
  } finally {
    await ligado.app.close();
  }

  process.env.GATEWAY_AUDIT_FILE = "/dev/null/auditoria.jsonl";
  const quebrado = await boot();
  try {
    const negado = await post(quebrado.base, "/api/whatsapp/enviar", "demo-socio", PEDIDO);
    console.log(`POST enviar auditoria indisponivel -> ${negado.status} ok=${negado.json && negado.json.ok}`);
    assert.ok(negado.status >= 500, "audit failure must deny the send");
    assert.notStrictEqual(negado.status, 200);
    assert.notStrictEqual(negado.json && negado.json.ok, true);
  } finally {
    await quebrado.app.close();
  }

  console.log("prova-hitl-whatsapp: OK");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
