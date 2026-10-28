require("../dist/register-aliases");
const assert = require("assert");
const os = require("os");
const path = require("path");

process.env.GATEWAY_AUDIT_FILE = path.join(os.tmpdir(), `prova-xirp-${process.pid}.jsonl`);

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { NUMERO_PROCESSO_DEMO } = require("../dist/fixtures/processos");
const { XIRP_CASO_DEMO_BANCARIO } = require("../dist/modules/xirp/xirp-runs.service");

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

async function getRuns(base, token, casoId) {
  const resposta = await fetch(`${base}/api/xirp/casos/${encodeURIComponent(casoId)}/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { bruto: texto };
  }
  return { status: resposta.status, json };
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  try {
    const enter = await chamar(base, "demo-socio", "enter_office", {});
    assert.ok(!enter.isError, "enter_office must allow");
    const enterDto = enter.structuredContent;
    assert.match(enterDto.releaseId, /^rel_/, "enter releaseId");

    const beforeCase = await getRuns(base, "demo-socio", XIRP_CASO_DEMO_BANCARIO);
    assert.strictEqual(beforeCase.status, 200, "demo caso listable for socio");
    assert.strictEqual(beforeCase.json.zone, "internal");
    const beforeIds = new Set((beforeCase.json.runs || []).map((r) => r.releaseId));
    assert.ok(!beforeIds.has(enterDto.releaseId), "enter_office has no casoId; absent from case panel");

    const summary = await chamar(base, "demo-socio", "get_safe_summary", {
      processNumber: NUMERO_PROCESSO_DEMO,
    });
    assert.ok(!summary.isError, "get_safe_summary must allow");
    const dto = summary.structuredContent;
    assert.match(dto.releaseId, /^rel_/);
    assert.ok(typeof dto.summary === "string" && dto.summary.length > 0);

    const after = await getRuns(base, "demo-socio", XIRP_CASO_DEMO_BANCARIO);
    assert.strictEqual(after.status, 200);
    const hit = (after.json.runs || []).find((r) => r.releaseId === dto.releaseId);
    assert.ok(hit, "case panel lists the SafeDTO release");
    assert.strictEqual(hit.toolName, "get_safe_summary");
    assert.strictEqual(hit.summary, dto.summary);
    assert.ok(["cited", "silent", "mixed"].includes(hit.citeStatus), "citeStatus closed enum");
    assert.ok(!JSON.stringify(hit).includes(NUMERO_PROCESSO_DEMO), "CNJ stays out of Xirp payload");

    const advogado = await getRuns(base, "demo-advogado", XIRP_CASO_DEMO_BANCARIO);
    assert.strictEqual(advogado.status, 403, "non-member cannot read Xirp runs");

    const outro = await getRuns(base, "demo-outro", XIRP_CASO_DEMO_BANCARIO);
    assert.strictEqual(outro.status, 403, "other office cannot read Xirp runs");

    const knowledge = await chamar(base, "demo-socio", "search_safe_knowledge", {
      assuntos: ["Tarifa de cadastro"],
    });
    assert.ok(!knowledge.isError, "search_safe_knowledge must allow");
    const kDto = knowledge.structuredContent;
    const afterKnowledge = await getRuns(base, "demo-socio", XIRP_CASO_DEMO_BANCARIO);
    const kHit = (afterKnowledge.json.runs || []).find((r) => r.releaseId === kDto.releaseId);
    assert.ok(!kHit, "knowledge search without processNumber stays off the case panel");

    console.log(
      `prova-xirp: OK caseRuns=${after.json.runs.length} release=${dto.releaseId} cite=${hit.citeStatus}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-xirp failed: ${erro.message}`);
  process.exit(1);
});
