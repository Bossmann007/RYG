/**
 * Proves POST /api/mcp returns privacy-gateway SafeDTO bytes.
 *
 *   pnpm --dir privacy-gateway run build
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-mcp-safedto.js
 *
 * Stdio evidence stays a separate harness. This proof does not merge catalogs.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const auditoria = path.join(os.tmpdir(), `prova-mcp-safedto-${process.pid}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = auditoria;

require("../dist/register-aliases");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const CNJ = "1002345-12.2023.8.26.0100";
const VENENOS = ["password=hunter2", "/tmp/secret/file", "stack at app.ts:12"];

async function boot() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { app, base };
}

async function pedir(base, token, corpo) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(base + "/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = {};
  }
  console.log(`POST /api/mcp ${corpo.params?.name || corpo.method} token=${token || "-"} -> ${resposta.status}`);
  return { status: resposta.status, json, texto };
}

function chamada(nome, argumentos, id) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: nome, arguments: argumentos },
  };
}

async function main() {
  const egresso = await import("@openlegalai/privacy-gateway/egress");
  const { app, base } = await boot();
  try {
    const ferramentas = [
      ["enter_office", {}],
      ["get_safe_summary", { processNumber: CNJ }],
      ["search_safe_knowledge", { assuntos: ["Tarifa de cadastro"] }],
      ["get_safe_update", { processNumber: CNJ }],
    ];

    for (const [nome, argumentos] of ferramentas) {
      const resposta = await pedir(base, "demo-socio", chamada(nome, argumentos, nome));
      assert.strictEqual(resposta.status, 200, `${nome} must answer`);
      const wire = resposta.json.result?.content?.[0]?.text;
      assert.strictEqual(typeof wire, "string", `${nome} must return serializer bytes`);
      const dto = JSON.parse(wire);
      const veredito = egresso.validateSafeDto(dto);
      assert.strictEqual(veredito.ok, true, `${nome} validateSafeDto ${veredito.reason || ""}`);
      assert.ok(dto.sessionId.startsWith("ofs_"), `${nome} session`);
      assert.ok(dto.releaseId.startsWith("rel_"), `${nome} release`);
      const solto = egresso.releaseSafeDto(dto);
      assert.strictEqual(solto.ok, true, `${nome} firewall`);
      assert.strictEqual(solto.wire, wire, `${nome} bytes come from the package serializer`);
      assert.ok(!("faixaDeRisco" in dto), `${nome} has no risk band`);
    }

    const conhecimento = await pedir(
      base,
      "demo-socio",
      chamada("search_safe_knowledge", { assuntos: ["Tarifa de cadastro"] }, "refs")
    );
    const refs = JSON.parse(conhecimento.json.result.content[0].text).safeReferences;
    assert.ok(refs.length > 0, "search maps into safeReferences");
    assert.ok(refs.every((item) => item.kind === "public_jurisprudence"), "public_jurisprudence only");

    for (const veneno of VENENOS) {
      const recusa = await pedir(
        base,
        "demo-socio",
        chamada("get_safe_summary", { processNumber: veneno }, veneno)
      );
      assert.ok(!recusa.texto.includes("ofs_"), `poison must not release ${veneno}`);
      assert.ok(!recusa.texto.includes("schemaVersion"), `poison must not carry SafeDTO ${veneno}`);
      assert.ok(recusa.texto.includes("safedto_recusado"), `poison must be denied ${veneno}`);
    }

    const lote = await pedir(base, "demo-socio", [
      chamada("get_safe_summary", { processNumber: CNJ }, "batch"),
    ]);
    assert.strictEqual(lote.status, 400, "JSON-RPC batch must be HTTP 400");
    assert.ok(!lote.texto.includes("ofs_"), "batch must not release SafeDTO");
    assert.ok(!lote.texto.includes("schemaVersion"), "batch must not carry SafeDTO");

    const longo = "x".repeat(600) + "password=x";
    const recusaLonga = await pedir(
      base,
      "demo-socio",
      chamada("get_safe_summary", { processNumber: longo }, "long-poison")
    );
    assert.ok(!recusaLonga.texto.includes("ofs_"), "long poison must not release");
    assert.ok(!recusaLonga.texto.includes("schemaVersion"), "long poison must not carry SafeDTO");
    assert.ok(recusaLonga.texto.includes("safedto_recusado"), "long poison must be denied");

    const semToken = await pedir(base, "", chamada("enter_office", {}, "anon"));
    assert.ok(!semToken.texto.includes("ofs_"), "anonymous call must not reach the serializer");
    assert.ok(!semToken.texto.includes("schemaVersion"), "anonymous call must not carry SafeDTO");

    const desligado = await pedir(base, "demo-off", chamada("enter_office", {}, "off"));
    assert.strictEqual(desligado.status, 401, "disabled user stays in front of egress");
    assert.ok(!desligado.texto.includes("ofs_"), "disabled user must not reach the serializer");

    const descricao = await fetch(base + "/api/mcp", {
      headers: { Authorization: "Bearer demo-socio" },
    });
    const catalogo = await descricao.json();
    const nomes = catalogo.ferramentas.join(",");
    assert.ok(nomes.includes("search_safe_knowledge"), "Nest catalog keeps search");
    assert.ok(nomes.includes("get_safe_update"), "Nest catalog keeps update");
    assert.ok(!nomes.includes("leave_office"), "Nest catalog does not absorb stdio tools");
    assert.ok(!nomes.includes("ask_office"), "Nest catalog does not absorb stdio tools");

    const contrato = fs.readFileSync(
      path.join(__dirname, "../../privacy-gateway/src/domain/types.ts"),
      "utf8"
    );
    assert.ok(contrato.includes("leave_office"), "stdio allowlist stays");
    assert.ok(contrato.includes("ask_office"), "stdio allowlist stays");
    assert.ok(!contrato.includes("search_safe_knowledge"), "stdio allowlist does not absorb Nest tools");

    const trilha = fs.readFileSync(auditoria, "utf8");
    assert.ok(trilha.includes("safedto_recusado"), "firewall denial is audited");
    assert.ok(!trilha.includes("hunter2"), "audit must not store the credential");
    assert.ok(!trilha.includes("/tmp/secret/file"), "audit must not store the path");
  } finally {
    await app.close();
    fs.rmSync(auditoria, { force: true });
  }

  console.log("prova-mcp-safedto: OK");
}

main().catch((erro) => {
  console.error(`prova-mcp-safedto failed: ${erro.message}`);
  process.exit(1);
});
