/**
 * Proves ADR 0002 Choice (A) over real HTTP: every allowed POST /api/mcp
 * tools/call returns privacy-gateway SafeDTO bytes, and a release that fails
 * the SafeDTO contract or the egress firewall is denied and audited with no
 * SafeDTO body. Needs no database (PROCESS_SOURCE=fixture).
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run prova:mcp-safedto
 */
require("../dist/register-aliases");
const assert = require("assert");
const os = require("os");
const path = require("path");

process.env.GATEWAY_AUDIT_FILE = path.join(os.tmpdir(), `prova-mcp-safedto-${process.pid}.jsonl`);

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { AuditService } = require("../dist/modules/gateway/audit.service");
const { ToolCatalogService } = require("../dist/modules/gateway/tool-catalog.service");
const { NUMERO_PROCESSO_DEMO } = require("../dist/fixtures/processos");

const CPF_INJETADO = "529.982.247-25";

const CHAMADAS = [
  ["enter_office", {}],
  ["get_safe_summary", { processNumber: NUMERO_PROCESSO_DEMO }],
  ["search_safe_knowledge", { assuntos: ["Tarifa de cadastro"] }],
  ["get_safe_update", { processNumber: NUMERO_PROCESSO_DEMO }],
];

function postMcp(base, token, corpo) {
  return fetch(`${base}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(corpo),
  });
}

function toolsCall(id, nome, argumentos) {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name: nome, arguments: argumentos } };
}

async function chamar(base, token, nome, argumentos) {
  const resposta = await postMcp(base, token, toolsCall(1, nome, argumentos));
  const corpo = await resposta.text();
  const dados = corpo.split("\n").find((linha) => linha.startsWith("data:"));
  const mensagem = JSON.parse(dados ? dados.slice(5) : corpo);
  assert.strictEqual(resposta.status, 200, `${nome}: HTTP ${resposta.status}`);
  assert.ok(mensagem.result, `${nome}: JSON-RPC error ${JSON.stringify(mensagem.error)}`);
  return mensagem.result;
}

function comEnvelopeAlterado(catalogo, nome, alterar) {
  const ferramenta = catalogo.buscar(nome);
  const original = ferramenta.executar;
  ferramenta.executar = async (...args) => alterar(await original(...args));
  return () => {
    ferramenta.executar = original;
  };
}

async function main() {
  const pg = await import("@openlegalai/privacy-gateway");
  const firewall = new pg.EgressFirewall();

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const auditoria = app.get(AuditService);
  const catalogo = app.get(ToolCatalogService);

  try {
    const sessoes = new Set();

    for (const [nome, argumentos] of CHAMADAS) {
      const resultado = await chamar(base, "demo-socio", nome, argumentos);
      assert.ok(!resultado.isError, `${nome}: denied ${JSON.stringify(resultado.content)}`);
      assert.strictEqual(resultado.content.length, 1, `${nome}: one text block`);
      const texto = resultado.content[0].text;
      const dto = JSON.parse(texto);

      const checado = pg.validateSafeDto(dto);
      assert.ok(checado.ok, `${nome}: validateSafeDto rejected (${checado.reason})`);
      assert.strictEqual(texto, pg.serializeSafeDtoForMcp(dto), `${nome}: text is the canonical wire bytes`);
      assert.deepStrictEqual(resultado.structuredContent, dto, `${nome}: structuredContent equals the wire DTO`);
      assert.deepStrictEqual(firewall.inspect(texto), { ok: true }, `${nome}: wire passes EgressFirewall`);
      assert.strictEqual(dto.schemaVersion, "1", `${nome}: schemaVersion`);
      assert.match(dto.sessionId, /^ofs_[0-9a-f]+$/, `${nome}: sessionId prefix`);
      assert.match(dto.releaseId, /^rel_[0-9a-f]+$/, `${nome}: releaseId prefix`);
      assert.ok(!texto.includes(NUMERO_PROCESSO_DEMO), `${nome}: CNJ number stays off the wire`);
      sessoes.add(dto.sessionId);

      console.log(`allow ${nome} session=${dto.sessionId} release=${dto.releaseId} bytes=${texto.length}`);
    }
    assert.strictEqual(sessoes.size, CHAMADAS.length, "each call gets an unlinkable sessionId");

    const negacoes = [
      [
        "FIREWALL_BR_PATTERN",
        (envelope) => ({
          ...envelope,
          conteudo: { ...envelope.conteudo, situacao: `${envelope.conteudo.situacao} CPF ${CPF_INJETADO} do cliente` },
        }),
      ],
      [
        "SAFE_DTO_INVALID:field_too_long",
        (envelope) => ({ ...envelope, conteudo: { ...envelope.conteudo, situacao: "x".repeat(700) } }),
      ],
    ];

    for (const [codigo, alterar] of negacoes) {
      const restaurar = comEnvelopeAlterado(catalogo, "get_safe_summary", alterar);
      try {
        const resultado = await chamar(base, "demo-socio", "get_safe_summary", {
          processNumber: NUMERO_PROCESSO_DEMO,
        });
        const texto = resultado.content.map((bloco) => bloco.text).join("\n");
        assert.strictEqual(resultado.isError, true, `${codigo}: release must be denied`);
        assert.strictEqual(resultado.structuredContent, undefined, `${codigo}: no structuredContent`);
        assert.ok(!texto.includes("schemaVersion"), `${codigo}: no SafeDTO body`);
        assert.ok(!texto.includes(CPF_INJETADO), `${codigo}: denial never echoes content`);

        const [registro] = auditoria.listar(1);
        assert.strictEqual(registro.ferramenta, "get_safe_summary", `${codigo}: audit row is this call`);
        assert.strictEqual(registro.decisao, "negado", `${codigo}: audit records deny`);
        assert.ok(registro.motivo.includes(codigo), `${codigo}: audit motivo carries the code`);

        console.log(`deny  get_safe_summary code=${codigo} audit=${registro.decisao}`);
      } finally {
        restaurar();
      }
    }

    const lote = await postMcp(base, "demo-off", [toolsCall(2, "enter_office", {})]);
    assert.strictEqual(lote.status, 401, "disabled user batch tools/call must be 401");
    console.log(`deny  batch tools/call demo-off -> ${lote.status}`);

    console.log("prova-mcp-safedto: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-mcp-safedto failed: ${erro.message}`);
  process.exit(1);
});
