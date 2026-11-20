/**
 * Proves acervo list routes require Bearer and stay office-scoped.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-acervo-auth.js
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

const CAMINHOS = [
  "/api/clientes",
  "/api/peticoes",
  "/api/contratos",
  "/api/decisoes",
  "/api/modelos",
];

const CHAVES = {
  "/api/clientes": "clientes",
  "/api/peticoes": "peticoes",
  "/api/contratos": "contratos",
  "/api/decisoes": "decisoes",
  "/api/modelos": "modelos",
};

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const get = async (caminho, token) => {
    const resposta = await fetch(base + caminho, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const corpo = await resposta.json().catch(() => ({}));
    const chave = CHAVES[caminho];
    const n = Array.isArray(corpo[chave]) ? ` n=${corpo[chave].length}` : "";
    console.log(
      `GET ${caminho} token=${token || "-"} -> ${resposta.status}${
        corpo.zone ? ` zone=${corpo.zone}` : ""
      }${n}`
    );
    return { status: resposta.status, corpo };
  };

  try {
    for (const caminho of CAMINHOS) {
      assert.strictEqual(
        (await get(caminho)).status,
        401,
        `${caminho} without token must be 401`
      );
    }

    const research = await fetch(base + "/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    console.log(`POST /api/research token=- -> ${research.status}`);
    assert.strictEqual(research.status, 401, "research without token must be 401");

    for (const caminho of CAMINHOS) {
      const socio = await get(caminho, "demo-socio");
      assert.notStrictEqual(socio.status, 401, `${caminho} demo-socio must not be 401`);
      assert.strictEqual(socio.status, 200, `${caminho} demo-socio must be 200`);
      assert.strictEqual(socio.corpo.zone, "internal", `${caminho} demo-socio zone`);
      assert.ok(
        Array.isArray(socio.corpo[CHAVES[caminho]]),
        `${caminho} demo-socio must return list array`
      );
    }

    for (const caminho of CAMINHOS) {
      const outro = await get(caminho, "demo-outro");
      assert.strictEqual(outro.status, 200, `${caminho} demo-outro must be 200`);
      assert.strictEqual(outro.corpo.zone, "internal", `${caminho} demo-outro zone`);
      const itens = outro.corpo[CHAVES[caminho]];
      assert.ok(Array.isArray(itens), `${caminho} demo-outro must return list array`);
      assert.strictEqual(
        itens.length,
        0,
        `${caminho} other office must see empty list, not another office's rows`
      );
    }

    console.log("prova-acervo-auth: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-acervo-auth failed: ${erro.message}`);
  process.exit(1);
});
