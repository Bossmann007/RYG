/**
 * Proves Nest POST /api/mcp tools/call returns privacy-gateway SafeDTO bytes.
 *
 *   pnpm --dir server run build
 *   node server/scripts/prova-mcp-safedto.js
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

async function mcpCall(base, token, name, args = {}) {
  const resposta = await fetch(base + "/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = JSON.parse(texto);
  } catch {
    // SSE: take the first data: JSON line
    const linha = texto
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"));
    if (linha) {
      json = JSON.parse(linha.slice(5).trim());
    } else {
      json = { bruto: texto.slice(0, 400) };
    }
  }
  return { status: resposta.status, json };
}

function extrairDto(json) {
  // Streamable HTTP may wrap differently; accept structuredContent or text.
  if (json?.result?.structuredContent) {
    return json.result.structuredContent;
  }
  const texto = json?.result?.content?.find?.((c) => c.type === "text")?.text;
  if (texto) {
    return JSON.parse(texto);
  }
  if (json?.structuredContent) {
    return json.structuredContent;
  }
  throw new Error(`unexpected mcp shape: ${JSON.stringify(json).slice(0, 300)}`);
}

async function main() {
  const { validateSafeDto } = await import("@openlegalai/privacy-gateway");
  const ligado = await boot();
  try {
    const resposta = await mcpCall(ligado.base, "demo-socio", "enter_office");
    console.log(`tools/call enter_office -> ${resposta.status}`);
    assert.notStrictEqual(resposta.status, 401);
    assert.ok(!resposta.json.error, JSON.stringify(resposta.json.error || {}));

    const dto = extrairDto(resposta.json);
    const checked = validateSafeDto(dto);
    assert.strictEqual(checked.ok, true, checked.ok ? "" : checked.reason);
    assert.strictEqual(dto.schemaVersion, "1");
    assert.ok(String(dto.sessionId).startsWith("ofs_"));
    assert.ok(String(dto.releaseId).startsWith("rel_"));
    console.log(`SafeDTO ok session=${dto.sessionId} release=${dto.releaseId}`);
  } finally {
    await ligado.app.close();
  }
  console.log("prova-mcp-safedto: OK");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
