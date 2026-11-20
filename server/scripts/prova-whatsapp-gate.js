/**
 * Proves the WhatsApp send checklist: revisao, PII block on texto, one fixed template.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-whatsapp-gate.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const auditoria = path.join(os.tmpdir(), `prova-wa-gate-${process.pid}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = auditoria;

require("../dist/register-aliases");
const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const PARA = "+5541999990000";
const EMAIL = "cliente.teste@example.com";
const CPF = "123.456.789-09";
const FONE_NO_TEXTO = "+55 41 98888-7777";
const TEMPLATE = "tpl-aviso-prazo";

async function post(base, corpo) {
  const resposta = await fetch(`${base}/api/whatsapp/enviar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer demo-socio" },
    body: JSON.stringify(corpo),
  });
  const bruto = await resposta.text();
  let json;
  try {
    json = JSON.parse(bruto);
  } catch {
    json = { bruto: bruto.slice(0, 120) };
  }
  return { status: resposta.status, json };
}

function auditoriaBruta() {
  return fs.existsSync(auditoria) ? fs.readFileSync(auditoria, "utf8") : "";
}

function linhas() {
  return auditoriaBruta()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((linha) => JSON.parse(linha));
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  try {
    const stub = await fetch(`${base}/api/whatsapp/conectar-stub`, { method: "POST" });
    assert.strictEqual(stub.status, 200, "stub connect stays public");

    const casos = [
      ["email", `fale com ${EMAIL} hoje`],
      ["cpf", `cpf ${CPF} do cliente`],
      ["cpf sem mascara", "cpf 12345678909 do cliente"],
      ["telefone", `ligue ${FONE_NO_TEXTO} agora`],
      ["telefone simples", "ligue 5541988887777 agora"],
    ];
    for (const [nome, texto] of casos) {
      const r = await post(base, { para: PARA, texto, revisao: true });
      console.log(`POST enviar PII ${nome} -> ${r.status} desafio=${Boolean(r.json.desafio)}`);
      assert.strictEqual(r.status, 400, `${nome} must be 400`);
      assert.ok(!r.json.desafio, `${nome} must not open a desafio`);
      assert.ok(!r.json.confirmacaoNecessaria);
    }
    const pii = linhas().filter((l) => l.motivo === "pii bloqueado");
    assert.strictEqual(pii.length, casos.length, "each PII block is audited");
    for (const l of pii) {
      assert.deepStrictEqual(Object.keys(l.argumentos).sort(), ["processoId", "textoChars"]);
    }

    const semRevisao = await post(base, { para: PARA, texto: "oi hitl" });
    console.log(`POST enviar sem revisao -> ${semRevisao.status}`);
    assert.strictEqual(semRevisao.status, 400);
    assert.ok(!semRevisao.json.desafio);
    const naoEstrito = await post(base, { para: PARA, texto: "oi hitl", revisao: "true" });
    assert.strictEqual(naoEstrito.status, 400, "revisao must be strictly true");
    assert.ok(linhas().some((l) => l.motivo === "revisao ausente"));

    const modelo = await post(base, { para: PARA, templateId: TEMPLATE, revisao: true, texto: EMAIL });
    console.log(`POST enviar template sem confirmacao -> ${modelo.status} desafio=${Boolean(modelo.json.desafio)}`);
    assert.strictEqual(modelo.status, 409);
    assert.strictEqual(modelo.json.confirmacaoNecessaria, true);
    assert.strictEqual(typeof modelo.json.desafio, "string");
    const modeloOk = await post(base, {
      para: PARA,
      templateId: TEMPLATE,
      revisao: true,
      texto: EMAIL,
      confirmacao: modelo.json.desafio,
    });
    assert.strictEqual(modeloOk.status, 200, "template send passes after the challenge");
    assert.strictEqual(modeloOk.json.ok, true);

    const desconhecido = await post(base, { para: PARA, templateId: "tpl-outro", revisao: true });
    console.log(`POST enviar template desconhecido -> ${desconhecido.status}`);
    assert.strictEqual(desconhecido.status, 400);
    assert.ok(!desconhecido.json.desafio);

    const sem = await post(base, { para: PARA, texto: "oi hitl", revisao: true });
    assert.strictEqual(sem.status, 409);
    const feliz = await post(base, {
      para: PARA,
      texto: "oi hitl",
      revisao: true,
      confirmacao: sem.json.desafio,
    });
    console.log(`POST enviar happy path -> ${feliz.status} ok=${feliz.json.ok}`);
    assert.strictEqual(feliz.status, 200);
    assert.strictEqual(feliz.json.ok, true);
    assert.strictEqual(feliz.json.modo, "stub_fila_local");

    const bruto = auditoriaBruta();
    for (const segredo of [EMAIL, CPF, "12345678909", FONE_NO_TEXTO, "5541988887777", PARA, "oi hitl"]) {
      assert.ok(!bruto.includes(segredo), "audit must not store phone, PII or message text");
    }
    for (const l of linhas()) {
      assert.ok(!("para" in l.argumentos), "no audit line carries para");
    }
    const transfer = linhas().filter((l) => l.motivo === "transfer");
    assert.strictEqual(transfer.length, 2);
    assert.ok(transfer.every((l) => l.argumentos.destination === "whatsapp"));
  } finally {
    await app.close();
    fs.rmSync(auditoria, { force: true });
  }
  console.log("prova-whatsapp-gate: OK");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
