/**
 * Copia o acervo do TiDB para `client/src/acervo-real.ts`.
 *
 * O arquivo gerado é o que a tela usa quando o Nest não responde. Ele guarda
 * os mesmos casos que o banco devolve, já no contrato `Caso` do front.
 *
 * Suba o Nest com `server/.env` preenchido e rode na raiz:
 *
 *   npm run gerar:acervo
 */
const { writeFileSync } = require("fs");
const { join } = require("path");

const BASE = process.env.API_BASE || "http://127.0.0.1:3000";
const DESTINO = join(__dirname, "../client/src/acervo-real.ts");

const CAMPOS_CASO = [
  "id",
  "titulo",
  "tema",
  "subtema",
  "processNumber",
  "court",
  "chamber",
  "status",
  "cliente",
  "partes",
  "resumo",
  "tese",
  "atualizacao",
  "chance",
  "chanceRotulo",
  "chanceTexto",
  "votos",
  "peticoes",
  "contratos",
  "documentos",
  "decisoes",
  "modelos",
  "historico",
  "prazos",
  "teses",
  "resultados",
  "conversas",
  "jurisprudencias",
  "dissidios",
  "jurimetria",
  "fontes",
];

async function pegar(caminho) {
  const resposta = await fetch(`${BASE}${caminho}`);

  if (!resposta.ok) {
    throw new Error(`${caminho} respondeu ${resposta.status}`);
  }

  const corpo = await resposta.json();

  if (corpo.zone !== "internal") {
    throw new Error(`${caminho} não é zona interna`);
  }

  return corpo;
}

/** Só os campos do contrato `Caso`: chave extra quebraria o TypeScript do front. */
function apenasContrato(caso) {
  const limpo = {};

  for (const campo of CAMPOS_CASO) {
    limpo[campo] = caso[campo];
  }

  return limpo;
}

async function main() {
  const lista = await pegar("/api/casos");
  const casos = [];

  for (const resumo of lista.casos) {
    const detalhe = await pegar(`/api/casos/${encodeURIComponent(resumo.id)}`);
    casos.push(apenasContrato(detalhe.caso));
    console.log(`  ${casos.length}/${lista.casos.length}  ${resumo.id}`);
  }

  const conteudo = `// Gerado por \`npm run gerar:acervo\`. Não edite à mão.
// Cópia do acervo do TiDB, usada pela tela quando a API do Nest não responde.
import { Caso } from "./tipos";

export const ACERVO_REAL: Caso[] = ${JSON.stringify(casos, null, 2)};
`;

  writeFileSync(DESTINO, conteudo, "utf8");
  console.log(`\n${casos.length} casos gravados em client/src/acervo-real.ts\n`);
}

main().catch((erro) => {
  console.error(`\nFalhou: ${erro.message}\n`);
  process.exit(1);
});
