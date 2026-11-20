/**
 * Proves Phase 4 Task 4.1: Xirp run metadata for MCP tools/call over real HTTP.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-xirp.js
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
const { XirpService } = require("../dist/modules/xirp/xirp.service");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICES = ["prado-advogados", "outro-escritorio"];
const CITE = ["cited", "silent", "refused"];

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
    execFileSync(process.execPath, [path.join(__dirname, "apply-mcp-runs.js")], {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
    }).trim(),
  );

  const linhas = async () => {
    const [rows] = await pool.query("SELECT * FROM mcp_runs WHERE office_id IN (?)", [OFFICES]);
    return rows;
  };
  const antes = new Set((await linhas()).map((r) => r.id));

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const xirp = app.get(XirpService, { strict: false });

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
  const chamar = (token, name, args) =>
    pedir("POST", "/api/mcp", token, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    });

  try {
    const lista = await pedir("GET", "/api/casos", "demo-socio");
    assert.strictEqual(lista.status, 200);
    const casoId = String(lista.corpo.casos?.[0]?.id);
    assert.ok(casoId, "demo-socio must see a case");
    // Fixture process the MCP tools resolve; the hub case is linked by caseId, not by this number.
    const processNumber = "1002345-12.2023.8.26.0100";
    const caminho = `/api/casos/${encodeURIComponent(casoId)}/xirp`;

    // access gate
    assert.strictEqual((await pedir("GET", caminho)).status, 401);
    assert.strictEqual((await pedir("GET", caminho, "demo-outro")).status, 404);
    assert.strictEqual((await pedir("GET", caminho, "demo-advogado")).status, 403);
    console.log("assert: no token 401, demo-outro 404, demo-advogado 403");

    const vazio = await pedir("GET", caminho, "demo-socio");
    assert.strictEqual(vazio.status, 200);
    assert.strictEqual(vazio.corpo.zone, "internal");
    const n0 = vazio.corpo.runs.length;

    // successful run tied to the case; argument text must not be stored
    const marker = `xirp-marker-${Date.now()}`;
    const telefone = "41 99999-1234";
    const ok = await chamar("demo-socio", "get_safe_summary", {
      processNumber,
      caseId: casoId,
      nota: marker,
    });
    assert.strictEqual(ok.status, 200);
    assert.ok(!ok.corpo.error, `expected success, got ${JSON.stringify(ok.corpo.error)}`);
    const releaseId = ok.corpo.result.structuredContent.releaseId;
    assert.match(releaseId, /^rel_[0-9a-f]{12}$/);

    const busca = await chamar("demo-socio", "search_safe_knowledge", {
      assuntos: ["Tarifa de cadastro", marker],
      caseId: casoId,
    });
    assert.ok(!busca.corpo.error, "search must succeed");

    const fone = await chamar("demo-socio", "get_safe_summary", {
      processNumber,
      caseId: casoId,
      nota: `ligue ${telefone} /etc/passwd`,
    });
    assert.ok(fone.corpo.error, "firewall must refuse the poisoned argument");
    assert.ok(fone.corpo.error.message.includes("safedto_recusado"));

    const painel = await pedir("GET", caminho, "demo-socio");
    assert.strictEqual(painel.status, 200);
    const runs = painel.corpo.runs;
    assert.ok(runs.length >= n0 + 2, "panel must list the new runs");
    const daResumo = runs.find((r) => r.releaseId === releaseId);
    assert.ok(daResumo, "run with the released id must be listed");
    assert.strictEqual(daResumo.toolName, "get_safe_summary");
    assert.ok(CITE.includes(daResumo.citeStatus));
    assert.ok(daResumo.summary.length > 0 && daResumo.summary.length <= 240);
    assert.ok(runs.every((r) => CITE.includes(r.citeStatus)));
    assert.ok(runs.some((r) => r.citeStatus === "refused" && r.releaseId === null));
    console.log("assert: demo-socio sees case runs (tool, release id, cite status, summary)");

    // run without case id does not enter the case panel
    const semCaso = await chamar("demo-socio", "get_safe_summary", { processNumber });
    assert.ok(!semCaso.corpo.error);
    const semCasoRelease = semCaso.corpo.result.structuredContent.releaseId;
    const depois = await pedir("GET", caminho, "demo-socio");
    assert.ok(!depois.corpo.runs.some((r) => r.releaseId === semCasoRelease));
    const noBanco = (await linhas()).find((r) => r.release_id === semCasoRelease);
    assert.ok(noBanco && noBanco.case_id === null && noBanco.office_id === "prado-advogados");
    console.log("assert: run without case id stored with case_id NULL, absent from panel");

    // case id the caller cannot read is refused and leaves no row
    const totalAntes = (await linhas()).length;
    for (const token of ["demo-advogado", "demo-outro"]) {
      const negado = await chamar(token, "get_safe_summary", { processNumber, caseId: casoId });
      assert.ok(negado.corpo.error, `${token} must not run against foreign case`);
    }
    assert.strictEqual((await linhas()).length, totalAntes);
    console.log("assert: caseId without access refused, no row");

    // other office: own run stays invisible to demo-socio, even when pinned to the same case id
    const outro = await chamar("demo-outro", "get_safe_summary", { processNumber });
    console.log(`demo-outro run → ${outro.corpo.error ? "error" : "released"}`);
    await xirp.registrar({
      officeId: "outro-escritorio",
      userId: "u-099",
      caseId: casoId,
      toolName: "get_safe_summary",
      releaseId: "rel_aaaaaaaaaaaa",
      citeStatus: "silent",
      summary: "run de outro escritorio",
    });
    const visto = await pedir("GET", caminho, "demo-socio");
    assert.ok(!visto.corpo.runs.some((r) => r.releaseId === "rel_aaaaaaaaaaaa"));
    console.log("assert: demo-socio does not see other-office runs");

    // stored rows carry no argument text and no phone
    const novas = (await linhas()).filter((r) => !antes.has(r.id));
    assert.ok(novas.length >= 4);
    assert.ok(!JSON.stringify(novas).includes("/etc/passwd"));
    const bruto = JSON.stringify(novas);
    assert.ok(!bruto.includes(marker), "row must not contain argument text");
    assert.ok(!bruto.includes("99999-1234") && !bruto.includes("999991234"), "row must not contain phone");
    assert.ok(novas.every((r) => r.office_id && CITE.includes(r.cite_status)));
    console.log("assert: stored rows carry no argument text or phone");

    // cite status outside the set is refused and writes nothing
    const total = (await linhas()).length;
    await assert.rejects(
      xirp.registrar({
        officeId: "prado-advogados",
        userId: "u-001",
        caseId: casoId,
        toolName: "get_safe_summary",
        releaseId: "rel_bbbbbbbbbbbb",
        citeStatus: "maybe",
        summary: "x",
      }),
      /cite status/,
    );
    await assert.rejects(
      xirp.registrar({
        officeId: "",
        userId: "u-001",
        caseId: casoId,
        toolName: "get_safe_summary",
        releaseId: null,
        citeStatus: "silent",
        summary: "x",
      }),
      /office_id/,
    );
    assert.strictEqual((await linhas()).length, total);
    console.log("assert: invalid cite status / missing office_id rejected");

    // fail closed: no row, no success
    const original = xirp.registrar;
    xirp.registrar = async () => {
      throw new Error("db down");
    };
    try {
      const falha = await chamar("demo-socio", "get_safe_summary", { processNumber, caseId: casoId });
      assert.ok(falha.corpo.error && !falha.corpo.result, "call must not succeed when the row cannot be written");
    } finally {
      xirp.registrar = original;
    }
    console.log("assert: write failure → no success (fail-closed)");

    console.log("prova-xirp: OK");
  } finally {
    try {
      const novas = (await linhas()).filter((r) => !antes.has(r.id)).map((r) => r.id);
      if (novas.length) {
        await pool.query("DELETE FROM mcp_runs WHERE id IN (?)", [novas]);
      }
    } catch (erro) {
      console.error(`cleanup warning: ${erro.message}`);
    }
    await app.close();
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`prova-xirp failed: ${erro.message}`);
  process.exit(1);
});
