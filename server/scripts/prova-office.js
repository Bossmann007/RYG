/**
 * Proves the office_id row filter on /api/casos over real HTTP against the
 * database in server/.env. Requires `npm run office-id:apply` first.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-office.js
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

const ESPERADOS_PRADO = 26;

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
    const n = Array.isArray(corpo.casos) ? ` n=${corpo.casos.length}` : "";
    console.log(`GET ${caminho} token=${token || "-"} -> ${resposta.status}${corpo.zone ? ` zone=${corpo.zone}` : ""}${n}`);
    return { status: resposta.status, corpo };
  };

  try {
    assert.strictEqual((await get("/api/casos")).status, 401, "no token must be 401");

    const prado = await get("/api/casos", "demo-socio");
    assert.strictEqual(prado.status, 200, "demo-socio list must be 200");
    assert.strictEqual(prado.corpo.zone, "internal");
    assert.strictEqual(prado.corpo.casos.length, ESPERADOS_PRADO, "demo-socio must see 26 casos");

    const outro = await get("/api/casos", "demo-outro");
    assert.strictEqual(outro.status, 200, "empty office must be 200, not 503");
    assert.strictEqual(outro.corpo.zone, "internal");
    assert.strictEqual(outro.corpo.casos.length, 0, "other office must see 0 casos");

    const id = String(prado.corpo.casos[0].id);
    const caminho = `/api/casos/${encodeURIComponent(id)}`;
    assert.strictEqual((await get(caminho, "demo-outro")).status, 404, "other office detail must be 404");

    const proprio = await get(caminho, "demo-socio");
    assert.strictEqual(proprio.status, 200, "own office detail must be 200");
    assert.strictEqual(String(proprio.corpo.caso.id), id, "detail must return the requested caso");

    const cnj = String(prado.corpo.casos[0].processNumber || "").replace(/\D/g, "");
    if (cnj.length === 20) {
      assert.strictEqual((await get(`/api/casos/${cnj}`, "demo-outro")).status, 404, "other office CNJ lookup must be 404");
      assert.strictEqual((await get(`/api/casos/${cnj}`, "demo-socio")).status, 200, "own office CNJ lookup must be 200");
    }

    console.log("prova-office: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-office failed: ${erro.message}`);
  process.exit(1);
});
