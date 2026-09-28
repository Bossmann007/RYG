/**
 * Proves audit persistence is fail-closed.
 *
 * GATEWAY_AUDIT_FILE points at a path that cannot be created (parent is a
 * file). A denied MCP tools/call must not return HTTP 200.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-audit-fail.js
 */
process.env.GATEWAY_AUDIT_FILE = "/dev/null/auditoria.jsonl";

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

  try {
    const resposta = await fetch(base + "/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "get_safe_update", arguments: {} },
      }),
    });
    const texto = await resposta.text();
    let corpo = null;
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = null;
    }
    const sucesso =
      resposta.status === 200 &&
      corpo &&
      (corpo.result || (corpo.error && corpo.error.code));
    console.log(
      `POST /api/mcp tools/call no-audit-file -> ${resposta.status} success_body=${Boolean(sucesso)}`
    );
    assert.notStrictEqual(resposta.status, 200, "audit failure must not return HTTP 200");
    assert.ok(resposta.status >= 500, "audit failure must be 5xx");
    assert.strictEqual(sucesso, false, "audit failure must not look like a completed JSON-RPC result");
    console.log("prova-audit-fail: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
