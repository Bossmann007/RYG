/**
 * Phase 3: personal vault deny-by-default + publish → hardvault ACL.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-wiki-vault.js
 *   node server/scripts/prova-wiki-vault.js
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

const AUDIT_OK = path.join(os.tmpdir(), `ryg-wiki-${process.pid}.jsonl`);

async function boot() {
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
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
    assert.strictEqual((await pedir(base, "GET", "/api/wiki/notes")).status, 401);

    const criada = await pedir(base, "POST", "/api/wiki/notes", "demo-socio", {
      title: "Memória confidencial do caso X",
      bodyMd: "PII do cliente: não vai para hardvault sem publish.\n\nTese: CDC.",
    });
    assert.strictEqual(criada.status, 200);
    const noteId = criada.json.note.id;
    assert.ok(noteId);

    const listaSocio = await pedir(base, "GET", "/api/wiki/notes", "demo-socio");
    assert.ok(listaSocio.json.notes.some((n) => n.id === noteId));

    const listaAdv = await pedir(base, "GET", "/api/wiki/notes", "demo-advogado");
    assert.strictEqual(listaAdv.status, 200);
    assert.ok(
      !listaAdv.json.notes.some((n) => n.id === noteId),
      "other user must not list personal note",
    );

    const leituraCruzada = await pedir(
      base,
      "GET",
      `/api/wiki/notes/${noteId}`,
      "demo-advogado",
    );
    assert.ok(
      leituraCruzada.status === 403 || leituraCruzada.status === 404,
      "cross-user personal read must fail",
    );

    const buscaAntes = await pedir(
      base,
      "GET",
      "/api/wiki/hardvault/search?q=Mem%C3%B3ria",
      "demo-advogado",
    );
    assert.strictEqual(buscaAntes.status, 200);
    assert.ok(
      !buscaAntes.json.hits.some((h) => String(h.title).includes("Memória")),
      "unpublished personal must not appear in hardvault",
    );

    const semConfirm = await pedir(
      base,
      "POST",
      `/api/wiki/notes/${noteId}/publish`,
      "demo-socio",
      { confirm: false },
    );
    assert.strictEqual(semConfirm.status, 400);

    const pub = await pedir(
      base,
      "POST",
      `/api/wiki/notes/${noteId}/publish`,
      "demo-socio",
      { confirm: true },
    );
    assert.strictEqual(pub.status, 200);
    assert.ok(pub.json.docId);
    assert.ok(pub.json.snippet);
    assert.ok(String(pub.json.snippet).length <= 512);

    const buscaDepois = await pedir(
      base,
      "GET",
      "/api/wiki/hardvault/search?q=Mem%C3%B3ria",
      "demo-advogado",
    );
    assert.strictEqual(buscaDepois.status, 200);
    assert.ok(buscaDepois.json.hits.some((h) => h.id === pub.json.docId));
    const hit = buscaDepois.json.hits.find((h) => h.id === pub.json.docId);
    assert.ok(hit.snippet);
    assert.ok(!hit.bodyMd, "search must not dump full body");

    const outroOffice = await pedir(
      base,
      "GET",
      "/api/wiki/hardvault/search?q=Mem%C3%B3ria",
      "demo-outro",
    );
    assert.strictEqual(outroOffice.status, 200);
    assert.ok(!outroOffice.json.hits.some((h) => h.id === pub.json.docId));

    const pack = await pedir(base, "GET", "/api/wiki/pack?casoId=1", "demo-socio");
    assert.strictEqual(pack.status, 200);
    assert.strictEqual(pack.json.mode, "minimal");
    assert.strictEqual(pack.json.requerSafeDto, true);
    assert.ok(Array.isArray(pack.json.items));
    assert.ok(pack.json.items.every((i) => i.snippet && !i.bodyMd));

    console.log("prova-wiki-vault: OK");
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
