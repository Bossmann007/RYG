/**
 * Proves in-memory secrets vault + transfer note stub.
 *
 *   HUB_VAULT_KEY=prova pnpm --dir server exec nest build
 *   HUB_VAULT_KEY=prova node server/scripts/prova-vault.js
 */
require("../dist/register-aliases");
const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

async function boot() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

async function req(base, metodo, caminho, token, corpo) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, json: await resposta.json().catch(() => ({})) };
}

async function main() {
  const prevKey = process.env.HUB_VAULT_KEY;
  const prevAudit = process.env.GATEWAY_AUDIT_FILE;
  process.env.HUB_VAULT_KEY = "prova-vault-key";
  delete process.env.GATEWAY_AUDIT_FILE;

  const ligado = await boot();
  try {
    const put = await req(ligado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: "wa-token",
      value: "super-secreto",
    });
    console.log(`POST vault -> ${put.status} stored=${put.json.stored}`);
    assert.strictEqual(put.status, 200);
    assert.strictEqual(put.json.stored, true);
    assert.strictEqual(put.json.value, undefined);

    const get = await req(ligado.base, "GET", "/api/vault/secret?name=wa-token", "demo-socio");
    assert.strictEqual(get.status, 200);
    assert.strictEqual(get.json.value, "super-secreto");

    const outro = await req(ligado.base, "GET", "/api/vault/secret?name=wa-token", "demo-advogado");
    assert.strictEqual(outro.status, 404);

    const note = await req(ligado.base, "POST", "/api/transfer/note", "demo-socio", {
      destino: "linked-provider",
      motivo: "export demo",
    });
    assert.strictEqual(note.status, 200);
    assert.strictEqual(note.json.registrado, true);
  } finally {
    await ligado.app.close();
  }

  delete process.env.HUB_VAULT_KEY;
  const semChave = await boot();
  try {
    const put = await req(semChave.base, "POST", "/api/vault/secret", "demo-socio", {
      name: "x",
      value: "y",
    });
    console.log(`POST vault sem chave -> ${put.status}`);
    assert.ok(put.status >= 500, "missing HUB_VAULT_KEY must 503");
  } finally {
    await semChave.app.close();
  }

  process.env.HUB_VAULT_KEY = "prova-vault-key";
  process.env.GATEWAY_AUDIT_FILE = "/dev/null/auditoria.jsonl";
  const quebrado = await boot();
  try {
    const put = await req(quebrado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: "x",
      value: "y",
    });
    assert.ok(put.status >= 500, "audit failure must 503 before store");
  } finally {
    await quebrado.app.close();
  }

  if (prevKey == null) delete process.env.HUB_VAULT_KEY;
  else process.env.HUB_VAULT_KEY = prevKey;
  if (prevAudit == null) delete process.env.GATEWAY_AUDIT_FILE;
  else process.env.GATEWAY_AUDIT_FILE = prevAudit;

  console.log("prova-vault: OK");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
