/**
 * Prova de que a declassificação falha fechada.
 *
 * Um resumidor que "normalmente não vaza" não serve de garantia. Este script
 * força os três modos de falha e exige que cada um seja recusado. Rode depois
 * de `pnpm run build`:
 *
 *   node scripts/prova-declassificacao.js
 */
require("../dist/register-aliases");

const { DeclassifyService, FalhaDeDeclassificacao } = require("../dist/modules/gateway/declassify.service");
const { DlpService } = require("../dist/modules/gateway/dlp.service");
const { PROCESSOS_POR_NUMERO } = require("../dist/fixtures/processos");
const { rotular } = require("../dist/models/classificacao.model");

const processo = Object.values(PROCESSOS_POR_NUMERO)[0];
const capa = rotular(processo, "cliente", "acervo:processo");

let falhas = 0;

function ok(titulo, detalhe) {
  console.log(`  PASSOU  ${titulo}${detalhe ? ` — ${detalhe}` : ""}`);
}

function erro(titulo, detalhe) {
  falhas += 1;
  console.log(`  FALHOU  ${titulo}${detalhe ? ` — ${detalhe}` : ""}`);
}

function esperaRecusa(titulo, acao) {
  try {
    acao();
    erro(titulo, "a saída passou; deveria ter sido recusada");
  } catch (e) {
    if (e instanceof FalhaDeDeclassificacao) {
      ok(titulo, e.motivo.slice(0, 72) + "…");
    } else {
      erro(titulo, `erro inesperado: ${e.message}`);
    }
  }
}

console.log("\nProva de declassificação fail-closed\n");

// 1. O caminho normal precisa continuar passando, senão a prova não vale nada.
const servico = new DeclassifyService(new DlpService());
const dto = servico.resumoDeCaso(capa);
const serializado = JSON.stringify(dto);

const vazamentos = [
  ...processo.parties.map((p) => p.nome),
  processo.summary.slice(0, 40),
  processo.movements[0].descricao.slice(0, 40),
  processo.courtUnit,
];

const encontrados = vazamentos.filter((t) => serializado.includes(t));

if (encontrados.length) {
  erro("DTO real não contém texto da fonte", `vazou: ${encontrados.join(" | ")}`);
} else {
  ok("DTO real não contém texto da fonte", `${serializado.length} chars, 0 vazamentos`);
}

// 2. Citação literal da fonte num campo gerado.
esperaRecusa("recusa citação literal de 5+ palavras da capa", () => {
  const poluido = new DeclassifyService(new DlpService());
  poluido.textoSituacao = () => processo.summary;
  poluido.resumoDeCaso(capa);
});

// 3. Nome de parte dentro do texto gerado.
esperaRecusa("recusa nome de parte em campo gerado", () => {
  const poluido = new DeclassifyService(new DlpService());
  const nome = processo.parties[0].nome;
  poluido.textoSituacao = () =>
    `O caso envolve ${nome} como parte autora e segue em fase recursal normalmente.`;
  poluido.resumoDeCaso(capa);
});

// 4. PII que o gerador nunca deveria ter produzido.
esperaRecusa("recusa PII em qualquer campo do DTO", () => {
  const poluido = new DeclassifyService(new DlpService());
  poluido.textoSituacao = () =>
    "Caso em fase recursal. Contato do responsável: 123.456.789-00.";
  poluido.resumoDeCaso(capa);
});

// 5. Fonte pública pode citar — a classificação é que autoriza.
try {
  const { JURISPRUDENCIAS_BANCARIAS } = require("../dist/fixtures/jurisprudencias");
  const publico = rotular(JURISPRUDENCIAS_BANCARIAS, "publico", "acervo:jurisprudencia");
  const conhecimento = servico.conhecimento(publico, ["Tarifa de cadastro"]);
  const comEmenta = conhecimento.conteudo.itens.filter((i) => i.ementa).length;

  if (comEmenta > 0) {
    ok("fonte pública sai com ementa integral", `${comEmenta} ementas citáveis`);
  } else {
    erro("fonte pública sai com ementa integral", "nenhuma ementa saiu");
  }
} catch (e) {
  erro("fonte pública sai com ementa integral", e.message);
}

console.log(
  falhas === 0
    ? "\nTodas as barreiras seguraram.\n"
    : `\n${falhas} barreira(s) NAO seguraram. Nao suba isso.\n`
);

process.exit(falhas === 0 ? 0 : 1);
