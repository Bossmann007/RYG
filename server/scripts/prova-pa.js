/**
 * Phase 6.5: PA session gate + allowlisted tools + WhatsApp HITL.
 *
 *   pnpm --dir server run build
 *   pnpm --dir server run prova:pa
 */
require("../dist/register-aliases");
const assert = require("assert");
const os = require("os");
const path = require("path");

async function boot(envExtra = {}) {
  for (const [k, v] of Object.entries(envExtra)) {
    if (v === null) delete process.env[k];
    else process.env[k] = v;
  }
  process.env.GATEWAY_AUDIT_FILE = path.join(
    os.tmpdir(),
    `prova-pa-${process.pid}-${Date.now()}.jsonl`,
  );
  const { NestFactory } = require("@nestjs/core");
  const { AppModule } = require("../dist/app.module");
  const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
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
  return { status: resposta.status, json };
}

async function main() {
  delete process.env.OFFICE_PA_MODE;
  const off = await boot({});
  try {
    const blocked = await pedir(off.base, "POST", "/api/pa/session/start", "demo-socio", {});
    assert.strictEqual(blocked.status, 403, "PA off → no session");
  } finally {
    await off.app.close();
  }

  const on = await boot({ OFFICE_PA_MODE: "true" });
  try {
    await pedir(on.base, "POST", "/api/whatsapp/conectar-stub", null, {});

    const est = await pedir(on.base, "POST", "/api/pa/session/start", "demo-estagiario", {});
    assert.strictEqual(est.status, 403, "estagiario stays consult");

    const toolSemSessao = await pedir(on.base, "POST", "/api/pa/tools/checklist", "demo-socio", {});
    assert.strictEqual(toolSemSessao.status, 403, "consult user cannot call PA tools");

    const start = await pedir(on.base, "POST", "/api/pa/session/start", "demo-socio", {
      runtime: "linked-provider",
    });
    assert.strictEqual(start.status, 200);
    assert.ok(start.json.sessao.id.startsWith("pa_"));
    assert.strictEqual(start.json.sessao.delegatedBy, "u-001");

    const status = await pedir(on.base, "GET", "/api/pa/status", "demo-socio");
    assert.strictEqual(status.status, 200);
    assert.ok(!status.json.allowlist.includes("whatsapp_confirm"));

    const checklist = await pedir(on.base, "POST", "/api/pa/tools/checklist", "demo-socio", {});
    assert.strictEqual(checklist.status, 200);
    assert.strictEqual(checklist.json.actor, "pa_session");
    assert.ok(Array.isArray(checklist.json.items));

    const propose = await pedir(on.base, "POST", "/api/pa/tools/whatsapp_propose", "demo-socio", {
      para: "+5541999990000",
      texto: "lembrete pa hitl",
      classificationAck: true,
      classification: "interno",
    });
    assert.strictEqual(propose.status, 200);
    assert.strictEqual(propose.json.confirmacaoNecessaria, true);
    assert.strictEqual(
      propose.json.desafio,
      undefined,
      "desafio must stay server-side (model must not self-confirm)",
    );

    const toolConfirmGone = await pedir(
      on.base,
      "POST",
      "/api/pa/tools/whatsapp_confirm",
      "demo-socio",
      { confirmacaoHumana: true, desafio: "guess" },
    );
    assert.strictEqual(
      toolConfirmGone.status,
      404,
      "confirm must not be a model-facing PA tool",
    );

    const wrongHitl = await pedir(
      on.base,
      "POST",
      "/api/pa/hitl/whatsapp_confirm",
      "demo-socio",
      { desafio: "wrong-token" },
    );
    assert.ok(wrongHitl.status >= 400, "wrong desafio blocked");

    const challenge = await pedir(
      on.base,
      "GET",
      "/api/pa/hitl/whatsapp_challenge",
      "demo-socio",
    );
    assert.strictEqual(challenge.status, 200);
    assert.ok(typeof challenge.json.desafio === "string" && challenge.json.desafio.length > 8);

    const confirm = await pedir(
      on.base,
      "POST",
      "/api/pa/hitl/whatsapp_confirm",
      "demo-socio",
      { desafio: challenge.json.desafio },
    );
    assert.strictEqual(confirm.status, 200);
    assert.strictEqual(confirm.json.ok, true);
    assert.strictEqual(confirm.json.actor, "pa_session");

    console.log("prova-pa: OK");
  } finally {
    await on.app.close();
  }
}

main().catch((erro) => {
  console.error(`prova-pa failed: ${erro.message}`);
  process.exit(1);
});
