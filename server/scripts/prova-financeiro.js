/**
 * Proves ADR 0006 case money: capa gate on read, socio-only writes, immutable lancado rows,
 * a frozen fatura sum, and fail-closed audit inside the transaction.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/apply-caso-lancamentos.js
 *   node server/scripts/prova-financeiro.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const auditoria = path.join(os.tmpdir(), `prova-financeiro-${process.pid}.jsonl`);
process.env.GATEWAY_AUDIT_FILE = auditoria;

require("../dist/register-aliases");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const assert = require("assert");
const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const MARCA = `prova-fin-${process.pid}-${Date.now()}`;
const CPF_FALSO = "123.456.789-09";

async function main() {
  const env = lerDbEnv();
  assert.ok(env, "DB_* must be configured");
  const pool = mysql.createPool(opcoesPool(env));
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const inseridos = [];

  const chamar = async (metodo, caminho, token, corpo) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    return { status: resposta.status, json: await resposta.json().catch(() => ({})) };
  };
  const linhasComMarca = async (marca) => {
    const [linhas] = await pool.query(
      "SELECT id FROM caso_lancamentos WHERE descricao LIKE ?",
      [`%${marca}%`],
    );
    return linhas.length;
  };

  try {
    const lista = await chamar("GET", "/api/casos", "demo-socio");
    assert.strictEqual(lista.status, 200, "demo-socio lists TiDB casos");
    let casoId = "";
    for (const caso of lista.json.casos ?? []) {
      const r = await chamar("GET", `/api/casos/${caso.id}/lancamentos`, "demo-socio");
      if (r.status === 200 && r.json.abertoCentavos === 0) {
        casoId = String(caso.id);
        break;
      }
    }
    assert.ok(casoId, "demo-socio must read a case with no open lancamentos");
    const rota = `/api/casos/${encodeURIComponent(casoId)}`;

    const semToken = await chamar("GET", `${rota}/lancamentos`, null);
    console.log(`sem token -> ${semToken.status}`);
    assert.strictEqual(semToken.status, 401);

    const outro = await chamar("GET", `${rota}/lancamentos`, "demo-outro");
    const outroPost = await chamar("POST", `${rota}/lancamentos`, "demo-outro", {
      kind: "custa",
      descricao: `outro ${MARCA}`,
      centavos: 100,
    });
    console.log(`demo-outro -> GET ${outro.status} POST ${outroPost.status}`);
    assert.strictEqual(outro.status, 404, "another office does not see the case");
    assert.strictEqual(outroPost.status, 404);

    const advogado = await chamar("POST", `${rota}/lancamentos`, "demo-advogado", {
      kind: "custa",
      descricao: `advogado ${MARCA}`,
      centavos: 100,
      status: "lancado",
    });
    console.log(`demo-advogado POST -> ${advogado.status}`);
    assert.strictEqual(advogado.status, 403);
    assert.strictEqual(await linhasComMarca(`advogado ${MARCA}`), 0, "advogado writes no row");

    const invalidos = [
      { kind: "fatura", descricao: "x", centavos: 1 },
      { kind: "honorario", descricao: "x", centavos: 10.5 },
      { kind: "honorario", descricao: "x", centavos: -1 },
      { kind: "honorario", descricao: "x", centavos: "100" },
      { kind: "honorario", descricao: "   ", centavos: 1 },
      { kind: "honorario", descricao: "a".repeat(161), centavos: 1 },
      { kind: "honorario", descricao: "x", centavos: 1, status: "pago" },
    ];
    for (const corpo of invalidos) {
      const r = await chamar("POST", `${rota}/lancamentos`, "demo-socio", corpo);
      assert.strictEqual(r.status, 400, `invalid body is 400: ${JSON.stringify(corpo).slice(0, 60)}`);
    }
    console.log(`corpos invalidos -> 400 x${invalidos.length}`);

    const descricaoH = `Honorario inicial ${MARCA} CPF ${CPF_FALSO}`;
    const h = await chamar("POST", `${rota}/lancamentos`, "demo-socio", {
      kind: "honorario",
      descricao: descricaoH,
      centavos: 150000,
    });
    assert.strictEqual(h.status, 201, "socio creates an honorario");
    const hId = h.json.lancamento.id;
    inseridos.push(hId);
    assert.match(hId, /^lan_[0-9a-f]{16}$/);
    assert.strictEqual(h.json.lancamento.status, "rascunho", "default status is rascunho");
    assert.strictEqual(h.json.lancamento.descricao, descricaoH, "descricao is stored on the row");

    const hPatch = await chamar("PATCH", `${rota}/lancamentos/${hId}`, "demo-socio", {
      kind: "honorario",
      descricao: `Honorario revisto ${MARCA}`,
      centavos: 175050,
      status: "lancado",
    });
    console.log(`honorario ${hId} -> POST ${h.status} PATCH ${hPatch.status}`);
    assert.strictEqual(hPatch.status, 200, "socio replaces the rascunho");
    assert.strictEqual(hPatch.json.lancamento.centavos, 175050);
    assert.strictEqual(hPatch.json.lancamento.status, "lancado");

    const c = await chamar("POST", `${rota}/lancamentos`, "demo-socio", {
      kind: "custa",
      descricao: `Custa inicial ${MARCA}`,
      centavos: 4590,
      status: "lancado",
    });
    assert.strictEqual(c.status, 201, "socio creates a lancado custa");
    const cId = c.json.lancamento.id;
    inseridos.push(cId);
    assert.strictEqual(c.json.lancamento.status, "lancado");

    const leitura = await chamar("GET", `${rota}/lancamentos`, "demo-socio");
    assert.strictEqual(leitura.status, 200);
    assert.strictEqual(leitura.json.zone, "internal");
    assert.strictEqual(leitura.json.abertoCentavos, 179640, "open total sums lancado rows without fatura");
    console.log(`aberto -> ${leitura.json.abertoCentavos}`);

    const imutavel = await chamar("PATCH", `${rota}/lancamentos/${hId}`, "demo-socio", {
      kind: "honorario",
      descricao: "tentativa",
      centavos: 1,
    });
    console.log(`PATCH em lancado -> ${imutavel.status}`);
    assert.strictEqual(imutavel.status, 409, "a lancado row is immutable");

    const fatura = await chamar("POST", `${rota}/fatura`, "demo-socio");
    assert.strictEqual(fatura.status, 201, "socio generates a fatura");
    const faturaId = fatura.json.fatura.id;
    inseridos.push(faturaId);
    assert.strictEqual(fatura.json.fatura.kind, "fatura");
    assert.strictEqual(fatura.json.fatura.status, "lancado");
    assert.strictEqual(fatura.json.fatura.centavos, 179640, "fatura freezes the sum");
    const depois = await chamar("GET", `${rota}/lancamentos`, "demo-socio");
    const porId = new Map(depois.json.lancamentos.map((l) => [l.id, l]));
    assert.strictEqual(porId.get(hId).faturaId, faturaId, "honorario gains fatura_id");
    assert.strictEqual(porId.get(cId).faturaId, faturaId, "custa gains fatura_id");
    assert.strictEqual(depois.json.abertoCentavos, 0, "nothing stays open after the fatura");
    const totalLinhas = async () => {
      const [[r]] = await pool.query("SELECT COUNT(*) AS n FROM caso_lancamentos WHERE caso_id = ?", [casoId]);
      return Number(r.n);
    };
    const antesSegunda = await totalLinhas();
    const segunda = await chamar("POST", `${rota}/fatura`, "demo-socio");
    console.log(`fatura ${faturaId} -> ${fatura.status} soma=${fatura.json.fatura.centavos} segunda=${segunda.status}`);
    assert.strictEqual(segunda.status, 400, "empty set is 400");
    assert.strictEqual(await totalLinhas(), antesSegunda, "the empty fatura wrote nothing");

    const faturado = await chamar("PATCH", `${rota}/lancamentos/${cId}`, "demo-socio", {
      kind: "custa",
      descricao: "tentativa",
      centavos: 1,
    });
    assert.strictEqual(faturado.status, 409, "a faturado row is immutable");

    const bruto = fs.readFileSync(auditoria, "utf8");
    const linhas = bruto.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const permitidas = linhas.filter((l) => l.ferramenta === "caso_lancamento" && l.decisao === "permitido");
    assert.strictEqual(permitidas.length, 4, "create, replace, create, fatura each audited");
    const criacaoH = permitidas.find((l) => l.argumentos.lancamentoId === hId && l.motivo === "lancamento criado");
    assert.deepStrictEqual(criacaoH.argumentos, { casoId, lancamentoId: hId, kind: "honorario", centavos: 150000 });
    const linhaFatura = permitidas.find((l) => l.argumentos.kind === "fatura");
    assert.strictEqual(linhaFatura.argumentos.centavos, 179640);
    for (const l of permitidas) {
      assert.deepStrictEqual(Object.keys(l.argumentos).sort(), ["casoId", "centavos", "kind", "lancamentoId"]);
    }
    assert.ok(!bruto.includes(CPF_FALSO), "audit must not store the CPF from descricao");
    assert.ok(!bruto.includes(MARCA), "audit must not store the descricao");
    console.log(`audit caso_lancamento permitido=${permitidas.length} sem CPF e sem descricao`);

    fs.rmSync(auditoria, { force: true });
    fs.mkdirSync(auditoria);
    const semAuditoria = await chamar("POST", `${rota}/lancamentos`, "demo-socio", {
      kind: "custa",
      descricao: `sem auditoria ${MARCA}`,
      centavos: 999,
      status: "lancado",
    });
    if (semAuditoria.json.lancamento) inseridos.push(semAuditoria.json.lancamento.id);
    const restos = await linhasComMarca(`sem auditoria ${MARCA}`);
    console.log(`POST com auditoria ilegivel -> ${semAuditoria.status} linhas=${restos}`);
    assert.strictEqual(semAuditoria.status, 503, "audit failure denies the write");
    assert.strictEqual(restos, 0, "audit failure rolls the row back");
  } finally {
    if (inseridos.length) {
      await pool.query("DELETE FROM caso_lancamentos WHERE id IN (?)", [inseridos]);
    }
    await pool.end();
    await app.close();
    fs.rmSync(auditoria, { recursive: true, force: true });
  }

  console.log("prova-financeiro: OK");
}

main().catch((erro) => {
  console.error(erro instanceof assert.AssertionError ? erro.stack : `prova-financeiro: ${erro.code || erro.name}`);
  process.exit(1);
});
