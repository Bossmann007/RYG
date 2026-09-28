/**
 * Proves the trusted-zone Caso assembly.
 *
 * 1. Assembler maps TiDB-shaped rows into the frontend Caso contract.
 * 2. With DB_* set, boots Nest and asserts GET /api/casos returns 26 rows
 *    from the database (zone=internal, no MCP egress).
 *
 *   pnpm --prefix server run build
 *   pnpm --prefix server run prova:casos
 *
 * Or, with the server already up:
 *
 *   curl -s -H 'Authorization: Bearer demo-socio' http://127.0.0.1:3000/api/casos | python3 -c \
 *     'import json,sys; d=json.load(sys.stdin); assert d["zone"]=="internal"; assert len(d["casos"])==26; print(len(d["casos"]))'
 */
require("../dist/register-aliases");
require("dotenv").config();
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { montarCaso, mesmoCaso } = require("../dist/modules/casos/caso.assembler");
const { lerDbEnv } = require("../dist/config/db.config");

const ESPERADOS = 26;
let falhas = 0;

function ok(titulo, detalhe) {
  console.log(`  PASSOU  ${titulo}${detalhe ? ` — ${detalhe}` : ""}`);
}

function erro(titulo, detalhe) {
  falhas += 1;
  console.log(`  FALHOU  ${titulo}${detalhe ? ` — ${detalhe}` : ""}`);
}

function provaAssembler() {
  console.log("\nProva do assembler Caso (sem banco)\n");

  const caso = montarCaso({
    capa: {
      id: "tarifas",
      titulo: "Revisão de juros e tarifas",
      tema: "CDC",
      subtema: "Tarifas",
      numero_cnj: "00012345620248160001",
      chance: "72",
      chance_rotulo: "Tendência favorável",
      chance_texto: "A 13ª Câmara tem acolhido revisão.",
      votos_for: 18,
      votos_against: 7,
      votos_diverge: 5,
      partes: JSON.stringify([
        { papel: "Autora", nome: "Maria Clara Souza" },
        { papel: "Réu", nome: "Banco Horizonte S.A." },
      ]),
      status: "ativo",
    },
    processo: {
      id: 1,
      numero_cnj: "0001234-56.2024.8.16.0001",
      tribunal: "TJPR",
      camara: "13ª Câmara Cível",
    },
    cliente: { id: 9, nome: "Maria Clara Souza" },
    peticoes: [
      {
        id: "p1",
        titulo: "Petição inicial",
        tipo: "Peça",
        data: "12/03/2024",
        origem: "Acervo interno",
        resumo: "Revisão da cédula.",
      },
    ],
    contratos: [],
    documentos: [],
    decisoes: [],
    modelos: [],
    historico: [{ data: "12/03/2024", titulo: "Distribuição", detalhe: "13ª Câmara." }],
    teses: [{ id: "t1", titulo: "CDC aplicável", uso: "Inicial", forca: "alta" }],
    resultados: [],
    conversas: [
      { id: "cv1", autora: "Ana Prado", papel: "Sócia", hora: "09:12", texto: "Cravar o CDC.", ia: 0 },
    ],
    jurisprudencias: [],
    dissidios: [],
    jurimetria: { amostra: 12, padrao: "Revisão quando a prova falha.", interno: "", riscos: '["15ª Câmara"]' },
  });

  if (
    caso.id === "tarifas" &&
    caso.processNumber === "0001234-56.2024.8.16.0001" &&
    caso.court === "TJPR" &&
    caso.chamber === "13ª Câmara Cível" &&
    caso.status === "ATIVO" &&
    caso.cliente === "Maria Clara Souza" &&
    caso.partes.length === 2 &&
    caso.chance === 0 &&
    caso.chanceRotulo === "indisponível sem modelo oficial" &&
    caso.fontes &&
    caso.fontes.chance === "indisponivel" &&
    caso.fontes.processNumber === "acervo_interno" &&
    caso.votos.for === 18 &&
    caso.peticoes.length === 1 &&
    caso.peticoes[0].titulo === "Petição inicial" &&
    caso.historico[0].titulo === "Distribuição" &&
    caso.teses[0].forca === "alta" &&
    caso.jurisprudencias.length === 0 &&
    !Object.prototype.hasOwnProperty.call(caso, "cpf")
  ) {
    ok("assembler monta Caso e ignora PII extra", caso.id);
  } else {
    erro("assembler monta Caso e ignora PII extra", JSON.stringify(caso));
  }

  if (
    mesmoCaso(caso, "tarifas") &&
    mesmoCaso(caso, "0001234-56.2024.8.16.0001") &&
    mesmoCaso(caso, "00012345620248160001") &&
    !mesmoCaso(caso, "consignado")
  ) {
    ok("lookup por id e CNJ");
  } else {
    erro("lookup por id e CNJ");
  }

  const payload = montarCaso({
    capa: {
      id: "payload-demo",
      payload: JSON.stringify({
        id: "payload-demo",
        titulo: "Do JSON",
        cpf: "390.533.447-05",
        peticoes: [],
      }),
    },
    peticoes: [],
    contratos: [],
    documentos: [],
    decisoes: [],
    modelos: [],
    historico: [],
    teses: [],
    resultados: [],
    conversas: [],
    jurisprudencias: [],
    dissidios: [],
  });

  if (payload.titulo === "Do JSON" && payload.cpf === undefined) {
    ok("payload JSON não vaza chaves fora do contrato Caso");
  } else {
    erro("payload JSON não vaza chaves fora do contrato Caso", JSON.stringify(payload));
  }
}

