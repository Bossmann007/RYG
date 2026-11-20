/**
 * Proves Phase 5 Task 5.0: case legal hold + retain_until over real HTTP and TiDB.
 * The delete guard lives in CasosService; there is no public case DELETE route.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-hold.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { CasosService } = require("../dist/modules/casos/casos.service");
const { CasosRepository } = require("../dist/modules/casos/casos.repository");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICE = "prado-advogados";

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }
  const pool = mysql.createPool(opcoesPool(env));
  try {
    await pool.query("SELECT 1");
  } catch (erro) {
    throw new Error(`TiDB unreachable: ${erro.code || erro.message}`);
  }

  console.log(
    execFileSync(process.execPath, [path.join(__dirname, "apply-case-retention.js")], {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
    }).trim(),
  );

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const casos = app.get(CasosService, { strict: false });
  const repositorio = app.get(CasosRepository, { strict: false });

  const pedir = async (method, caminho, token, body) => {
    const resposta = await fetch(`${base}${caminho}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const corpo = await resposta.json().catch(() => ({}));
    console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
    return { status: resposta.status, corpo };
  };

  const linhaDoCaso = async (id) => {
    const [rows] = await pool.query(
      "SELECT id, office_id, legal_hold, DATE_FORMAT(retain_until, '%Y-%m-%d') AS retain_until FROM casos WHERE id = ?",
      [id],
    );
    return rows[0];
  };
  const status = async (promessa) => {
    try {
      await promessa;
      return 200;
    } catch (erro) {
      return typeof erro.getStatus === "function" ? erro.getStatus() : 500;
    }
  };

  let casoId = null;
  try {
    const nonce = Date.now();
    const criado = await pedir("POST", "/api/casos/intake", "demo-socio", {
      client: `hold-cliente-${nonce}`,
      adverse: `hold-adverso-${nonce}`,
      classification: "interno",
    });
    assert.strictEqual(criado.status, 201);
    casoId = String(criado.corpo.casoId);
    const caminho = `/api/casos/${encodeURIComponent(casoId)}/hold`;
    const apagarCaso = (connection) =>
      connection.query("DELETE FROM casos WHERE id = ? AND office_id = ?", [casoId, OFFICE]);

    // access gate
    assert.strictEqual((await pedir("PATCH", caminho, null, { legalHold: true })).status, 401);
    assert.strictEqual((await pedir("PATCH", caminho, "demo-outro", { legalHold: true })).status, 404);
    assert.strictEqual((await pedir("PATCH", caminho, "demo-advogado", { legalHold: true })).status, 403);
    assert.strictEqual((await pedir("GET", caminho, "demo-advogado")).status, 403);
    assert.strictEqual((await linhaDoCaso(casoId)).legal_hold, 0);
    console.log("assert: no token 401, demo-outro 404, demo-advogado 403, hold untouched");

    // advogado with membership still cannot change hold
    await pool.query(
      "INSERT INTO case_memberships (office_id, caso_id, user_id, role) VALUES (?, ?, 'u-002', 'advogado')",
      [OFFICE, casoId],
    );
    assert.strictEqual((await pedir("PATCH", caminho, "demo-advogado", { legalHold: true })).status, 403);
    assert.strictEqual((await pedir("GET", caminho, "demo-advogado")).status, 200);
    assert.strictEqual((await linhaDoCaso(casoId)).legal_hold, 0);
    console.log("assert: member advogado reads hold, cannot change it");

    // defaults
    const inicial = await pedir("GET", caminho, "demo-socio");
    assert.strictEqual(inicial.status, 200);
    assert.strictEqual(inicial.corpo.zone, "internal");
    assert.deepStrictEqual(inicial.corpo.hold, { legalHold: false, retainUntil: null });

    // invalid input never writes
    for (const corpo of [
      { legalHold: true, retainUntil: "2026-02-31" },
      { legalHold: true, retainUntil: "31/12/2026" },
      { legalHold: true, retainUntil: 20261231 },
      { legalHold: "true" },
      {},
    ]) {
      assert.strictEqual((await pedir("PATCH", caminho, "demo-socio", corpo)).status, 400);
    }
    assert.strictEqual((await linhaDoCaso(casoId)).legal_hold, 0);
    console.log('assert: retainUntil "2026-02-31" and other bad bodies → 400, nothing written');

    // hold on, read back
    const ligado = await pedir("PATCH", caminho, "demo-socio", {
      legalHold: true,
      retainUntil: "2027-01-31",
    });
    assert.strictEqual(ligado.status, 200);
    assert.deepStrictEqual(ligado.corpo.hold, { legalHold: true, retainUntil: "2027-01-31" });
    const lido = await pedir("GET", caminho, "demo-socio");
    assert.deepStrictEqual(lido.corpo.hold, { legalHold: true, retainUntil: "2027-01-31" });
    console.log("assert: demo-socio hold on, read back legalHold true");

    // guard: hold on blocks delete, row stays
    assert.strictEqual(await status(casos.apagarSemHold(OFFICE, casoId, apagarCaso)), 409);
    assert.ok(await linhaDoCaso(casoId), "row must survive a blocked delete");
    assert.strictEqual(await status(casos.apagarSemHold("outro-escritorio", casoId, apagarCaso)), 404);
    assert.strictEqual(await status(casos.apagarSemHold("", casoId, apagarCaso)), 400);
    assert.ok(await linhaDoCaso(casoId));
    console.log("assert: hold on → delete 409, row stays; other/empty office never deletes");

    // empty office does not write
    await assert.rejects(repositorio.gravarHold("", casoId, false, null), /office_id/);
    await assert.rejects(repositorio.gravarHold("   ", casoId, false, null), /office_id/);
    assert.strictEqual((await linhaDoCaso(casoId)).legal_hold, 1);
    assert.strictEqual((await linhaDoCaso(casoId)).office_id, OFFICE);
    console.log("assert: empty office_id does not write");

    // hold off (retainUntil omitted keeps the date)
    const desligado = await pedir("PATCH", caminho, "demo-socio", { legalHold: false });
    assert.strictEqual(desligado.status, 200);
    assert.deepStrictEqual(desligado.corpo.hold, { legalHold: false, retainUntil: "2027-01-31" });
    console.log("assert: demo-socio hold off");

    // retain_until in the past deletes nothing by itself
    const passado = await pedir("PATCH", caminho, "demo-socio", {
      legalHold: false,
      retainUntil: "2020-01-01",
    });
    assert.strictEqual(passado.status, 200);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.ok(await linhaDoCaso(casoId), "retain_until must not delete anything");
    const limpo = await pedir("PATCH", caminho, "demo-socio", { legalHold: false, retainUntil: null });
    assert.deepStrictEqual(limpo.corpo.hold, { legalHold: false, retainUntil: null });
    console.log("assert: retain_until (even past) deletes nothing; null clears it");

    // hold off → guard lets the delete run
    await casos.apagarSemHold(OFFICE, casoId, apagarCaso);
    assert.strictEqual(await linhaDoCaso(casoId), undefined);
    console.log("assert: hold off → guarded delete runs");

    console.log("prova-hold: OK");
  } finally {
    if (casoId) {
      try {
        await pool.query("DELETE FROM case_parties WHERE caso_id = ?", [casoId]);
        await pool.query("DELETE FROM case_memberships WHERE caso_id = ?", [casoId]);
        await pool.query("DELETE FROM casos WHERE id = ? AND status = 'intake'", [casoId]);
      } catch (erro) {
        console.error(`cleanup warning: ${erro.message}`);
      }
    }
    await app.close();
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`prova-hold failed: ${erro.message}`);
  process.exit(1);
});
