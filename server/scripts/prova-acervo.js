/**
 * HTTP smoke for internal clientes and peticoes routes.
 * Run after `pnpm run build` in server/:
 *
 *   node scripts/prova-acervo.js
 */
require("../dist/register-aliases");

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { ValidationPipe } = require("../dist/common/pipes/validation.pipe");
const { CLIENTE_OLIVEIRA_ID, CLIENTE_SOUZA_ID } = require("../dist/fixtures/clientes");
const { NUMERO_PROCESSO_SOUZA } = require("../dist/fixtures/peticoes");
const { NUMERO_PROCESSO_DEMO } = require("../dist/fixtures/processos");

const PII = [
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
  /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/,
  /\b\d{4,6}-\d\b/,
];
const CAMPOS_PROIBIDOS = ["cpf", "cnpj", "rg", "banco", "conta", "agencia", "email", "telefone", "endereco", "pix"];

let falhas = 0;

function ok(titulo, detalhe) {
  console.log(`  PASSOU  ${titulo}${detalhe ? ` — ${detalhe}` : ""}`);
}

function erro(titulo, detalhe) {
  falhas += 1;
  console.log(`  FALHOU  ${titulo}${detalhe ? ` — ${detalhe}` : ""}`);
}

function semPii(titulo, corpo) {
  const texto = JSON.stringify(corpo);
  const vazou = PII.filter((padrao) => padrao.test(texto));
  const chaves = coletarChaves(corpo).filter((chave) => CAMPOS_PROIBIDOS.includes(chave));

  if (vazou.length || chaves.length) {
    erro(titulo, `pii=${vazou} chaves=${chaves.join(",")}`);
    return;
  }

  ok(titulo);
}

function coletarChaves(valor, acc = []) {
  if (!valor || typeof valor !== "object") {
    return acc;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      coletarChaves(item, acc);
    }
    return acc;
  }

  for (const [chave, item] of Object.entries(valor)) {
    acc.push(chave);
    coletarChaves(item, acc);
  }

  return acc;
}