async function requisitar(base, caminho) {
  const resposta = await fetch(`${base}${caminho}`, {
    headers: { Authorization: "Bearer demo-socio" },
  });
  const texto = await resposta.text();
  const json = texto ? JSON.parse(texto) : null;
  return { status: resposta.status, json };
}

async function provaHttp() {
  const env = lerDbEnv();
  const { NestFactory } = require("@nestjs/core");
  const { AppModule } = require("../dist/app.module");
  const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
  const { ValidationPipe } = require("../dist/common/pipes/validation.pipe");

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(ValidationPipe);
  await app.listen(0);

  const endereco = app.getHttpServer().address();
  const base = `http://127.0.0.1:${endereco.port}`;

  console.log(env ? "\nProva HTTP GET /api/casos (TiDB)\n" : "\nProva HTTP GET /api/casos (sem DB_* — fail-closed)\n");

  try {
    const lista = await requisitar(base, "/api/casos");
    const casos = lista.json && lista.json.casos;

    if (!env) {
      if (lista.status === 503 && lista.json && lista.json.erro) {
        ok("GET /api/casos sem banco falha fechado", "503, sem fallback para dados.ts");
      } else {
        erro("GET /api/casos sem banco falha fechado", `${lista.status} ${JSON.stringify(lista.json)}`);
      }
      return;
    }

    if (
      lista.status === 200 &&
      lista.json.zone === "internal" &&
      Array.isArray(casos) &&
      casos.length === ESPERADOS
    ) {
      ok("GET /api/casos", `${casos.length} casos, zone=internal`);
    } else {
      erro(
        "GET /api/casos",
        `${lista.status} zone=${lista.json && lista.json.zone} n=${casos ? casos.length : "?"} esperado=${ESPERADOS} corpo=${JSON.stringify(lista.json && lista.json.erro ? lista.json : { n: casos && casos.length })}`
      );
    }

    if (Array.isArray(casos) && casos[0]) {
      const primeiro = casos[0];
      const detalhe = await requisitar(base, `/api/casos/${encodeURIComponent(primeiro.id)}`);
      const caso = detalhe.json && detalhe.json.caso;
      const abas = caso
        ? [
            caso.peticoes,
            caso.contratos,
            caso.documentos,
            caso.decisoes,
            caso.modelos,
            caso.historico,
            caso.teses,
            caso.resultados,
            caso.conversas,
            caso.jurisprudencias,
            caso.dissidios,
          ]
        : [];

      if (
        detalhe.status === 200 &&
        detalhe.json.zone === "internal" &&
        caso &&
        caso.id === primeiro.id &&
        abas.every((campo) => campo !== undefined)
      ) {
        ok("GET /api/casos/:id cobre as abas", caso.id);
      } else {
        erro("GET /api/casos/:id cobre as abas", JSON.stringify(detalhe.json));
      }

      if (primeiro.processNumber) {
        const porCnj = await requisitar(
          base,
          `/api/casos/${encodeURIComponent(primeiro.processNumber)}`
        );

        if (porCnj.status === 200 && porCnj.json.caso && porCnj.json.caso.id === primeiro.id) {
          ok("GET /api/casos/:idOrCnj por CNJ", primeiro.processNumber);
        } else {
          erro("GET /api/casos/:idOrCnj por CNJ", JSON.stringify(porCnj.json));
        }
      }
    }
  } finally {
    await app.close();
  }
}

async function main() {
  provaAssembler();
  await provaHttp();

  if (falhas) {
    console.log(`\n${falhas} falha(s) na prova de casos.\n`);
    process.exit(1);
  }

  console.log("\nProva de casos concluída sem falhas.\n");
}

main().catch((erroFatal) => {
  console.error(erroFatal);
  process.exit(1);
});
