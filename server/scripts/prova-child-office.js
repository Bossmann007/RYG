/**
 * Proves child rows are office-scoped when the hub assembles a capa.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-child-office.js
 *
 * HubLegal has no child tables yet. This proof creates `clientes` when it
 * is missing, then the apply script adds office_id. A second apply must
 * exit 0. The capa keeps the row of this office and drops the other office.
 */
require("../dist/register-aliases");
const assert = require("assert");
const { execFileSync } = require("child_process");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const ESCRITORIO = "prado-advogados";
const OUTRO = "outro-escritorio";

function aplicar() {
  const saida = execFileSync(process.execPath, [path.join(__dirname, "apply-child-office-id.js")], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  console.log(saida.trim());
  return saida;
}

async function poolDe() {
  const env = lerDbEnv();
  if (!env) throw new Error("DB_* not configured");
  return mysql.createPool(opcoesPool(env));
}

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
    json = {};
  }
  console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
  return { status: resposta.status, json, texto };
}

async function garantirClientes(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS clientes (
      id BIGINT NOT NULL,
      nome VARCHAR(255) NULL,
      numero_cnj VARCHAR(32) NULL,
      processo_id BIGINT NULL,
      caso_id BIGINT NULL,
      PRIMARY KEY (id)
    )`
  );
}

async function limpar(pool, casoId, idsFilhos) {
  if (idsFilhos.length) {
    const marcas = idsFilhos.map(() => "?").join(", ");
    await pool.query(`DELETE FROM clientes WHERE id IN (${marcas})`, idsFilhos);
  }
  if (casoId) {
    await pool.query("DELETE FROM case_parties WHERE caso_id = ?", [casoId]);
    await pool.query("DELETE FROM case_memberships WHERE caso_id = ?", [casoId]);
    await pool.query("DELETE FROM casos WHERE id = ? AND status = 'intake'", [casoId]);
  }
}

async function main() {
  const nonce = `${Date.now()}`;
  const cnj = `9${nonce.padStart(19, "0")}`.slice(0, 20);
  const nomeProprio = `child-office-prado-${nonce}`;
  const nomeAlheio = `child-office-outro-${nonce}`;
  const idProprio = nonce;
  const idAlheio = `${Number(nonce) + 1}`;
  let casoId = "";

  const pool = await poolDe();
  try {
    await garantirClientes(pool);
    const primeira = aplicar();
    assert.ok(primeira.includes("clientes:"), "apply must mention clientes");
    const segunda = aplicar();
    assert.ok(segunda.includes("clientes: column existed"), "second apply must keep the column");
    assert.ok(segunda.includes("clientes: index existed"), "second apply must keep the index");

    const { app, base } = await boot();
    try {
      const aberto = await pedir(base, "POST", "/api/casos/intake", "demo-socio", {
        client: `child-probe-client-${nonce}`,
        adverse: `child-probe-adverse-${nonce}`,
      });
      assert.strictEqual(aberto.status, 201, "intake must open");
      casoId = String(aberto.json.casoId);
      await pool.query("UPDATE casos SET numero_cnj = ? WHERE id = ?", [cnj, casoId]);
      await pool.query(
        "INSERT INTO clientes (id, nome, numero_cnj, office_id) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
        [idProprio, nomeProprio, cnj, ESCRITORIO, idAlheio, nomeAlheio, cnj, OUTRO]
      );

      const capa = await pedir(base, "GET", `/api/casos/${encodeURIComponent(casoId)}`, "demo-socio");
      assert.strictEqual(capa.status, 200, "member must read the capa");
      assert.ok(capa.texto.includes(nomeProprio), "own-office child must be on the capa");
      assert.ok(!capa.texto.includes(nomeAlheio), "other-office child must stay off the capa");

      const alheio = await pedir(base, "GET", `/api/casos/${encodeURIComponent(casoId)}`, "demo-outro");
      assert.strictEqual(alheio.status, 404, "other office must not read the capa");
    } finally {
      await app.close();
    }
  } finally {
    await limpar(pool, casoId, [idProprio, idAlheio]);
    await pool.end();
  }

  console.log("prova-child-office: OK");
}

main().catch((erro) => {
  console.error(`prova-child-office failed: ${erro.message}`);
  process.exit(1);
});
