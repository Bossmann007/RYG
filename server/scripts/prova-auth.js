/**
 * Proves the hub auth guard over real HTTP (Phase 0.5.2).
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-auth.js
 *
 * A token that passes auth may still get 500 on /api/casos when DB_* is not a
 * real TiDB. That is an auth pass and a DB failure, not a casos proof.
 */
require("../dist/register-aliases");
const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const chamar = async (metodo, caminho, token) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers,
      body: metodo === "POST" ? JSON.stringify({ para: "+5541999990000", texto: "oi" }) : undefined,
    });
    const status = resposta.status;
    console.log(`${metodo} ${caminho} token=${token || "-"} -> ${status}`);
    return status;
  };

  try {
    assert.strictEqual(await chamar("GET", "/api/casos"), 401, "casos without token must be 401");
    assert.strictEqual(await chamar("GET", "/api/casos/x"), 401, "caso detail without token must be 401");
    assert.strictEqual(await chamar("GET", "/api/casos", "desconhecido"), 401, "unknown token must be 401");
    assert.notStrictEqual(await chamar("GET", "/api/casos", "demo-socio"), 401, "demo-socio must pass auth");
    assert.strictEqual(await chamar("POST", "/api/whatsapp/enviar"), 401, "whatsapp send without token must be 401");
    assert.notStrictEqual(await chamar("POST", "/api/whatsapp/enviar", "demo-socio"), 401, "whatsapp send with token must pass auth");
    assert.notStrictEqual(await chamar("GET", "/api/whatsapp/status"), 401, "@Public status must stay open");
    console.log("prova-auth: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
