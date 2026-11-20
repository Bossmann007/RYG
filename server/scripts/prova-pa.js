/**
 * Proves ADR 0005 PA mode: socio opt-in on both lists, allowlist of four tools,
 * human confirm before irreversible tools, and fail-closed audit.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-pa.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const auditoria = path.join(os.tmpdir(), `prova-pa-${process.pid}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = auditoria;
process.env.OFFICE_PA = "prado-advogados,outro-escritorio-nao";
process.env.PA_USERS = "u-001,u-002,u-003,u-099";
delete process.env.OFFICE_HOSTED_AI;

require("../dist/register-aliases");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { WhatsappService } = require("../dist/modules/whatsapp/whatsapp.service");

const PARA = "+5541999990000";
const TEXTO = "oi pa prova";
const ZAP = { tool: "enviar_whatsapp", args: { para: PARA, texto: TEXTO, revisao: true } };

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const whatsapp = app.get(WhatsappService);
  const enviados = () => whatsapp.historicoLocal().length;
  let paToken = "";
  const relogioOriginal = process.env.HUB_NOW_MS;

  const post = async (caminho, token, corpo) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const resposta = await fetch(base + caminho, { method: "POST", headers, body: JSON.stringify(corpo) });
    const json = await resposta.json().catch(() => ({}));
    return { status: resposta.status, json };
  };
  const get = async (caminho, token) => {
    const resposta = await fetch(base + caminho, { headers: { Authorization: `Bearer ${token}` } });
    return { status: resposta.status, json: await resposta.json().catch(() => ({})) };
  };
  const semSegredo = (json) => {
    const texto = JSON.stringify(json);
    assert.ok(!("desafio" in json) && !("expiraEm" in json) && !("token" in json), "409 has no challenge fields");
    assert.ok(!/[0-9a-f]{32}/i.test(texto), "409 body has no 32-hex token");
  };
  const pa = async (rotulo, token, corpo) => {
    const r = await post("/api/pa/call", token, corpo);
    console.log(`${rotulo} -> ${r.status} desafio=${Boolean(r.json.desafio)} enviados=${enviados()}`);
    return r;
  };

  try {
    assert.strictEqual((await post("/api/whatsapp/conectar-stub", null, {})).status, 200);

    const tentativa = { ...ZAP, confirm: true, confirmacao: "qualquer", args: { ...ZAP.args, confirm: true } };
    const estagiario = await pa("estagiario listado em PA_USERS", "demo-estagiario", tentativa);
    assert.strictEqual(estagiario.status, 403, "estagiario stays on consult");
    assert.ok(!estagiario.json.desafio, "consult gets no challenge");
    assert.strictEqual(enviados(), 0, "estagiario must not reach the WhatsApp stub");

    const advogado = await pa("advogado listado em PA_USERS", "demo-advogado", tentativa);
    assert.strictEqual(advogado.status, 403, "advogado stays on consult");

    const outro = await pa("socio de outro escritorio", "demo-outro", ZAP);
    assert.strictEqual(outro.status, 403, "another office's socio is not enrolled");
    assert.strictEqual(enviados(), 0);

    process.env.OFFICE_PA = "";
    process.env.PA_USERS = "";
    process.env.OFFICE_HOSTED_AI = "prado-advogados";
    const soConsult = await pa("socio so com OFFICE_HOSTED_AI", "demo-socio", ZAP);
    assert.strictEqual(soConsult.status, 403, "OFFICE_HOSTED_AI does not grant PA");
    process.env.OFFICE_PA = "prado-advogados";
    process.env.PA_USERS = "u-003";
    const soOffice = await pa("socio com OFFICE_PA sem PA_USERS", "demo-socio", ZAP);
    assert.strictEqual(soOffice.status, 403, "office flag alone does not enroll a person");
    process.env.PA_USERS = "u-001";
    delete process.env.OFFICE_HOSTED_AI;
    assert.strictEqual(enviados(), 0);

    for (const tool of ["executar_sql", "shell", "ler_arquivo", "consultar_jurisprudencia"]) {
      const fora = await pa(`ferramenta fora da allowlist ${tool}`, "demo-socio", { tool, args: {} });
      assert.strictEqual(fora.status, 403, `${tool} is outside the allowlist`);
    }

    const semRevisao = await pa("socio sem revisao", "demo-socio", {
      ...ZAP,
      args: { para: PARA, texto: TEXTO },
    });
    assert.strictEqual(semRevisao.status, 400, "revisao must be true");

    const proposta = await pa("socio propoe enviar_whatsapp com confirm=true", "demo-socio", {
      ...ZAP,
      confirm: true,
      confirmacao: true,
      args: { ...ZAP.args, confirm: true },
    });
    assert.strictEqual(proposta.status, 409, "bare confirm flag must not send");
    assert.strictEqual(proposta.json.confirmacaoNecessaria, true);
    semSegredo(proposta.json);
    assert.strictEqual(enviados(), 0, "409 must not reach the stub");

    const comString = await pa("mesma chamada com confirmacao qualquer", "demo-socio", { ...ZAP, confirmacao: "qualquer" });
    assert.strictEqual(comString.status, 409);
    semSegredo(comString.json);
    assert.strictEqual(enviados(), 0, "confirmacao in the call body is ignored");

    const negada = await get("/api/pa/pendencias", "demo-estagiario");
    assert.strictEqual(negada.status, 403, "consult user cannot read pendencias");
    const negadaConfirm = await post("/api/pa/confirm", "demo-estagiario", { desafio: "0".repeat(32) });
    assert.strictEqual(negadaConfirm.status, 403, "consult user cannot confirm");

    const abertas = await get("/api/pa/pendencias", "demo-socio");
    assert.strictEqual(abertas.status, 200);
    const zap = abertas.json.pendencias.filter((p) => p.tool === "enviar_whatsapp");
    assert.ok(zap.length >= 1 && /^[0-9a-f]{32}$/.test(zap[0].desafio), "socio reads the desafio");
    assert.ok(!JSON.stringify(abertas.json).includes(TEXTO), "pendencias carry no message text");
    assert.ok(!JSON.stringify(abertas.json).includes("41999990000"), "pendencias carry no phone");
    assert.ok(abertas.json.pendencias.every((p) => !("para" in p) && !("texto" in p)));
    const desafio = zap[0].desafio;

    const sessaoEstagiario = await post("/api/pa/sessao", "demo-estagiario", {});
    assert.strictEqual(sessaoEstagiario.status, 403, "consult user gets no model credential");
    assert.ok(!("token" in sessaoEstagiario.json));

    const T = Date.now();
    process.env.HUB_NOW_MS = String(T);
    const sessaoPa = await post("/api/pa/sessao", "demo-socio", {});
    assert.strictEqual(sessaoPa.status, 200, "enrolled socio issues a model credential");
    assert.strictEqual(sessaoPa.json.zone, "internal");
    paToken = sessaoPa.json.token;
    assert.match(paToken, /^pas_[0-9a-f]{32}$/);
    assert.notStrictEqual(paToken, "demo-socio");
    assert.ok(Date.parse(sessaoPa.json.expiraEm) > Date.now(), "credential has a future expiry");
    assert.strictEqual(Date.parse(sessaoPa.json.expiraEm), T + 10 * 60 * 1000, "credential TTL is 10 minutes on the hub clock");

    const paProposta = await pa("credencial PA propoe enviar_whatsapp", paToken, ZAP);
    assert.strictEqual(paProposta.status, 409, "model credential only proposes an irreversible tool");
    assert.ok(!("desafio" in paProposta.json));
    semSegredo(paProposta.json);
    assert.strictEqual(enviados(), 0, "model proposal must not reach the stub");

    const paPendencias = await get("/api/pa/pendencias", paToken);
    assert.strictEqual(paPendencias.status, 403, "model credential cannot read pendencias");
    assert.ok(!("desafio" in paPendencias.json) && !/[0-9a-f]{32}/i.test(JSON.stringify(paPendencias.json)));
    const paConfirm = await post("/api/pa/confirm", paToken, { desafio });
    assert.strictEqual(paConfirm.status, 403, "model credential cannot confirm");
    assert.strictEqual(enviados(), 0, "model confirm must not send");
    const paSessao = await post("/api/pa/sessao", paToken, {});
    assert.strictEqual(paSessao.status, 403, "model credential cannot mint another credential");
    assert.ok(!("token" in paSessao.json));
    const paCasos = await get("/api/casos", paToken);
    assert.strictEqual(paCasos.status, 403, "model credential is refused outside POST /api/pa/call");
    assert.strictEqual(paCasos.json.erro, "Credencial PA só chama ferramentas.");
    console.log(`credencial PA -> proposta 409, pendencias/confirm/sessao/casos 403, enviados=${enviados()}`);

    const aindaAberta = await get("/api/pa/pendencias", "demo-socio");
    assert.ok(
      aindaAberta.json.pendencias.some((p) => p.desafio === desafio),
      "refused model confirm leaves the desafio unconsumed",
    );

    process.env.OFFICE_PA = "prado-advogados,outro-escritorio";
    process.env.PA_USERS = "u-001,u-099";
    const outroSocio = await post("/api/pa/confirm", "demo-outro", { desafio });
    assert.strictEqual(outroSocio.status, 409, "enrolled socio of another office cannot run this desafio");
    const listaOutro = await get("/api/pa/pendencias", "demo-outro");
    assert.strictEqual(listaOutro.status, 200);
    assert.deepStrictEqual(listaOutro.json.pendencias, [], "pendencias are scoped to office and user");
    process.env.OFFICE_PA = "prado-advogados";
    process.env.PA_USERS = "u-001";
    assert.strictEqual(enviados(), 0);

    const confirmado = await post("/api/pa/confirm", "demo-socio", { desafio });
    console.log(`confirm -> ${confirmado.status} enviados=${enviados()}`);
    assert.strictEqual(confirmado.status, 200);
    assert.strictEqual(confirmado.json.modo, "pa");
    assert.strictEqual(confirmado.json.resultado.ok, true);
    assert.strictEqual(enviados(), 1, "only confirm reaches the stub");

    const replay = await post("/api/pa/confirm", "demo-socio", { desafio });
    assert.strictEqual(replay.status, 409, "challenge is single use");
    assert.strictEqual(enviados(), 1);

    const linhas = lerLinhas();
    const permitido = linhas.filter(
      (l) => l.origem === "pa" && l.ferramenta === "enviar_whatsapp" && l.decisao === "permitido",
    );
    assert.strictEqual(permitido.length, 1, "one permitted PA audit line for the send");
    assert.strictEqual(permitido[0].actor, "pa_session");
    assert.strictEqual(permitido[0].delegated_by, "u-001");
    assert.strictEqual(permitido[0].papel, "socio");
    assert.strictEqual(permitido[0].caseId, "");
    assert.deepStrictEqual(permitido[0].argumentos, {});
    const bruto = fs.readFileSync(auditoria, "utf8");
    assert.ok(!bruto.includes(TEXTO), "audit must not store the message");
    assert.ok(!bruto.includes("41999990000"), "audit must not store the phone");
    assert.ok(
      linhas.filter((l) => l.origem === "pa").every((l) => Object.keys(l.argumentos).length === 0),
      "every PA line has empty argumentos",
    );
    console.log(`audit PA lines=${linhas.filter((l) => l.origem === "pa").length} sem telefone e sem texto`);

    const lista = await fetch(`${base}/api/casos`, { headers: { Authorization: "Bearer demo-socio" } });
    assert.strictEqual(lista.status, 200, "TiDB casos list must answer for the case tools");
    const casoId = (await lista.json()).casos?.[0]?.id;
    assert.ok(casoId, "demo-socio must see at least one case");

    const lido = await pa("ler_caso", "demo-socio", { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(lido.status, 200);
    assert.strictEqual(String(lido.json.resultado.id), String(casoId));
    const paLido = await pa("credencial PA ler_caso", paToken, { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(paLido.status, 200, "model credential reads through the same policy");
    assert.strictEqual(String(paLido.json.resultado.id), String(casoId));
    const paChecklist = await pa("credencial PA checklist", paToken, { tool: "checklist", caseId: casoId });
    assert.strictEqual(paChecklist.status, 200);
    const paExporta = await pa("credencial PA exportar_caso", paToken, { tool: "exportar_caso", caseId: casoId });
    assert.strictEqual(paExporta.status, 409);
    assert.ok(!paExporta.json.resultado, "model credential cannot export without the human confirm");
    semSegredo(paExporta.json);
    const lidoConsult = await pa("ler_caso estagiario", "demo-estagiario", { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(lidoConsult.status, 403);

    const MIN = 60 * 1000;
    process.env.HUB_NOW_MS = String(T + 9 * MIN);
    const aos9 = await pa("credencial PA em T+9min", paToken, { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(aos9.status, 200, "model credential still works at T+9min");
    const aos9Export = await pa("credencial PA exportar_caso em T+9min", paToken, { tool: "exportar_caso", caseId: casoId });
    assert.strictEqual(aos9Export.status, 409, "irreversible tool still only proposes at T+9min");
    process.env.HUB_NOW_MS = String(T + 10 * MIN);
    const aos10 = await pa("credencial PA em T+10min", paToken, { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(aos10.status, 200, "model credential is still valid at exactly T+10min");
    process.env.HUB_NOW_MS = String(T + 10 * MIN + 1);
    const expirada = await pa("credencial PA em T+10min+1ms", paToken, { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(expirada.status, 401, "model credential expires after 10 minutes");
    assert.ok(!JSON.stringify(expirada.json).includes(paToken), "401 body does not echo the credential");
    const expiradaDeNovo = await pa("credencial PA expirada reusada", paToken, { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(expiradaDeNovo.status, 401, "expired credential stays dead");
    process.env.HUB_NOW_MS = String(T);
    const forense = await pa("credencial PA expirada com relogio de volta", paToken, { tool: "ler_caso", caseId: casoId });
    assert.strictEqual(forense.status, 401, "expiry deletes the credential, rewinding the clock does not revive it");
    if (relogioOriginal === undefined) delete process.env.HUB_NOW_MS;
    else process.env.HUB_NOW_MS = relogioOriginal;

    const marcado = await pa("checklist marca tarifas", "demo-socio", {
      tool: "checklist",
      caseId: casoId,
      args: { item: "tarifas", done: true },
    });
    assert.strictEqual(marcado.status, 200);
    assert.strictEqual(marcado.json.resultado.find((i) => i.id === "tarifas").done, true);
    const inventado = await pa("checklist item inventado", "demo-socio", {
      tool: "checklist",
      caseId: casoId,
      args: { item: "inventado", done: true },
    });
    assert.strictEqual(inventado.status, 400);

    const exportSem = await pa("exportar_caso sem confirmacao", "demo-socio", { tool: "exportar_caso", caseId: casoId });
    assert.strictEqual(exportSem.status, 409);
    assert.strictEqual(exportSem.json.confirmacaoNecessaria, true);
    assert.ok(!exportSem.json.resultado, "no pack before confirm");
    semSegredo(exportSem.json);
    const exportIgnora = await pa("exportar_caso com confirmacao qualquer", "demo-socio", {
      tool: "exportar_caso",
      caseId: casoId,
      confirmacao: "qualquer",
    });
    assert.strictEqual(exportIgnora.status, 409);
    assert.ok(!exportIgnora.json.resultado, "confirmacao in the call body is ignored");
    const abertasExport = await get("/api/pa/pendencias", "demo-socio");
    const exportPend = abertasExport.json.pendencias.filter((p) => p.tool === "exportar_caso");
    assert.ok(exportPend.length >= 1 && exportPend.every((p) => String(p.caseId) === String(casoId)));
    const exportCom = await post("/api/pa/confirm", "demo-socio", { desafio: exportPend[0].desafio });
    assert.strictEqual(exportCom.status, 200);
    const exportReplay = await post("/api/pa/confirm", "demo-socio", { desafio: exportPend[0].desafio });
    assert.strictEqual(exportReplay.status, 409, "export challenge is single use");
    assert.ok(!exportReplay.json.resultado);
    assert.strictEqual(exportCom.json.resultado.formato, "hub-caso-pack-v0");
    assert.strictEqual(String(exportCom.json.resultado.caso.id), String(casoId));
    const linhaExport = lerLinhas().find(
      (l) => l.ferramenta === "exportar_caso" && l.decisao === "permitido",
    );
    assert.strictEqual(linhaExport.caseId, String(casoId));
    assert.strictEqual(linhaExport.delegated_by, "u-001");

    const linhaSessao = lerLinhas().filter((l) => l.ferramenta === "sessao_pa" && l.decisao === "permitido");
    assert.strictEqual(linhaSessao.length, 1, "one audit line for the issued credential");
    assert.deepStrictEqual(linhaSessao[0].argumentos, {});
    assert.ok(!fs.readFileSync(auditoria, "utf8").includes(paToken), "audit must not store the model credential");

    const outraProposta = await pa("socio propoe de novo", "demo-socio", ZAP);
    assert.strictEqual(outraProposta.status, 409);
    const desafioAudit = (await get("/api/pa/pendencias", "demo-socio")).json.pendencias
      .filter((p) => p.tool === "enviar_whatsapp" && p.desafio !== desafio)
      .pop().desafio;
    const antes = enviados();
    fs.rmSync(auditoria, { force: true });
    fs.mkdirSync(auditoria);
    const semAuditoria = await post("/api/pa/confirm", "demo-socio", { desafio: desafioAudit });
    console.log(`confirm com auditoria ilegivel -> ${semAuditoria.status} enviados=${enviados()}`);
    assert.strictEqual(semAuditoria.status, 503, "audit failure must deny the mutation");
    assert.notStrictEqual(semAuditoria.json.resultado && semAuditoria.json.resultado.ok, true);
    assert.strictEqual(enviados(), antes, "audit failure must not send");
    assert.strictEqual(antes, 1, "only the one confirmed send happened");
  } finally {
    if (relogioOriginal === undefined) delete process.env.HUB_NOW_MS;
    else process.env.HUB_NOW_MS = relogioOriginal;
    await app.close();
    fs.rmSync(auditoria, { recursive: true, force: true });
  }

  console.log("prova-pa: OK");
}

function lerLinhas() {
  return fs
    .readFileSync(auditoria, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((linha) => JSON.parse(linha));
}

main().catch((erro) => {
  console.error(erro instanceof assert.AssertionError ? erro.stack : `prova-pa: ${erro.code || erro.name}`);
  process.exit(1);
});
