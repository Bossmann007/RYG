/**
 * Proves case classification clearance over real HTTP.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-case-classification.js
 *   node server/scripts/prova-classification.js
 *
 * Default label is sigiloso. Socio reads it. A member who is not socio
 * gets 403 on segredo_justica, with no capa. Other office stays 404.
 * Intake stores an explicit label and the default when the field is omitted.
 * A broken audit file turns the clearance deny into 503.
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
const { USUARIOS_POR_TOKEN } = require("../dist/fixtures/usuarios");

const AUDIT_OK = path.join(os.tmpdir(), `ryg-classification-${process.pid}.jsonl`);
const AUDIT_QUEBRADO = "/dev/null/auditoria.jsonl";
const ADVOGADO = USUARIOS_POR_TOKEN["demo-advogado"];

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

async function concederMembership(casoId) {
  const env = lerDbEnv();
  if (!env) throw new Error("DB_* not configured");
  const pool = mysql.createPool(opcoesPool(env));
  try {
    await pool.query(
      `INSERT INTO case_memberships (office_id, caso_id, user_id, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [ADVOGADO.escritorio, casoId, ADVOGADO.id, ADVOGADO.papel],
    );
  } finally {
    await pool.end();
  }
}

async function limparSondas(ids) {
  const env = lerDbEnv();
  if (!env) throw new Error("DB_* not configured");
  const pool = mysql.createPool(opcoesPool(env));
  try {
    const [sondas] = await pool.query(
      "SELECT CAST(id AS CHAR) AS id FROM casos WHERE status = 'intake' AND cliente_nome LIKE 'cls-probe-%'",
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
  const cliente = `cls-probe-client-${nonce}`;
  const adversa = `cls-probe-adverse-${nonce}`;
  const abertos = [];
  let segredoId = "";

  const ligado = await boot();
  try {
    const listaSocio = await pedir(ligado.base, "GET", "/api/casos", "demo-socio");
    assert.strictEqual(listaSocio.status, 200);
    assert.strictEqual(listaSocio.json.casos.length, 26, "socio list must stay 26 before probes");

    const listaAdvogado = await pedir(ligado.base, "GET", "/api/casos", "demo-advogado");
    assert.strictEqual(listaAdvogado.status, 200);
    assert.strictEqual(listaAdvogado.json.casos.length, 0, "non-member list must stay empty");

    const existente = await pedir(ligado.base, "GET", "/api/casos/1", "demo-socio");
    assert.strictEqual(existente.status, 200, "socio must read a sigiloso case");
    assert.strictEqual(existente.json.caso.classification, "sigiloso");

    const invalido = await pedir(ligado.base, "POST", "/api/casos/intake", "demo-socio", {
      client: cliente,
      adverse: adversa,
      classification: "secreto",
    });
    assert.strictEqual(invalido.status, 400, "unknown classification must be 400");
    assert.ok(!invalido.json.casoId);

    const aberto = await pedir(ligado.base, "POST", "/api/casos/intake", "demo-socio", {
      client: cliente,
      adverse: adversa,
      classification: "segredo_justica",
    });
    assert.strictEqual(aberto.status, 201, "explicit classification must open");
    segredoId = String(aberto.json.casoId);
    abertos.push(segredoId);
    const caminho = `/api/casos/${encodeURIComponent(segredoId)}`;

    const socio = await pedir(ligado.base, "GET", caminho, "demo-socio");
    assert.strictEqual(socio.status, 200, "socio must read segredo_justica");
    assert.strictEqual(socio.json.caso.classification, "segredo_justica");

    await concederMembership(segredoId);
    const semClearance = await pedir(ligado.base, "GET", caminho, "demo-advogado");
    assert.strictEqual(semClearance.status, 403, "member without clearance must be 403");
    assert.strictEqual(semClearance.json.erro, "Sem clearance para esta classificação.");
    assert.ok(!semClearance.json.caso, "403 must not return capa");

    const outro = await pedir(ligado.base, "GET", caminho, "demo-outro");
    assert.strictEqual(outro.status, 404, "other office must be 404");

    const listaDepois = await pedir(ligado.base, "GET", "/api/casos", "demo-advogado");
    assert.strictEqual(listaDepois.status, 200);
    assert.ok(
      !listaDepois.json.casos.some((caso) => String(caso.id) === segredoId),
      "list must not leak a case the member cannot clear",
    );

    const padrao = await pedir(ligado.base, "POST", "/api/casos/intake", "demo-socio", {
      client: `cls-probe-plain-${nonce}`,
      adverse: `cls-probe-other-${nonce}`,
    });
    assert.strictEqual(padrao.status, 201, "omitted classification must open");
    abertos.push(String(padrao.json.casoId));
    const lido = await pedir(
      ligado.base,
      "GET",
      `/api/casos/${encodeURIComponent(padrao.json.casoId)}`,
      "demo-socio",
    );
    assert.strictEqual(lido.status, 200);
    assert.strictEqual(lido.json.caso.classification, "sigiloso", "omitted label must default to sigiloso");

    const auditoria = linhasAuditoria();
    assert.ok(
      auditoria.some(
        (linha) =>
          linha.ferramenta === "caso_obter" &&
          linha.decisao === "negado" &&
          linha.motivo === "classification clearance ausente" &&
          linha.argumentos &&
          linha.argumentos.classification === "segredo_justica" &&
          String(linha.argumentos.casoId) === segredoId,
      ),
      "classification deny must be audited",
    );
  } finally {
    await ligado.app.close();
  }

  process.env.GATEWAY_AUDIT_FILE = AUDIT_QUEBRADO;
  const quebrado = await boot();
  try {
    const semAudit = await pedir(
      quebrado.base,
      "GET",
      `/api/casos/${encodeURIComponent(segredoId)}`,
      "demo-advogado",
    );
    assert.strictEqual(semAudit.status, 503, "clearance deny must fail closed when audit cannot write");
    assert.ok(!semAudit.json.caso);
  } finally {
    await quebrado.app.close();
    await limparSondas(abertos);
  }

  console.log("prova-classification: OK");
}

main().catch(async (erro) => {
  console.error(`prova-classification failed: ${erro.message}`);
  try {
    await limparSondas([]);
  } catch (limpeza) {
    console.error(`cleanup failed: ${limpeza.message}`);
  }
  process.exit(1);
});
