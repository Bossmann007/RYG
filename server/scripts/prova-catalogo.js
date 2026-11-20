/**
 * Proves GET /api/catalogo returns the banking Backstage list, the prazo CPC
 * tool endpoint, the two unconnected ProcessSource stubs, and the original five items.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-catalogo.js
 */
require("../dist/register-aliases");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

const IDS_ANCHOR = [
  "prompt-capa-bancario",
  "prompt-checklist-revisao",
  "skill-cite-or-silent",
  "mcp-office-export",
  "tool-enviar-whatsapp",
];

const IDS_FUTUROS = ["tool-datajud", "tool-djen"];

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  try {
    const resposta = await fetch(`${base}/api/catalogo`);
    const corpo = await resposta.json().catch(() => ({}));
    console.log(`GET /api/catalogo -> ${resposta.status} n=${Array.isArray(corpo.itens) ? corpo.itens.length : "?"}`);

    assert.strictEqual(resposta.status, 200, "catalogo must be 200 (@Public)");
    assert.ok(Array.isArray(corpo.itens), "corpo.itens must be an array");

    const porId = new Map(corpo.itens.map((item) => [item.id, item]));

    for (const id of IDS_ANCHOR) {
      assert.ok(porId.has(id), `anchor id ${id} must remain present`);
    }

    const prazo = porId.get("tool-prazo-cpc");
    assert.ok(prazo, "tool-prazo-cpc must exist");
    assert.strictEqual(prazo.kind, "tool");
    assert.strictEqual(prazo.endpoint, "/api/tools/prazo-cpc");

    for (const id of IDS_FUTUROS) {
      const item = porId.get(id);
      assert.ok(item, `future tool ${id} must exist`);
      assert.strictEqual(item.kind, "tool", `${id} kind must be tool`);
      assert.strictEqual(item.area, "bancario", `${id} area must be bancario`);
      assert.strictEqual(item.requerSafeDto, false, `${id} requerSafeDto must be false`);
      assert.strictEqual(
        item.endpoint,
        undefined,
        `${id} must not have an endpoint yet`,
      );
    }

    const local = porId.get("runtime-office-hosted");
    assert.ok(local, "office-hosted runtime must exist");
    assert.strictEqual(local.endpoint, "/api/rag/consult");
    assert.ok(!String(local.descricao).toLowerCase().includes("byoai"));
    const ligado = porId.get("runtime-linked-provider");
    assert.ok(ligado, "linked provider must exist");
    assert.strictEqual(ligado.requerSafeDto, true);
    assert.strictEqual(ligado.endpoint, undefined);
    assert.ok(String(ligado.descricao).includes("DPA"));
    assert.ok(!JSON.stringify(corpo).toLowerCase().includes("byoai"));
    console.log("assert: office-hosted and linked provider are catalog entries, linked has no endpoint");

    console.log("prova-catalogo: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-catalogo failed: ${erro.message}`);
  process.exit(1);
});
