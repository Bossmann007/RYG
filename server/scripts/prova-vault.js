/**
 * Proves the office secret vault and the transfer-register stub.
 *
 *   server/node_modules/.bin/nest build
 *   HUB_VAULT_KEY is a passphrase. The proof sets it. Do not commit a real value.
 *   node server/scripts/prova-vault.js
 *
 * Owner put/get is 200. Another user or office is 404.
 * Without HUB_VAULT_KEY the put is 503 and nothing is stored.
 * The audit JSONL must not contain the secret.
 * A transfer note is an audit line with motivo transfer.
 * A broken audit file is 503 and the secret is not stored.
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

const AUDIT_OK = path.join(os.tmpdir(), `ryg-vault-${process.pid}.jsonl`);
const AUDIT_QUEBRADO = "/dev/null/auditoria.jsonl";
const CHAVE = "prova-vault-envelope";
const NOME = "provider_token";
const DESTINO = "linked-provider:outside-br";

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
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const resposta = await fetch(base + caminho, {
    method,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { bruto: texto };
  }
  console.log(`${method} ${caminho} token=${token || "-"} -> ${resposta.status}`);
  return { status: resposta.status, json, texto };
}

function linhasAuditoria() {
  if (!fs.existsSync(AUDIT_OK)) return [];
  return fs
    .readFileSync(AUDIT_OK, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linha) => JSON.parse(linha));
}

async function main() {
  const segredo = `vault-secret-${process.pid}-do-not-log`;
  delete process.env.HUB_NOW_MS;
  delete process.env.HUB_IDLE_TIMEOUT_MS;

  delete process.env.HUB_VAULT_KEY;
  const semChave = await boot();
  try {
    const recusado = await pedir(semChave.base, "POST", "/api/vault/secret", "demo-socio", {
      name: NOME,
      value: segredo,
    });
    assert.strictEqual(recusado.status, 503, "missing vault key must be 503");
    assert.ok(!recusado.texto.includes(segredo), "503 must not echo the secret");
  } finally {
    await semChave.app.close();
  }

  process.env.HUB_VAULT_KEY = CHAVE;
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;
  fs.writeFileSync(AUDIT_OK, "");
  const ligado = await boot();
  try {
    const posto = await pedir(ligado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: NOME,
      value: segredo,
    });
    assert.strictEqual(posto.status, 200, "owner put must be 200");
    assert.strictEqual(posto.json.ok, true);
    assert.ok(!posto.texto.includes(segredo), "put response must not echo the secret");

    const lido = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-socio",
    );
    assert.strictEqual(lido.status, 200, "owner get must be 200");
    assert.strictEqual(lido.json.value, segredo);

    const outroUser = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-advogado",
    );
    assert.strictEqual(outroUser.status, 404, "other user must be 404");
    assert.ok(!outroUser.texto.includes(segredo));

    const outroOffice = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-outro",
    );
    assert.strictEqual(outroOffice.status, 404, "other office must be 404");

    const lista = await pedir(ligado.base, "GET", "/api/casos", "demo-socio");
    assert.strictEqual(lista.status, 200);
    assert.ok(!lista.texto.includes(segredo), "case list must not contain the secret");

    const nota = await pedir(ligado.base, "POST", "/api/transfer/note", "demo-socio", {
      destination: DESTINO,
    });
    assert.strictEqual(nota.status, 200, "transfer note must be 200");
    assert.ok(!nota.texto.includes(segredo));

    const bruto = fs.readFileSync(AUDIT_OK, "utf8");
    assert.ok(!bruto.includes(segredo), "audit file must redact the secret");
    const auditoria = linhasAuditoria();
    assert.ok(
      auditoria.some(
        (linha) =>
          linha.ferramenta === "vault_put" &&
          linha.motivo === "vault_put" &&
          linha.argumentos &&
          linha.argumentos.name === NOME &&
          !JSON.stringify(linha.argumentos).includes(segredo),
      ),
      "vault put must be audited without the secret",
    );
    assert.ok(
      auditoria.some(
        (linha) =>
          linha.motivo === "transfer" &&
          linha.argumentos &&
          linha.argumentos.destination === DESTINO,
      ),
      "transfer note must be audited",
    );
  } finally {
    await ligado.app.close();
  }

  process.env.HUB_VAULT_KEY = CHAVE;
  process.env.GATEWAY_AUDIT_FILE = AUDIT_QUEBRADO;
  const quebrado = await boot();
  try {
    const falha = await pedir(quebrado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: NOME,
      value: segredo,
    });
    assert.strictEqual(falha.status, 503, "audit failure must be 503");
    assert.ok(!falha.texto.includes(segredo));
    const depois = await pedir(
      quebrado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-socio",
    );
    assert.strictEqual(depois.status, 404, "failed audit must not persist the secret");
  } finally {
    await quebrado.app.close();
  }

  console.log("prova-vault: OK");
}

main().catch((erro) => {
  console.error(`prova-vault failed: ${erro.message}`);
  process.exit(1);
});
