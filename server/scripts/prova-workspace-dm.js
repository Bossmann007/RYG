/**
 * Proves authenticated workspace DMs + mentions, and locked per-case chat.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-chat.js
 *   node server/scripts/apply-workspace-dm.js
 *   node server/scripts/prova-workspace-dm.js
 */
require("../dist/register-aliases");
const assert = require("assert");
const crypto = require("crypto");
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

const AUDIT_OK = path.join(os.tmpdir(), `ryg-workspace-dm-${process.pid}.jsonl`);

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
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }
  fs.writeFileSync(AUDIT_OK, "");

  const { app, base } = await boot();
  const pool = mysql.createPool(opcoesPool(env));
  try {
    assert.strictEqual(
      (await pedir(base, "GET", "/api/workspace/dms")).status,
      401,
      "workspace dms without token must be 401",
    );
    assert.strictEqual(
      (await pedir(base, "GET", "/api/processos/1/chat")).status,
      401,
      "case chat without token must be 401",
    );

    const lista = await pedir(base, "GET", "/api/workspace/dms", "demo-socio");
    assert.strictEqual(lista.status, 200);
    assert.strictEqual(lista.json.zone, "internal");
    assert.ok(Array.isArray(lista.json.dms));
    assert.ok(lista.json.dms.length >= 1, "seed DM must appear for socio");

    const aberto = await pedir(base, "POST", "/api/workspace/dms", "demo-socio", {
      peerUserId: "u-002",
    });
    assert.strictEqual(aberto.status, 200);
    assert.ok(aberto.json.channelId);
    const channelId = aberto.json.channelId;

    const cruzado = await pedir(base, "POST", "/api/workspace/dms", "demo-outro", {
      peerUserId: "u-002",
    });
    assert.strictEqual(cruzado.status, 404, "cross-office peer must 404");

    const msgId = crypto.randomUUID();
    const enviada = await pedir(
      base,
      "POST",
      `/api/workspace/dms/${channelId}/messages`,
      "demo-socio",
      {
        id: msgId,
        mensagem: "Olá @Dr. Rafael Nunes, precisamos do prazo.",
      },
    );
    assert.strictEqual(enviada.status, 200);
    assert.strictEqual(enviada.json.criado, true);
    assert.deepStrictEqual(enviada.json.mencoes, ["u-002"]);
    assert.strictEqual(enviada.json.mensagem.propria, true);

    const doPeer = await pedir(
      base,
      "GET",
      `/api/workspace/dms/${channelId}/messages`,
      "demo-advogado",
    );
    assert.strictEqual(doPeer.status, 200);
    assert.ok(doPeer.json.mensagens.some((m) => m.id === msgId));

    const [[mencao]] = await pool.query(
      `SELECT mentioned_user_id FROM workspace_mentions WHERE message_id = ? LIMIT 1`,
      [msgId],
    );
    assert.ok(mencao);
    assert.strictEqual(String(mencao.mentioned_user_id), "u-002");

    const chatNegado = await pedir(base, "GET", "/api/processos/1/chat", "demo-advogado");
    assert.strictEqual(
      chatNegado.status,
      403,
      "non-member case chat must be 403 when capa exists",
    );

    const chatOk = await pedir(base, "GET", "/api/processos/1/chat", "demo-socio");
    assert.strictEqual(chatOk.status, 200);
    assert.strictEqual(chatOk.json.zone, "internal");

    console.log("prova-workspace-dm: OK");
  } finally {
    await pool.end();
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
