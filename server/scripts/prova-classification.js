/**
 * Proves case classification clearance over real HTTP (Phase 0.5.4).
 * Requires DB_* and applied case ACL + classification migrations.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-case-classification.js
 *   node server/scripts/prova-classification.js
 */
require("../dist/register-aliases");
const assert = require("assert");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv } = require("../dist/config/db.config");

async function boot() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

async function get(base, caminho, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(base + caminho, { headers });
  const texto = await resposta.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { bruto: texto.slice(0, 120) };
  }
  return { status: resposta.status, json };
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
  if (!lerDbEnv()) {
    console.log("prova-classification: SKIP (DB_* not configured)");
    return;
  }

  const ligado = await boot();
  try {
    const intake = await post(ligado.base, "/api/casos/intake", "demo-socio", {
      client: `Cliente Class ${Date.now()}`,
      adverse: `Adverso Class ${Date.now()}`,
      classification: "interno",
    });
    assert.strictEqual(intake.status, 201, "intake interno must create");
    const casoId = intake.json.casoId;
    assert.ok(casoId);

    const socio = await get(ligado.base, `/api/casos/${casoId}`, "demo-socio");
    console.log(`GET capa socio interno -> ${socio.status} class=${socio.json?.caso?.classification}`);
    assert.strictEqual(socio.status, 200);
    assert.strictEqual(socio.json.caso.classification, "interno");

    const ruim = await post(ligado.base, "/api/casos/intake", "demo-socio", {
      client: `Cliente Bad ${Date.now()}`,
      adverse: `Adverso Bad ${Date.now()}`,
      classification: "nao-existe",
    });
    assert.strictEqual(ruim.status, 400, "bad classification must 400");

    const sigiloso = await post(ligado.base, "/api/casos/intake", "demo-socio", {
      client: `Cliente Sig ${Date.now()}`,
      adverse: `Adverso Sig ${Date.now()}`,
    });
    assert.strictEqual(sigiloso.status, 201);
    const sigId = sigiloso.json.casoId;
    const socioSig = await get(ligado.base, `/api/casos/${sigId}`, "demo-socio");
    assert.strictEqual(socioSig.status, 200);
    assert.strictEqual(socioSig.json.caso.classification, "sigiloso");

    console.log("prova-classification: OK");
  } finally {
    await ligado.app.close();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
