/**
 * HTTP smoke for internal clientes, peticoes, contratos, decisoes and modelos.
 * Run after `pnpm run build` in server/:
 *
 *   node scripts/prova-acervo.js
 *   npm --prefix server run prova:acervo
 */
require("../dist/register-aliases");

const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { ValidationPipe } = require("../dist/common/pipes/validation.pipe");
const { CLIENTE_OLIVEIRA_ID, CLIENTE_SOUZA_ID } = require("../dist/fixtures/clientes");
const {
  DECISAO_OLIVEIRA_SENTENCA_ID,
  DECISAO_SOUZA_SANEADORA_ID,
} = require("../dist/fixtures/decisoes");
const { MODELO_REPLICA_CDC_ID } = require("../dist/fixtures/modelos");
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

  console.log("\nProva HTTP do acervo interno (clientes / petições / contratos / decisões / modelos)\n");

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
      processNumber: "90000644220238260100",
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

    const idPecaNova = peticaoNova.json && peticaoNova.json.peticao && peticaoNova.json.peticao.id;
    const apagaPeca = idPecaNova
      ? await requisitar(base, "DELETE", `/api/peticoes/${idPecaNova}`)
      : { status: 0 };

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

    const contratosTarifas = await requisitar(base, "GET", "/api/contratos?casoId=tarifas");

    if (
      contratosTarifas.status === 200 &&
      contratosTarifas.json.zone === "internal" &&
      contratosTarifas.json.contratos.length === 3 &&
      contratosTarifas.json.contratos.every((item) => item.casoId === "tarifas")
    ) {
      ok("GET /api/contratos filtra por caso", "3 peças do caso tarifas");
    } else {
      erro("GET /api/contratos filtra por caso", JSON.stringify(contratosTarifas.json));
    }

    semPii("lista de contratos sem CPF/banco", contratosTarifas.json);

    const contrato = await requisitar(base, "GET", "/api/contratos/rural-c1");

    if (
      contrato.status === 200 &&
      contrato.json.zone === "internal" &&
      contrato.json.contrato.casoId === "rural" &&
      contrato.json.contrato.tipo === "Contrato"
    ) {
      ok("GET /api/contratos/:id", contrato.json.contrato.id);
    } else {
      erro("GET /api/contratos/:id", JSON.stringify(contrato.json));
    }

    semPii("contrato sem CPF/banco", contrato.json);

    const contratoNovo = await requisitar(base, "POST", "/api/contratos", {
      casoId: "tarifas",
      titulo: "Aditivo sintético de demo",
      data: "01/09/2026",
      origem: "Cliente",
      resumo: "Peça fictícia criada pela prova.",
      cpf: "390.533.447-05",
    });

    if (
      contratoNovo.status === 201 &&
      contratoNovo.json.contrato.id.startsWith("ctr_") &&
      contratoNovo.json.contrato.tipo === "Contrato" &&
      contratoNovo.json.contrato.cpf === undefined
    ) {
      ok("POST /api/contratos ignora cpf extra e assume tipo", contratoNovo.json.contrato.id);
    } else {
      erro("POST /api/contratos ignora cpf extra e assume tipo", `${contratoNovo.status} ${JSON.stringify(contratoNovo.json)}`);
    }

    semPii("contrato criado sem CPF persistido", contratoNovo.json);

    const idContratoNovo = contratoNovo.json && contratoNovo.json.contrato && contratoNovo.json.contrato.id;

    const patchContrato = idContratoNovo
      ? await requisitar(base, "PATCH", `/api/contratos/${idContratoNovo}`, {
          resumo: "Resumo revisado pela prova.",
          casoId: "outro-caso",
        })
      : { status: 0, json: null };

    // casoId nao e editavel: mover contrato entre casos nao e edicao de campo.
    if (
      patchContrato.status === 200 &&
      patchContrato.json.contrato.resumo === "Resumo revisado pela prova." &&
      patchContrato.json.contrato.casoId === "tarifas"
    ) {
      ok("PATCH /api/contratos/:id nao move de caso", "casoId preservado");
    } else {
      erro("PATCH /api/contratos/:id nao move de caso", `${patchContrato.status} ${JSON.stringify(patchContrato.json)}`);
    }

    const contratoSemTitulo = await requisitar(base, "POST", "/api/contratos", {
      casoId: "tarifas",
      titulo: "",
      data: "2026",
      origem: "Cliente",
      resumo: "Sem título não entra.",
    });

    if (contratoSemTitulo.status === 400) {
      ok("POST /api/contratos recusa título vazio");
    } else {
      erro("POST /api/contratos recusa título vazio", `${contratoSemTitulo.status}`);
    }

    const apagaContrato = idContratoNovo
      ? await requisitar(base, "DELETE", `/api/contratos/${idContratoNovo}`)
      : { status: 0 };

    if (apagaContrato.status === 204) {
      ok("DELETE /api/contratos/:id");
    } else {
      erro("DELETE /api/contratos/:id", `${apagaContrato.status}`);
    }

    const contratoSumido = idContratoNovo
      ? await requisitar(base, "GET", `/api/contratos/${idContratoNovo}`)
      : { status: 0 };

    if (contratoSumido.status === 404) {
      ok("GET contrato removido retorna 404");
    } else {
      erro("GET contrato removido retorna 404", `${contratoSumido.status}`);
    }

    const decisoesSouza = await requisitar(
      base,
      "GET",
      `/api/decisoes?clienteId=${CLIENTE_SOUZA_ID}&processNumber=${NUMERO_PROCESSO_SOUZA}`
    );

    if (
      decisoesSouza.status === 200 &&
      decisoesSouza.json.zone === "internal" &&
      decisoesSouza.json.decisoes.length === 2 &&
      decisoesSouza.json.decisoes.every(
        (item) => item.clienteId === CLIENTE_SOUZA_ID && item.summary === undefined
      )
    ) {
      ok("GET /api/decisoes filtra por cliente e processo", "2 decisões, sem summary");
    } else {
      erro("GET /api/decisoes filtra por cliente e processo", JSON.stringify(decisoesSouza.json));
    }

    const decisoesSentenca = await requisitar(base, "GET", "/api/decisoes?kind=sentenca");

    if (
      decisoesSentenca.status === 200 &&
      decisoesSentenca.json.decisoes.length === 1 &&
      decisoesSentenca.json.decisoes[0].id === DECISAO_OLIVEIRA_SENTENCA_ID &&
      decisoesSentenca.json.decisoes[0].summary === undefined
    ) {
      ok("GET /api/decisoes filtra por kind", "1 sentença, sem summary");
    } else {
      erro("GET /api/decisoes filtra por kind", JSON.stringify(decisoesSentenca.json));
    }

    semPii("lista de decisões sem CPF/banco", decisoesSouza.json);

    const decisao = await requisitar(base, "GET", `/api/decisoes/${DECISAO_SOUZA_SANEADORA_ID}`);

    if (
      decisao.status === 200 &&
      decisao.json.zone === "internal" &&
      decisao.json.decisao.processNumber === NUMERO_PROCESSO_SOUZA &&
      decisao.json.decisao.summary.includes("contrato integral")
    ) {
      ok("GET /api/decisoes/:id inclui summary", decisao.json.decisao.id);
    } else {
      erro("GET /api/decisoes/:id inclui summary", JSON.stringify(decisao.json));
    }

    semPii("decisão sem CPF/banco", decisao.json);

    const decisaoNova = await requisitar(base, "POST", "/api/decisoes", {
      clienteId: CLIENTE_OLIVEIRA_ID,
      processNumber: "90000644220238260100",
      title: "Despacho de alegações finais",
      kind: "despacho",
      court: "TJSP",
      decidedAt: "2024-03-15",
      summary: "Abre prazo comum de 15 dias no caso sintético.",
      cpf: "390.533.447-05",
    });

    if (
      decisaoNova.status === 201 &&
      decisaoNova.json.decisao.id.startsWith("dec_") &&
      decisaoNova.json.decisao.processNumber === NUMERO_PROCESSO_DEMO &&
      decisaoNova.json.decisao.status === "rascunho" &&
      decisaoNova.json.decisao.cpf === undefined
    ) {
      ok("POST /api/decisoes normaliza CNJ e ignora cpf extra", decisaoNova.json.decisao.id);
    } else {
      erro(
        "POST /api/decisoes normaliza CNJ e ignora cpf extra",
        `${decisaoNova.status} ${JSON.stringify(decisaoNova.json)}`
      );
    }

    semPii("decisão criada sem CPF persistido", decisaoNova.json);

    const idDecisaoNova = decisaoNova.json && decisaoNova.json.decisao && decisaoNova.json.decisao.id;

    const patchDecisao = idDecisaoNova
      ? await requisitar(base, "PATCH", `/api/decisoes/${idDecisaoNova}`, {
          status: "publicada",
          cpf: "390.533.447-05",
        })
      : { status: 0, json: null };

    if (
      patchDecisao.status === 200 &&
      patchDecisao.json.decisao.status === "publicada" &&
      patchDecisao.json.decisao.cpf === undefined
    ) {
      ok("PATCH /api/decisoes/:id", "status=publicada, sem cpf");
    } else {
      erro("PATCH /api/decisoes/:id", `${patchDecisao.status} ${JSON.stringify(patchDecisao.json)}`);
    }

    const decisaoOrfao = await requisitar(base, "POST", "/api/decisoes", {
      clienteId: "cli_inexistente",
      title: "Decisão órfã",
      kind: "sentenca",
      summary: "Não deve persistir sem cliente válido.",
    });

    if (decisaoOrfao.status === 400) {
      ok("POST /api/decisoes recusa cliente inexistente");
    } else {
      erro("POST /api/decisoes recusa cliente inexistente", `${decisaoOrfao.status}`);
    }

    const decisaoCnjRuim = await requisitar(base, "POST", "/api/decisoes", {
      processNumber: "123",
      title: "Decisão com CNJ inválido",
      kind: "sentenca",
      summary: "Número curto não é processo CNJ.",
    });

    if (decisaoCnjRuim.status === 400) {
      ok("POST /api/decisoes recusa CNJ inválido");
    } else {
      erro("POST /api/decisoes recusa CNJ inválido", `${decisaoCnjRuim.status}`);
    }

    const apagaDecisao = idDecisaoNova
      ? await requisitar(base, "DELETE", `/api/decisoes/${idDecisaoNova}`)
      : { status: 0 };

    if (apagaDecisao.status === 204) {
      ok("DELETE /api/decisoes/:id");
    } else {
      erro("DELETE /api/decisoes/:id", `${apagaDecisao.status}`);
    }

    const decisaoSumida = idDecisaoNova
      ? await requisitar(base, "GET", `/api/decisoes/${idDecisaoNova}`)
      : { status: 0 };

    if (decisaoSumida.status === 404) {
      ok("GET decisão removida retorna 404");
    } else {
      erro("GET decisão removida retorna 404", `${decisaoSumida.status}`);
    }

    const modelosBancarios = await requisitar(
      base,
      "GET",
      "/api/modelos?kind=peticao&area=bancario&status=ativo"
    );

    if (
      modelosBancarios.status === 200 &&
      modelosBancarios.json.zone === "internal" &&
      modelosBancarios.json.modelos.length === 1 &&
      modelosBancarios.json.modelos[0].id === MODELO_REPLICA_CDC_ID &&
      modelosBancarios.json.modelos.every((item) => item.body === undefined)
    ) {
      ok("GET /api/modelos filtra kind/area/status", "1 modelo, sem body");
    } else {
      erro("GET /api/modelos filtra kind/area/status", JSON.stringify(modelosBancarios.json));
    }

    semPii("lista de modelos sem CPF/banco", modelosBancarios.json);

    const modelo = await requisitar(base, "GET", `/api/modelos/${MODELO_REPLICA_CDC_ID}`);

    if (
      modelo.status === 200 &&
      modelo.json.zone === "internal" &&
      modelo.json.modelo.body.includes("cédula")
    ) {
      ok("GET /api/modelos/:id inclui body", modelo.json.modelo.id);
    } else {
      erro("GET /api/modelos/:id inclui body", JSON.stringify(modelo.json));
    }

    semPii("modelo sem CPF/banco", modelo.json);

    const modeloNovo = await requisitar(base, "POST", "/api/modelos", {
      title: "E-mail de intimação sintética",
      kind: "email",
      area: "civel",
      body: "Texto fictício para intimar a parte no caso demo.",
      tags: ["intimacao", "demo"],
      cpf: "390.533.447-05",
    });

    if (
      modeloNovo.status === 201 &&
      modeloNovo.json.modelo.id.startsWith("mod_") &&
      modeloNovo.json.modelo.status === "ativo" &&
      modeloNovo.json.modelo.cpf === undefined
    ) {
      ok("POST /api/modelos ignora cpf extra", modeloNovo.json.modelo.id);
    } else {
      erro(
        "POST /api/modelos ignora cpf extra",
        `${modeloNovo.status} ${JSON.stringify(modeloNovo.json)}`
      );
    }

    semPii("modelo criado sem CPF persistido", modeloNovo.json);

    const idModeloNovo = modeloNovo.json && modeloNovo.json.modelo && modeloNovo.json.modelo.id;

    const patchModelo = idModeloNovo
      ? await requisitar(base, "PATCH", `/api/modelos/${idModeloNovo}`, {
          status: "arquivado",
          cpf: "390.533.447-05",
        })
      : { status: 0, json: null };

    if (
      patchModelo.status === 200 &&
      patchModelo.json.modelo.status === "arquivado" &&
      patchModelo.json.modelo.cpf === undefined
    ) {
      ok("PATCH /api/modelos/:id", "status=arquivado, sem cpf");
    } else {
      erro("PATCH /api/modelos/:id", `${patchModelo.status} ${JSON.stringify(patchModelo.json)}`);
    }

    const modeloKindRuim = await requisitar(base, "POST", "/api/modelos", {
      title: "Modelo com kind inválido",
      kind: "sentenca",
      body: "Kind de decisão não entra na biblioteca.",
    });

    if (modeloKindRuim.status === 400) {
      ok("POST /api/modelos recusa kind inválido");
    } else {
      erro("POST /api/modelos recusa kind inválido", `${modeloKindRuim.status}`);
    }

    const apagaModelo = idModeloNovo
      ? await requisitar(base, "DELETE", `/api/modelos/${idModeloNovo}`)
      : { status: 0 };

    if (apagaModelo.status === 204) {
      ok("DELETE /api/modelos/:id");
    } else {
      erro("DELETE /api/modelos/:id", `${apagaModelo.status}`);
    }

    const modeloSumido = idModeloNovo
      ? await requisitar(base, "GET", `/api/modelos/${idModeloNovo}`)
      : { status: 0 };

    if (modeloSumido.status === 404) {
      ok("GET modelo removido retorna 404");
    } else {
      erro("GET modelo removido retorna 404", `${modeloSumido.status}`);
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
