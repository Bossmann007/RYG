/**
 * Phase 2 evidence: Backstage tools catalog, manual ProcessSource (tenant), prazo CPC.
 *
 *   PROCESS_SOURCE=manual pnpm --dir server run build
 *   PROCESS_SOURCE=manual node server/scripts/prova-phase2.js
 */
require("../dist/register-aliases");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const AUDIT_OK = path.join(os.tmpdir(), `ryg-phase2-${process.pid}.jsonl`);
const CNJ_MANUAL = "0000999-99.2026.8.16.0001";
const CNJ_NOVO = "0000888-88.2026.8.16.0001";

async function boot() {
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
  process.env.PROCESS_SOURCE = "manual";
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
  console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
  return { status: resposta.status, json };
}

async function main() {
  fs.writeFileSync(AUDIT_OK, "");
  const { app, base } = await boot();
  try {
    assert.strictEqual(
      (await pedir(base, "GET", "/api/catalogo")).status,
      401,
      "catalog must require hub token",
    );
    const catalogo = await pedir(base, "GET", "/api/catalogo", "demo-socio");
    assert.strictEqual(catalogo.status, 200);
    assert.strictEqual(catalogo.json.surface, "backstage");
    const tools = (catalogo.json.itens || []).filter((i) => i.kind === "tool");
    const live = tools.filter((i) => i.status === "live");
    assert.ok(tools.length >= 5, `expected ≥5 tool entries, got ${tools.length}`);
    assert.ok(live.length >= 5, `expected ≥5 live tools, got ${live.length}`);
    assert.ok(tools.some((t) => t.id === "tool-datajud-capa" && t.status === "stub"));

    assert.strictEqual(
      (await pedir(base, "GET", "/api/process/source")).status,
      401,
      "process source must require hub token",
    );
    const fonte = await pedir(base, "GET", "/api/process/source", "demo-socio");
    assert.strictEqual(fonte.status, 200);
    assert.strictEqual(fonte.json.kind, "manual");
    assert.strictEqual(fonte.json.configurado, true);

    assert.strictEqual(
      (await pedir(base, "GET", `/api/process/capa/${CNJ_MANUAL}`)).status,
      401,
    );

    const capa = await pedir(
      base,
      "GET",
      `/api/process/capa/${CNJ_MANUAL}`,
      "demo-socio",
    );
    assert.strictEqual(capa.status, 200);
    assert.strictEqual(capa.json.source, "manual");
    assert.strictEqual(capa.json.processo.processNumber, CNJ_MANUAL);

    const outro = await pedir(
      base,
      "GET",
      `/api/process/capa/${CNJ_MANUAL}`,
      "demo-outro",
    );
    assert.strictEqual(outro.status, 404, "cross-office must not read Prado manual seed");

    const research = await pedir(base, "POST", "/api/research", undefined, {
      processNumber: CNJ_MANUAL,
    });
    assert.notStrictEqual(
      research.status,
      200,
      "public research must not return manual capa without office",
    );

    const registrado = await pedir(base, "POST", "/api/process/manual", "demo-socio", {
      processNumber: CNJ_NOVO,
      court: "TJPR",
      courtUnit: "2ª Vara",
      caseClass: "Procedimento Comum",
      organ: "2ª Vara",
      distributionDate: "2026-10-02",
      subjects: ["Teste"],
      parties: [{ papel: "Autor", nome: "A" }],
      thesis: "t",
      summary: "s",
    });
    assert.strictEqual(registrado.status, 200);
    assert.strictEqual(registrado.json.processo.processNumber, CNJ_NOVO);

    const audit = fs
      .readFileSync(AUDIT_OK, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    assert.ok(
      audit.some((r) => r.ferramenta === "process_manual_register" && r.decisao === "permitido"),
      "manual register must audit",
    );

    const prazo = await pedir(base, "POST", "/api/tools/prazo-cpc", "demo-socio", {
      startedAt: "2026-10-01",
      days: 2,
      calendar: "uteis",
    });
    assert.strictEqual(prazo.status, 200);
    assert.strictEqual(prazo.json.tool, "prazo_cpc");
    assert.strictEqual(prazo.json.dueAt, "2026-10-05");

    assert.strictEqual(
      (
        await pedir(base, "POST", "/api/tools/prazo-cpc", undefined, {
          startedAt: "2026-10-01",
          days: 2,
          calendar: "uteis",
        })
      ).status,
      401,
    );

    console.log(
      `prova-phase2: OK tools=${tools.length} live=${live.length} capa=${CNJ_MANUAL}`,
    );
  } finally {
    await app.close();
    try {
      fs.unlinkSync(AUDIT_OK);
    } catch {
      /* ignore */
    }
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
