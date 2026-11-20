/**
 * Proves per-case chat requires Bearer + office_id on processos, while the
 * CHAT_DEMO_ENABLED loopback gate still denies when disabled.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-chat-auth.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const assert = require("assert");
const mysql = require("mysql2/promise");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");

const OFFICE_PRADO = "prado-advogados";

async function garantirTabelaChat(pool) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'chat'`,
  );
  if (Number(rows[0].n) > 0) {
    console.log("chat table: present");
    return;
  }

  const sql = fs
    .readFileSync(path.join(__dirname, "../migrations/20260913_create_chat.sql"), "utf8")
    .replace(/^CREATE TABLE chat\b/m, "CREATE TABLE IF NOT EXISTS chat")
    // Live processos.id is bigint; the migration still says INT.
    .replace(/processo_id INT NOT NULL/, "processo_id BIGINT NOT NULL");
  const comandos = sql
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((comando) => comando.trim())
    .filter(Boolean);

  for (const comando of comandos) {
    await pool.query(comando);
  }
  console.log("chat table: created (IF NOT EXISTS)");
}

async function processoPrado(pool) {
  const [linhas] = await pool.query(
    "SELECT CAST(id AS CHAR) AS id FROM processos WHERE office_id = ? LIMIT 1",
    [OFFICE_PRADO],
  );
  if (!linhas.length) {
    throw new Error(`no processos row for ${OFFICE_PRADO}`);
  }
  return String(linhas[0].id);
}

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  let processoId;
  try {
    await garantirTabelaChat(pool);
    processoId = await processoPrado(pool);
  } finally {
    await pool.end();
  }

  if (process.env.NODE_ENV === "production") {
    process.env.NODE_ENV = "development";
  }

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  // Bind + fetch on localhost so Host is loopback and chat-access allows the demo gate.
  await app.listen(0, "localhost");
  const port = app.getHttpServer().address().port;
  const base = `http://localhost:${port}`;
  const caminho = `/api/processos/${encodeURIComponent(processoId)}/chat`;

  const get = async (token, chatDemo) => {
    const anterior = process.env.CHAT_DEMO_ENABLED;
    process.env.CHAT_DEMO_ENABLED = chatDemo;
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      // No x-forwarded-* — demo gate rejects proxied hosts.
      const resposta = await fetch(base + caminho, { headers });
      const corpo = await resposta.json().catch(() => ({}));
      console.log(
        `GET ${caminho} token=${token || "-"} CHAT_DEMO_ENABLED=${chatDemo} -> ${resposta.status}${
          corpo.zone ? ` zone=${corpo.zone}` : ""
        }`,
      );
      return { status: resposta.status, corpo };
    } finally {
      if (anterior === undefined) {
        delete process.env.CHAT_DEMO_ENABLED;
      } else {
        process.env.CHAT_DEMO_ENABLED = anterior;
      }
    }
  };

  try {
    assert.strictEqual((await get(null, "true")).status, 401, "no token must be 401");

    assert.strictEqual(
      (await get("demo-socio", "false")).status,
      403,
      "CHAT_DEMO_ENABLED=false must be 403",
    );

    assert.strictEqual(
      (await get("demo-outro", "true")).status,
      404,
      "other office must be 404",
    );

    const proprio = await get("demo-socio", "true");
    assert.strictEqual(proprio.status, 200, "own office chat must be 200");
    assert.strictEqual(proprio.corpo.zone, "internal", "own office chat must be zone internal");
    assert.ok(Array.isArray(proprio.corpo.mensagens), "response must include mensagens");

    console.log("prova-chat-auth: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-chat-auth failed: ${erro.message}`);
  process.exit(1);
});
