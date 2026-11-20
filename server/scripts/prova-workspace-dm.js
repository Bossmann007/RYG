/**
 * Proves workspace DMs over real HTTP. Applies the migration when tables
 * are absent. Keeps per-case chat out of scope.
 *
 *   server/node_modules/.bin/nest build
 *   node server/scripts/prova-workspace-dm.js
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
const TABELAS = [
  "workspace_threads",
  "workspace_thread_members",
  "workspace_messages",
  "workspace_mentions",
];

async function garantirTabelas(pool) {
  const [rows] = await pool.query(
    `SELECT table_name AS nome FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN (?, ?, ?, ?)`,
    TABELAS,
  );
  const presentes = new Set(rows.map((linha) => String(linha.nome)));
  if (TABELAS.every((t) => presentes.has(t))) {
    console.log("workspace dm tables: present");
    return;
  }

  const sql = fs.readFileSync(
    path.join(__dirname, "../migrations/20260928_workspace_dm.sql"),
    "utf8",
  );
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
  console.log("workspace dm tables: created (IF NOT EXISTS)");
}

async function limparParPrado(pool) {
  const [pares] = await pool.query(
    `SELECT t.id AS id
       FROM workspace_threads t
       INNER JOIN workspace_thread_members a
         ON a.thread_id = t.id AND a.office_id = t.office_id AND a.user_id = 'u-001'
       INNER JOIN workspace_thread_members b
         ON b.thread_id = t.id AND b.office_id = t.office_id AND b.user_id = 'u-002'
      WHERE t.office_id = ?`,
    [OFFICE_PRADO],
  );
  for (const linha of pares) {
    const id = String(linha.id);
    await pool.query("DELETE FROM workspace_mentions WHERE office_id = ? AND thread_id = ?", [
      OFFICE_PRADO,
      id,
    ]);
    await pool.query("DELETE FROM workspace_messages WHERE office_id = ? AND thread_id = ?", [
      OFFICE_PRADO,
      id,
    ]);
    await pool.query(
      "DELETE FROM workspace_thread_members WHERE office_id = ? AND thread_id = ?",
      [OFFICE_PRADO, id],
    );
    await pool.query("DELETE FROM workspace_threads WHERE office_id = ? AND id = ?", [
      OFFICE_PRADO,
      id,
    ]);
  }
  if (pares.length) {
    console.log(`workspace dm cleanup: removed ${pares.length} prior pair thread(s)`);
  }
}

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    await garantirTabelas(pool);
    await limparParPrado(pool);
  } finally {
    await pool.end();
  }

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const req = async (metodo, caminho, token, corpo) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (corpo !== undefined) headers["Content-Type"] = "application/json";
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    const json = await resposta.json().catch(() => ({}));
    console.log(
      `${metodo} ${caminho} token=${token || "-"} -> ${resposta.status}${
        json.zone ? ` zone=${json.zone}` : ""
      }${json.threadId ? ` threadId=${json.threadId}` : ""}`,
    );
    return { status: resposta.status, corpo: json };
  };

  try {
    assert.strictEqual(
      (await req("POST", "/api/workspace/dms", null, { peerUserId: "u-002" })).status,
      401,
      "no token must be 401",
    );

    assert.strictEqual(
      (await req("POST", "/api/workspace/dms", "demo-socio", { peerUserId: "u-099" })).status,
      404,
      "other-office peer must be 404",
    );

    const aberto = await req("POST", "/api/workspace/dms", "demo-socio", {
      peerUserId: "u-002",
    });
    assert.strictEqual(aberto.status, 201, "first open must be 201");
    assert.ok(aberto.corpo.threadId, "must return threadId");
    const threadId = String(aberto.corpo.threadId);

    const deNovo = await req("POST", "/api/workspace/dms", "demo-socio", {
      peerUserId: "u-002",
    });
    assert.strictEqual(deNovo.status, 200, "second open must be 200");
    assert.strictEqual(String(deNovo.corpo.threadId), threadId, "same pair must reuse thread");

    const lista = await req("GET", "/api/workspace/dms", "demo-advogado");
    assert.strictEqual(lista.status, 200, "member list must be 200");
    assert.strictEqual(lista.corpo.zone, "internal");
    assert.ok(
      Array.isArray(lista.corpo.threads) &&
        lista.corpo.threads.some((t) => String(t.id) === threadId),
      "demo-advogado list must include the thread",
    );

    assert.strictEqual(
      (await req("GET", `/api/workspace/dms/${encodeURIComponent(threadId)}`, "demo-outro"))
        .status,
      404,
      "other office get must be 404",
    );

    const enviada = await req(
      "POST",
      `/api/workspace/dms/${encodeURIComponent(threadId)}/messages`,
      "demo-socio",
      { body: "ola @u-002" },
    );
    assert.ok(
      enviada.status === 201 || enviada.status === 200,
      `send must be 2xx, got ${enviada.status}`,
    );
    assert.strictEqual(enviada.corpo.zone, "internal");
    assert.ok(enviada.corpo.messageId, "must return messageId");
    assert.deepStrictEqual(enviada.corpo.mentions, ["u-002"], "must mention u-002");

    const mensagens = await req(
      "GET",
      `/api/workspace/dms/${encodeURIComponent(threadId)}`,
      "demo-advogado",
    );
    assert.strictEqual(mensagens.status, 200, "peer get messages must be 200");
    assert.ok(
      Array.isArray(mensagens.corpo.messages) &&
        mensagens.corpo.messages.some((m) => String(m.body) === "ola @u-002"),
      "peer must see message body",
    );

    console.log("prova-workspace-dm: OK");
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-workspace-dm failed: ${erro.message}`);
  process.exit(1);
});
