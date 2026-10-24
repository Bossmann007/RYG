/**
 * Proves hub session disable, one-shot JML confirm, and idle timeout.
 *
 *   pnpm -C server exec nest build
 *   node server/scripts/prova-mfa-jml.js
 *
 * demo-off is disabled at boot, so GET /api/casos is 401.
 * POST /api/jml/disable without confirmacao is 409 and returns one desafio.
 * That desafio disables the target once. Replay is 409.
 * The target token is then 401 on the hub and on MCP tools/call.
 * HUB_IDLE_TIMEOUT_MS plus HUB_NOW_MS advances an active token to 401.
 * A broken GATEWAY_AUDIT_FILE on the disabled deny path is 503.
 */
require("../dist/register-aliases");
const assert = require("assert");
const os = require("os");
const path = require("path");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { USUARIOS_POR_TOKEN } = require("../dist/fixtures/usuarios");

const ALVO = USUARIOS_POR_TOKEN["demo-advogado"];
const AUDIT_OK = path.join(os.tmpdir(), "ryg-prova-mfa-jml.jsonl");

async function boot() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

async function chamar(base, metodo, caminho, token, corpo) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { bruto: texto.slice(0, 160) };
  }
  return { status: resposta.status, json };
}

function toolsCall() {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "get_safe_update", arguments: {} },
  };
}

async function main() {
  delete process.env.HUB_NOW_MS;
  process.env.NODE_ENV = "test";
  process.env.HUB_IDLE_TIMEOUT_MS = String(30 * 60 * 1000);
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;

  const ligado = await boot();
  try {
    const off = await chamar(ligado.base, "GET", "/api/casos", "demo-off");
    console.log(`GET /api/casos demo-off -> ${off.status}`);
    assert.strictEqual(off.status, 401, "demo-off must be 401 before any JML call");

    const sem = await chamar(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: ALVO.id,
    });
    console.log(
      `POST /api/jml/disable sem fator -> ${sem.status} desafio=${Boolean(sem.json && sem.json.desafio)}`
    );
    assert.strictEqual(sem.status, 409, "missing factor must be 409");
    assert.strictEqual(sem.json.confirmacaoNecessaria, true);
    assert.strictEqual(typeof sem.json.desafio, "string");

    const falso = await chamar(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: ALVO.id,
      confirmacao: "nao-e-o-desafio",
    });
    console.log(`POST /api/jml/disable fator falso -> ${falso.status}`);
    assert.strictEqual(falso.status, 409);

    const antes = await chamar(ligado.base, "GET", "/api/casos", "demo-advogado");
    console.log(`GET /api/casos demo-advogado antes do disable -> ${antes.status}`);
    assert.notStrictEqual(antes.status, 401, "target must still pass auth before disable");

    const com = await chamar(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: ALVO.id,
      confirmacao: sem.json.desafio,
    });
    console.log(`POST /api/jml/disable com fator -> ${com.status} ok=${com.json && com.json.ok}`);
    assert.strictEqual(com.status, 200);
    assert.strictEqual(com.json.ok, true);
    assert.strictEqual(com.json.userId, ALVO.id);

    const replay = await chamar(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: ALVO.id,
      confirmacao: sem.json.desafio,
    });
    console.log(`POST /api/jml/disable replay -> ${replay.status}`);
    assert.strictEqual(replay.status, 409, "one-shot desafio must not disable twice");

    const hub = await chamar(ligado.base, "GET", "/api/casos", "demo-advogado");
    console.log(`GET /api/casos demo-advogado depois -> ${hub.status}`);
    assert.strictEqual(hub.status, 401, "disabled token must be 401 on the hub");

    const mcp = await chamar(ligado.base, "POST", "/api/mcp", "demo-advogado", toolsCall());
    console.log(`POST /api/mcp tools/call demo-advogado depois -> ${mcp.status}`);
    assert.strictEqual(mcp.status, 401, "disabled token must be 401 on MCP tools/call");

    const offMcp = await chamar(ligado.base, "POST", "/api/mcp", "demo-off", toolsCall());
    console.log(`POST /api/mcp tools/call demo-off -> ${offMcp.status}`);
    assert.strictEqual(offMcp.status, 401, "seeded disabled token must be 401 on MCP tools/call");

    const offBatch = await chamar(ligado.base, "POST", "/api/mcp", "demo-off", [
      toolsCall(),
    ]);
    console.log(`POST /api/mcp batch tools/call demo-off -> ${offBatch.status}`);
    assert.strictEqual(
      offBatch.status,
      401,
      "JSON-RPC batch must not bypass the MCP session gate",
    );

    const cruzado = await chamar(ligado.base, "POST", "/api/jml/disable", "demo-outro", {
      userId: ALVO.id,
    });
    console.log(`POST /api/jml/disable cross-office -> ${cruzado.status}`);
    assert.strictEqual(
      cruzado.status,
      404,
      "socio of another office must not open a disable challenge",
    );
  } finally {
    await ligado.app.close();
  }

  process.env.HUB_IDLE_TIMEOUT_MS = "1000";
  process.env.HUB_NOW_MS = "5000";
  const ocioso = await boot();
  try {
    const vivo = await chamar(ocioso.base, "GET", "/api/casos", "demo-advogado");
    console.log(`GET /api/casos idle touch HUB_NOW_MS=5000 -> ${vivo.status}`);
    assert.notStrictEqual(vivo.status, 401, "fresh activity inside the idle window must pass auth");

    process.env.HUB_NOW_MS = "6001";
    const parado = await chamar(ocioso.base, "GET", "/api/casos", "demo-advogado");
    console.log(`GET /api/casos idle HUB_NOW_MS=6001 -> ${parado.status}`);
    assert.strictEqual(parado.status, 401, "clock advance past HUB_IDLE_TIMEOUT_MS must be 401");
  } finally {
    await ocioso.app.close();
  }

  delete process.env.HUB_NOW_MS;
  process.env.HUB_IDLE_TIMEOUT_MS = String(30 * 60 * 1000);
  process.env.GATEWAY_AUDIT_FILE = "/dev/null/auditoria.jsonl";
  const quebrado = await boot();
  try {
    const negado = await chamar(quebrado.base, "GET", "/api/casos", "demo-off");
    console.log(`GET /api/casos demo-off auditoria indisponivel -> ${negado.status}`);
    assert.strictEqual(negado.status, 503, "audit failure on the deny path must be 503");
  } finally {
    await quebrado.app.close();
  }

  console.log("prova-mfa-jml: OK");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
