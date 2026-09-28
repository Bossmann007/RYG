/**
 * Proves case membership and the intake conflict wall over real HTTP.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-case-acl.js
 *   node server/scripts/prova-case-acl.js
 *
 * Member GET is 200. Same-office non-member is 403. Other office is 404.
 * A new matter that opposes an existing client or adverse party is 409.
 * The same client against a new adverse party is allowed.
 * A broken audit file turns the 403 and the 409 into 503, and does not open the case.
 */
require("../dist/register-aliases");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const AUDIT_OK = path.join(os.tmpdir(), `ryg-case-acl-${process.pid}.jsonl`);
const AUDIT_QUEBRADO = "/dev/null/auditoria.jsonl";
const MOTIVO_PUBLICO = "Conflito de partes com caso existente no escritório.";

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
  if (corpo) headers["Content-Type"] = "application/json";
  const resposta = await fetch(base + caminho, {
    method,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { bruto: texto };
  }
  const n = Array.isArray(json.casos) ? ` n=${json.casos.length}` : "";
  console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}${n}`);
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

async function limparSondas(ids) {
  const env = lerDbEnv();
  if (!env) throw new Error("DB_* not configured");
  const pool = mysql.createPool(opcoesPool(env));
  try {
    const [sondas] = await pool.query(
      "SELECT CAST(id AS CHAR) AS id FROM casos WHERE status = 'intake' AND cliente_nome LIKE 'acl-probe-%'",
    );
    const todos = [...new Set([...ids, ...sondas.map((linha) => String(linha.id))])];
    if (!todos.length) {
      console.log("cleanup: nothing");
      return;
    }
    const marcas = todos.map(() => "?").join(", ");
    await pool.query(`DELETE FROM case_parties WHERE caso_id IN (${marcas})`, todos);
    await pool.query(`DELETE FROM case_memberships WHERE caso_id IN (${marcas})`, todos);
    const [apagados] = await pool.query(
      `DELETE FROM casos WHERE id IN (${marcas}) AND status = 'intake'`,
      todos,
    );
    console.log(`cleanup: casos=${apagados.affectedRows}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
  fs.writeFileSync(AUDIT_OK, "");
  const nonce = `${Date.now()}`;
  const cliente = `acl-probe-client-${nonce}`;
  const adversa = `acl-probe-adverse-${nonce}`;
  const outra = `acl-probe-other-${nonce}`;
  const abertos = [];

  const ligado = await boot();
  try {
    const listaSocio = await pedir(ligado.base, "GET", "/api/casos", "demo-socio");
    assert.strictEqual(listaSocio.status, 200);
    assert.strictEqual(listaSocio.json.casos.length, 26, "member list must stay 26");

    const listaAdvogado = await pedir(ligado.base, "GET", "/api/casos", "demo-advogado");
    assert.strictEqual(listaAdvogado.status, 200);
    assert.strictEqual(listaAdvogado.json.casos.length, 0, "same-office non-member list must be empty");

    const id = String(listaSocio.json.casos[0].id);
    const caminho = `/api/casos/${encodeURIComponent(id)}`;

    const membro = await pedir(ligado.base, "GET", caminho, "demo-socio");
    assert.strictEqual(membro.status, 200, "member detail must be 200");
    assert.strictEqual(String(membro.json.caso.id), id);

    const negado = await pedir(ligado.base, "GET", caminho, "demo-advogado");
    assert.strictEqual(negado.status, 403, "same-office non-member detail must be 403");
    assert.ok(!negado.json.caso, "403 must not return capa");

    const outro = await pedir(ligado.base, "GET", caminho, "demo-outro");
    assert.strictEqual(outro.status, 404, "other office detail must be 404");

    const aberto = await pedir(ligado.base, "POST", "/api/casos/intake", "demo-socio", {
      client: cliente,
      adverse: adversa,
    });
    assert.strictEqual(aberto.status, 201, "clear intake must be 201");
    abertos.push(String(aberto.json.casoId));

    const mesmoCliente = await pedir(ligado.base, "POST", "/api/casos/intake", "demo-socio", {
      client: cliente,
      adverse: outra,
    });
    assert.strictEqual(mesmoCliente.status, 201, "same client and new adverse party must be allowed");
    abertos.push(String(mesmoCliente.json.casoId));

    const conflito = await pedir(ligado.base, "POST", "/api/casos/intake", "demo-advogado", {
      client: adversa,
      adverse: cliente,
    });
    assert.strictEqual(conflito.status, 409, "opposing an existing matter must be 409");
    assert.strictEqual(conflito.json.erro, MOTIVO_PUBLICO);
    assert.ok(!conflito.json.casoId, "conflict must not open a case");

    const auditoria = linhasAuditoria();
    assert.ok(
      auditoria.some((linha) => linha.ferramenta === "caso_obter" && linha.decisao === "negado"),
      "membership deny must be audited",
    );
    assert.ok(
      auditoria.some(
        (linha) =>
          linha.ferramenta === "caso_abrir" &&
          linha.decisao === "negado" &&
          abertos.some((casoId) => String(linha.motivo || "").includes(casoId)),
      ),
      "conflict block must be audited with the existing case id",
    );
  } finally {
    await ligado.app.close();
  }

  process.env.GATEWAY_AUDIT_FILE = AUDIT_QUEBRADO;
  const quebrado = await boot();
  try {
    const lista = await pedir(quebrado.base, "GET", "/api/casos", "demo-socio");
    assert.strictEqual(lista.status, 200);
    const id = String(lista.json.casos[0].id);
    const semAudit = await pedir(quebrado.base, "GET", `/api/casos/${encodeURIComponent(id)}`, "demo-advogado");
    assert.strictEqual(semAudit.status, 503, "membership deny must fail closed when audit cannot write");
    assert.ok(!semAudit.json.caso);

    const parede = await pedir(quebrado.base, "POST", "/api/casos/intake", "demo-socio", {
      client: adversa,
      adverse: cliente,
    });
    assert.strictEqual(parede.status, 503, "conflict block must fail closed when audit cannot write");
    assert.ok(!parede.json.casoId);
  } finally {
    await quebrado.app.close();
    await limparSondas(abertos);
  }

  console.log("prova-case-acl: OK");
}

main().catch(async (erro) => {
  console.error(`prova-case-acl failed: ${erro.message}`);
  try {
    await limparSondas([]);
  } catch (limpeza) {
    console.error(`cleanup failed: ${limpeza.message}`);
  }
  process.exit(1);
});
