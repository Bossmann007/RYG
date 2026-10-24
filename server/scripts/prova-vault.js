/**
 * Proves the in-memory secrets vault and the transfer-register stub.
 *
 *   pnpm --dir server run build
 *   node server/scripts/prova-vault.js
 *
 * Store and read stay on the caller's bearer. Another user or office gets 404.
 * The plaintext is absent from the POST body, the casos response, and the audit file.
 * A missing HUB_VAULT_KEY or an unreadable audit file is 503 and stores nothing.
 * POST /api/transfer/note appends motivo transfer and the logical destino.
 */
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const AUDIT_OK = path.join(os.tmpdir(), `ryg-vault-${process.pid}.jsonl`);
const AUDIT_QUEBRADO = "/dev/null/auditoria.jsonl";
const CHAVE = "prova-vault-passphrase";
const NOME = "provider-token";
const SEGREDO = "segredo-prova-7c2e9a";
const NOME_RECUSADO = "provider-token-recusado";
const SEGREDO_RECUSADO = "segredo-recusado-b1044e";
const NOME_AUDIT = "provider-token-audit";
const SEGREDO_AUDIT = "segredo-audit-c88d21";
const DESTINO = "mcp-linked-provider";
const MOTIVO_CORPO = "nao-e-o-motivo-de-auditoria";

process.env.HUB_VAULT_KEY = CHAVE;
process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;

require("../dist/register-aliases");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");

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
  fs.writeFileSync(AUDIT_OK, "");
  process.env.HUB_VAULT_KEY = CHAVE;
  process.env.GATEWAY_AUDIT_FILE = AUDIT_OK;

  const ligado = await boot();
  try {
    const semToken = await pedir(ligado.base, "POST", "/api/vault/secret", undefined, {
      name: NOME,
      value: SEGREDO,
    });
    assert.strictEqual(semToken.status, 401, "vault without token must be 401");

    const gravado = await pedir(ligado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: NOME,
      value: SEGREDO,
    });
    assert.strictEqual(gravado.status, 200, "owner store must succeed");
    assert.strictEqual(gravado.json.stored, true);
    assert.strictEqual(gravado.json.name, NOME);
    assert.strictEqual(gravado.json.value, undefined, "POST must not return the secret");
    assert.ok(!gravado.texto.includes(SEGREDO), "POST body must not contain the secret");

    const lido = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-socio",
    );
    assert.strictEqual(lido.status, 200, "owner read must succeed");
    assert.strictEqual(lido.json.value, SEGREDO, "owner read must return the stored secret");

    const outroUser = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-advogado",
    );
    assert.strictEqual(outroUser.status, 404, "same office, other user must be 404");
    assert.ok(!outroUser.texto.includes(SEGREDO));

    const outroOffice = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-outro",
    );
    assert.strictEqual(outroOffice.status, 404, "other office must be 404");
    assert.ok(!outroOffice.texto.includes(SEGREDO));

    const casos = await pedir(ligado.base, "GET", "/api/casos", "demo-socio");
    assert.ok(!casos.texto.includes(SEGREDO), "casos response must not contain the secret");

    const nota = await pedir(ligado.base, "POST", "/api/transfer/note", "demo-socio", {
      destino: DESTINO,
      motivo: MOTIVO_CORPO,
    });
    assert.strictEqual(nota.status, 200, "transfer note must succeed");
    assert.strictEqual(nota.json.registrado, true);
    assert.strictEqual(nota.json.destino, DESTINO);
    assert.ok(!nota.texto.includes(SEGREDO));

    const auditoria = linhasAuditoria();
    const ficheiro = fs.readFileSync(AUDIT_OK, "utf8");
    assert.ok(!ficheiro.includes(SEGREDO), "audit file must not contain the secret");
    assert.ok(
      auditoria.some(
        (linha) => linha.ferramenta === "vault_secret" && linha.argumentos && linha.argumentos.name === NOME,
      ),
      "store must be audited without the plaintext",
    );
    assert.ok(
      auditoria.some(
        (linha) =>
          linha.motivo === "transfer" &&
          linha.argumentos &&
          linha.argumentos.destino === DESTINO,
      ),
      "transfer note must audit motivo transfer and the logical destino",
    );

    delete process.env.HUB_VAULT_KEY;
    const semChave = await pedir(ligado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: NOME_RECUSADO,
      value: SEGREDO_RECUSADO,
    });
    assert.strictEqual(semChave.status, 503, "missing vault key must be 503");
    assert.ok(!semChave.texto.includes(SEGREDO_RECUSADO));

    process.env.HUB_VAULT_KEY = CHAVE;
    const naoGravado = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME_RECUSADO)}`,
      "demo-socio",
    );
    assert.strictEqual(naoGravado.status, 404, "a refused store must not be readable later");
    const aindaLa = await pedir(
      ligado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME)}`,
      "demo-socio",
    );
    assert.strictEqual(aindaLa.json.value, SEGREDO, "a missing key must not drop an earlier secret");
    const ficheiroDepois = fs.readFileSync(AUDIT_OK, "utf8");
    assert.ok(!ficheiroDepois.includes(SEGREDO_RECUSADO), "a refused store must not audit the plaintext");
  } finally {
    await ligado.app.close();
  }

  process.env.HUB_VAULT_KEY = CHAVE;
  process.env.GATEWAY_AUDIT_FILE = AUDIT_QUEBRADO;
  const quebrado = await boot();
  try {
    const semAudit = await pedir(quebrado.base, "POST", "/api/vault/secret", "demo-socio", {
      name: NOME_AUDIT,
      value: SEGREDO_AUDIT,
    });
    assert.strictEqual(semAudit.status, 503, "unreadable audit file must be 503");
    assert.ok(!semAudit.texto.includes(SEGREDO_AUDIT));
    const sumiu = await pedir(
      quebrado.base,
      "GET",
      `/api/vault/secret?name=${encodeURIComponent(NOME_AUDIT)}`,
      "demo-socio",
    );
    assert.strictEqual(sumiu.status, 404, "audit failure must not store the secret");
    assert.ok(!sumiu.texto.includes(SEGREDO_AUDIT));
  } finally {
    await quebrado.app.close();
  }

  console.log("prova-vault: OK");
}

main().catch((erro) => {
  console.error(`prova-vault failed: ${erro.message}`);
  process.exit(1);
});
