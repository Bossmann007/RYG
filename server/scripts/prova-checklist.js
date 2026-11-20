/**
 * Banking checklist is case-scoped. Membership and clearance follow capa.
 * Marks live in memory; restart wipes them.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-checklist.js
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

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const pedir = async (method, caminho, token, body) => {
    const resposta = await fetch(`${base}${caminho}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const corpo = await resposta.json().catch(() => ({}));
    console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
    return { status: resposta.status, corpo };
  };

  try {
    const lista = await pedir("GET", "/api/casos", "demo-socio");
    assert.strictEqual(lista.status, 200);
    const casoId = lista.corpo.casos?.[0]?.id;
    assert.ok(casoId, "demo-socio must see at least one case");
    const caminho = `/api/casos/${encodeURIComponent(casoId)}/checklist`;

    assert.strictEqual((await pedir("GET", caminho)).status, 401);
    assert.strictEqual((await pedir("GET", caminho, "demo-outro")).status, 404);
    assert.strictEqual((await pedir("GET", caminho, "demo-advogado")).status, 403);

    const aberto = await pedir("GET", caminho, "demo-socio");
    assert.strictEqual(aberto.status, 200);
    assert.strictEqual(aberto.corpo.zone, "internal");
    assert.deepStrictEqual(
      aberto.corpo.itens.map((item) => item.id),
      ["tarifas", "seguro", "iof", "vencimento"],
    );
    assert.ok(aberto.corpo.itens.every((item) => item.done === false));

    const marcado = await pedir("POST", caminho, "demo-socio", { item: "tarifas", done: true });
    assert.strictEqual(marcado.status, 200);
    assert.strictEqual(marcado.corpo.itens.find((item) => item.id === "tarifas").done, true);

    const deNovo = await pedir("GET", caminho, "demo-socio");
    assert.strictEqual(deNovo.corpo.itens.find((item) => item.id === "tarifas").done, true);

    assert.strictEqual(
      (await pedir("POST", caminho, "demo-socio", { item: "fora", done: true })).status,
      400,
    );
    assert.strictEqual((await pedir("POST", caminho, "demo-advogado", { item: "iof", done: true })).status, 403);
    assert.strictEqual((await pedir("POST", caminho, "demo-outro", { item: "iof", done: true })).status, 404);

    console.log("prova-checklist: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-checklist failed: ${erro.message}`);
  process.exit(1);
});
