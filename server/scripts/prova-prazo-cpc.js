/**
 * Proves the CPC business-day tool. No LLM. Weekends only.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-prazo-cpc.js
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

  const post = async (token, body) => {
    const resposta = await fetch(`${base}/api/tools/prazo-cpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const corpo = await resposta.json().catch(() => ({}));
    console.log(
      `POST /api/tools/prazo-cpc token=${token || "-"} -> ${resposta.status}${
        corpo.termo ? ` termo=${corpo.termo}` : ""
      }`
    );
    return { status: resposta.status, corpo };
  };

  try {
    assert.strictEqual((await post(undefined, { inicio: "2026-09-28", dias: 15 })).status, 401);

    const quinze = await post("demo-socio", { inicio: "2026-09-28", dias: 15 });
    assert.strictEqual(quinze.status, 200);
    assert.strictEqual(quinze.corpo.termo, "2026-10-19");
    assert.strictEqual(quinze.corpo.regra, "CPC art. 219");

    const sexta = await post("demo-socio", { inicio: "2026-10-02", dias: 1 });
    assert.strictEqual(sexta.status, 200);
    assert.strictEqual(sexta.corpo.termo, "2026-10-05");

    assert.strictEqual((await post("demo-socio", { inicio: "2026-09-28", dias: 0 })).status, 400);
    assert.strictEqual((await post("demo-socio", { inicio: "2026-02-31", dias: 1 })).status, 400);

    console.log("prova-prazo-cpc: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-prazo-cpc failed: ${erro.message}`);
  process.exit(1);
});