async function requisitar(base, metodo, caminho, corpo) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: corpo ? { "content-type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  const json = texto ? JSON.parse(texto) : null;
  return { status: resposta.status, json };
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(ValidationPipe);
  await app.listen(0);

  const endereco = app.getHttpServer().address();
  const base = `http://127.0.0.1:${endereco.port}`;

  console.log("\nProva HTTP do acervo interno (clientes / petições)\n");

  try {
    const listaClientes = await requisitar(base, "GET", "/api/clientes");

    if (
      listaClientes.status === 200 &&
      listaClientes.json.zone === "internal" &&
      listaClientes.json.clientes.some((item) => item.id === CLIENTE_OLIVEIRA_ID && item.displayName === "A. S. Oliveira") &&
      listaClientes.json.clientes.some((item) => item.id === CLIENTE_SOUZA_ID) &&
      listaClientes.json.clientes.every((item) => item.notes === undefined)
    ) {
      ok("GET /api/clientes lista minimizada", "zone=internal, sem notes");
    } else {
      erro("GET /api/clientes lista minimizada", JSON.stringify(listaClientes.json));
    }

    semPii("lista de clientes sem CPF/banco", listaClientes.json);

    const detalhe = await requisitar(base, "GET", `/api/clientes/${CLIENTE_OLIVEIRA_ID}`);

    if (detalhe.status === 200 && detalhe.json.cliente.displayName === "A. S. Oliveira" && detalhe.json.zone === "internal") {
      ok("GET /api/clientes/:id", detalhe.json.cliente.id);
    } else {
      erro("GET /api/clientes/:id", JSON.stringify(detalhe.json));
    }

    semPii("detalhe de cliente sem CPF/banco", detalhe.json);

    const criado = await requisitar(base, "POST", "/api/clientes", {
      displayName: "Cliente Fictício Demo",
      kind: "pessoa_juridica",
      cpf: "390.533.447-05",
      notes: "Escritório de teste sintético.",
    });

    if (
      criado.status === 201 &&
      criado.json.cliente.displayName === "Cliente Fictício Demo" &&
      criado.json.cliente.kind === "pessoa_juridica" &&
      criado.json.cliente.cpf === undefined &&
      criado.json.cliente.id.startsWith("cli_")
    ) {
      ok("POST /api/clientes ignora cpf extra", criado.json.cliente.id);
    } else {
      erro("POST /api/clientes ignora cpf extra", `${criado.status} ${JSON.stringify(criado.json)}`);
    }

    semPii("cliente criado sem CPF persistido", criado.json);

    const patch = await requisitar(base, "PATCH", `/api/clientes/${criado.json.cliente.id}`, {
      status: "encerrado",
    });

    if (patch.status === 200 && patch.json.cliente.status === "encerrado") {
      ok("PATCH /api/clientes/:id", "status=encerrado");
    } else {
      erro("PATCH /api/clientes/:id", `${patch.status} ${JSON.stringify(patch.json)}`);
    }

    const peticoesSouza = await requisitar(
      base,
      "GET",
      `/api/peticoes?clienteId=${CLIENTE_SOUZA_ID}&processNumber=${NUMERO_PROCESSO_SOUZA}`
    );

    if (
      peticoesSouza.status === 200 &&
      peticoesSouza.json.zone === "internal" &&
      peticoesSouza.json.peticoes.length === 2 &&
      peticoesSouza.json.peticoes.every((item) => item.clienteId === CLIENTE_SOUZA_ID && item.summary === undefined)
    ) {
      ok("GET /api/peticoes filtra por cliente e processo", "2 peças, sem summary");
    } else {
      erro("GET /api/peticoes filtra por cliente e processo", JSON.stringify(peticoesSouza.json));
    }

    const peca = await requisitar(base, "GET", "/api/peticoes/pet_oliveira_inicial");

    if (
      peca.status === 200 &&
      peca.json.peticao.processNumber === NUMERO_PROCESSO_DEMO &&
      peca.json.peticao.summary.includes("Tarifa de cadastro")
    ) {
      ok("GET /api/peticoes/:id relaciona processo demo", peca.json.peticao.processNumber);
    } else {
      erro("GET /api/peticoes/:id relaciona processo demo", JSON.stringify(peca.json));
    }

    semPii("petição sem CPF/banco", peca.json);

    const peticaoNova = await requisitar(base, "POST", "/api/peticoes", {
      clienteId: criado.json.cliente.id,
      processNumber: "100234512202380260100",
      title: "Manifestação de prova",
      kind: "manifestacao",
      summary: "Junta planilha sintética de recálculo das tarifas.",
    });

    if (
      peticaoNova.status === 201 &&
      peticaoNova.json.peticao.processNumber === NUMERO_PROCESSO_DEMO &&
      peticaoNova.json.peticao.clienteId === criado.json.cliente.id
    ) {
      ok("POST /api/peticoes normaliza CNJ e liga cliente", peticaoNova.json.peticao.id);
    } else {
      erro("POST /api/peticoes normaliza CNJ e liga cliente", `${peticaoNova.status} ${JSON.stringify(peticaoNova.json)}`);
    }

    const orfao = await requisitar(base, "POST", "/api/peticoes", {
      clienteId: "cli_inexistente",
      title: "Peça órfã",
      kind: "inicial",
      summary: "Não deve persistir sem cliente válido.",
    });

    if (orfao.status === 400) {
      ok("POST /api/peticoes recusa cliente inexistente");
    } else {
      erro("POST /api/peticoes recusa cliente inexistente", `${orfao.status}`);
    }

    const cnjRuim = await requisitar(base, "POST", "/api/peticoes", {
      clienteId: CLIENTE_OLIVEIRA_ID,
      processNumber: "123",
      title: "Peça com CNJ inválido",
      kind: "inicial",
      summary: "Número curto não é processo CNJ.",
    });

    if (cnjRuim.status === 400) {
      ok("POST /api/peticoes recusa CNJ inválido");
    } else {
      erro("POST /api/peticoes recusa CNJ inválido", `${cnjRuim.status}`);
    }

    const apagaPeca = await requisitar(base, "DELETE", `/api/peticoes/${peticaoNova.json.peticao.id}`);

    if (apagaPeca.status === 204) {
      ok("DELETE /api/peticoes/:id");
    } else {
      erro("DELETE /api/peticoes/:id", `${apagaPeca.status}`);
    }

    const apagaCliente = await requisitar(base, "DELETE", `/api/clientes/${criado.json.cliente.id}`);

    if (apagaCliente.status === 204) {
      ok("DELETE /api/clientes/:id");
    } else {
      erro("DELETE /api/clientes/:id", `${apagaCliente.status}`);
    }

    const sumico = await requisitar(base, "GET", `/api/clientes/${criado.json.cliente.id}`);

    if (sumico.status === 404) {
      ok("GET cliente removido retorna 404");
    } else {
      erro("GET cliente removido retorna 404", `${sumico.status}`);
    }
  } finally {
    await app.close();
  }

  if (falhas) {
    console.log(`\n${falhas} falha(s) na prova do acervo.\n`);
    process.exit(1);
  }

  console.log("\nProva do acervo concluída sem falhas.\n");
}

main().catch((erroFatal) => {
  console.error(erroFatal);
  process.exit(1);
});
