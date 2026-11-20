/**
 * Proves the MFA stub, idle timeout, and JML leaver over real HTTP.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-mfa-jml.js
 *
 * demo-off is disabled in the fixture. Disabling demo-advogado is immediate
 * on hub HTTP and on MCP tools/call. Socio disable needs a one-shot factor.
 * Replay of that factor fails. A jumped HUB_NOW_MS expires the bearer.
 * A broken audit file turns the disabled deny into 503.
 */
require("../dist/register-aliases");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const AUDIT_OK = path.join(os.tmpdir(), `ryg-mfa-jml-${process.pid}.jsonl`);
const AUDIT_QUEBRADO = "/dev/null/auditoria.jsonl";
const MCP = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: "get_safe_update", arguments: {} },
};

async function boot() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
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
  console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
  return { status: resposta.status, json };
}

function linhasAuditoria() {
  if (!fs.existsSync(AUDIT_OK)) return [];
  return fs
    .readFileSync(AUDIT_OK, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linha) => JSON.parse(linha));
}

async function main() {
  delete process.env.HUB_NOW_MS;
  delete process.env.HUB_IDLE_TIMEOUT_MS;
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
  fs.writeFileSync(AUDIT_OK, "");

  const ligado = await boot();
  try {
    const off = await pedir(ligado.base, "GET", "/api/casos", "demo-off");
    assert.strictEqual(off.status, 401, "fixture disabled user must be 401");
    assert.strictEqual(off.json.erro, "Utilizador desabilitado.");

    const antes = await pedir(ligado.base, "GET", "/api/casos", "demo-advogado");
    assert.notStrictEqual(antes.status, 401, "enabled user must pass auth");

    const semFator = await pedir(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: "u-002",
    });
    assert.strictEqual(semFator.status, 409, "missing MFA must be 409");
    assert.strictEqual(semFator.json.confirmacaoNecessaria, true);
    assert.equal(typeof semFator.json.desafio, "string");
    assert.ok(semFator.json.desafio.length > 10);

    const comFator = await pedir(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: "u-002",
      confirmacao: semFator.json.desafio,
    });
    assert.strictEqual(comFator.status, 200, "valid MFA must disable");
    assert.strictEqual(comFator.json.ok, true);
    assert.strictEqual(comFator.json.userId, "u-002");

    const replay = await pedir(ligado.base, "POST", "/api/jml/disable", "demo-socio", {
      userId: "u-002",
      confirmacao: semFator.json.desafio,
    });
    assert.strictEqual(replay.status, 409, "replayed factor must fail");

    const depois = await pedir(ligado.base, "GET", "/api/casos", "demo-advogado");
    assert.strictEqual(depois.status, 401, "disabled user must be 401 on the hub");

    const mcp = await pedir(ligado.base, "POST", "/api/mcp", "demo-advogado", MCP);
    assert.strictEqual(mcp.status, 401, "disabled user must be 401 on MCP tools/call");
    assert.strictEqual(mcp.json.erro, "utilizador desabilitado");

    process.env.HUB_IDLE_TIMEOUT_MS = "1000";
    process.env.HUB_NOW_MS = "5000000";
    const vivo = await pedir(ligado.base, "GET", "/api/casos", "demo-gestor");
    assert.notStrictEqual(vivo.status, 401, "fresh clock must pass auth");
    process.env.HUB_NOW_MS = "5001001";
    const idle = await pedir(ligado.base, "GET", "/api/casos", "demo-gestor");
    assert.strictEqual(idle.status, 401, "idle bearer must be 401");
    assert.strictEqual(idle.json.erro, "Sessão expirada por inatividade.");

    const auditoria = linhasAuditoria();
    assert.ok(
      auditoria.some((linha) => linha.motivo === "utilizador desabilitado" && linha.decisao === "negado"),
      "disabled deny must be audited",
    );
    assert.ok(
      auditoria.some((linha) => linha.motivo === "mfa ausente" && linha.decisao === "negado"),
      "missing MFA must be audited",
    );
    assert.ok(
      auditoria.some((linha) => linha.motivo === "mfa replay" && linha.decisao === "negado"),
      "replay must be audited",
    );
    assert.ok(
      auditoria.some((linha) => linha.motivo === "sessao idle" && linha.decisao === "negado"),
      "idle deny must be audited",
    );
  } finally {
    await ligado.app.close();
  }

  delete process.env.HUB_NOW_MS;
  delete process.env.HUB_IDLE_TIMEOUT_MS;
  process.env.GATEWAY_AUDIT_FILE = AUDIT_QUEBRADO;
  const quebrado = await boot();
  try {
    const semAudit = await pedir(quebrado.base, "GET", "/api/casos", "demo-off");
    assert.strictEqual(semAudit.status, 503, "disabled deny must fail closed when audit cannot write");
    assert.notStrictEqual(semAudit.json.erro, "Utilizador desabilitado.");
  } finally {
    await quebrado.app.close();
  }

  console.log("prova-mfa-jml: OK");
}

main().catch((erro) => {
  console.error(`prova-mfa-jml failed: ${erro.message}`);
  process.exit(1);
});
