import { ESCRITORIO } from "./dados";
import { RelatorioPdf } from "./lib/pdf";
import { diasRestantes, formatarDataIso, hidratarPrazos } from "./prazos-escritorio";
import {
  Caso,
  ROTULO_CALENDARIO,
  ROTULO_PRAZO_KIND,
  ROTULO_PRAZO_STATUS,
  ROTULO_STATUS,
  chanceIndisponivel,
  ehCitavel,
} from "./tipos";

export const RELATORIO_IDS = [
  "memoria",
  "prazos",
  "acervo",
  "estrategia",
  "jurimetria",
] as const;

export type RelatorioId = (typeof RELATORIO_IDS)[number];

export type CatalogoRelatorio = {
  id: RelatorioId;
  titulo: string;
  texto: string;
  destinatario: string;
};

export const CATALOGO_RELATORIOS: CatalogoRelatorio[] = [
  {
    id: "memoria",
    titulo: "OpenLegalAI do caso",
    texto: "Capa, partes, tese e o que o escritório já sabe — sem inventar chance.",
    destinatario: "Sócio e equipe do caso",
  },
  {
    id: "prazos",
    titulo: "Agenda de prazos",
    texto: "Calendário interno. DataJud, se aparecer, só como gatilho.",
    destinatario: "Advogado responsável",
  },
  {
    id: "acervo",
    titulo: "Inventário do acervo",
    texto: "Peças, contratos, documentos, decisões e modelos deste caso.",
    destinatario: "Arquivo e estagiário",
  },
  {
    id: "estrategia",
    titulo: "Nota de estratégia",
    texto: "Teses em uso, resultados internos e dissídios entre câmaras.",
    destinatario: "Reunião de tese",
  },
  {
    id: "jurimetria",
    titulo: "Recorte de jurimetria",
    texto: "Contagens do acervo. Sem modelo oficial, a chance não sai.",
    destinatario: "Leitura interna",
  },
];

export function rotuloRelatorio(id: RelatorioId): string {
  switch (id) {
    case "memoria":
    case "prazos":
    case "acervo":
    case "estrategia":
    case "jurimetria":
      return CATALOGO_RELATORIOS.find((item) => item.id === id)?.titulo || id;
    default: {
      const neverId: never = id;
      return neverId;
    }
  }
}

export function nomeArquivoRelatorio(caso: Caso, id: RelatorioId): string {
  const slug = caso.id.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "caso";
  return `${slug}-${id}.pdf`;
}

export function montarRelatorio(casoBruto: Caso, id: RelatorioId): RelatorioPdf {
  const caso = hidratarPrazos(casoBruto);
  const gerado = new Date().toLocaleString("pt-BR");
  const base = {
    subtitulo: `${caso.titulo} · ${caso.cliente}`,
    meta: [
      `${caso.processNumber || "CNJ indisponível"}  ·  ${caso.court}  ·  ${caso.chamber}`,
      `Andamento: ${ROTULO_STATUS[caso.status]}  ·  Gerado em ${gerado}`,
      `${ESCRITORIO.nome}  ·  ${ESCRITORIO.usuario}`,
    ],
    aviso:
      "Documento interno do escritório. Não atravessa o gateway MCP. Sem ementa oficial, nada aqui é citável em peça.",
    rodape: `${ESCRITORIO.nome} · confidencial interno · ${caso.processNumber || caso.id}`,
  };

  switch (id) {
    case "memoria":
      return { ...base, titulo: "OpenLegalAI do caso", blocos: blocosMemoria(caso) };
    case "prazos":
      return { ...base, titulo: "Agenda de prazos", blocos: blocosPrazos(caso) };
    case "acervo":
      return { ...base, titulo: "Inventário do acervo", blocos: blocosAcervo(caso) };
    case "estrategia":
      return { ...base, titulo: "Nota de estratégia", blocos: blocosEstrategia(caso) };
    case "jurimetria":
      return { ...base, titulo: "Recorte de jurimetria", blocos: blocosJurimetria(caso) };
    default: {
      const neverId: never = id;
      return neverId;
    }
  }
}

function blocosMemoria(caso: Caso): RelatorioPdf["blocos"] {
  return [
    {
      olho: "Identificação",
      linhas: [
        `Cliente: ${caso.cliente || "—"}`,
        `Tema: ${caso.tema || "—"}`,
        `Subtema: ${caso.subtema || "—"}`,
        caso.partes.length
          ? `Partes: ${caso.partes.map((parte) => `${parte.papel} — ${parte.nome}`).join("; ")}`
          : "Partes ainda não lançadas no acervo.",
      ],
    },
    {
      olho: "Tese do escritório",
      linhas: [caso.tese || "Nenhuma tese lançada."],
    },
    {
      olho: "Resumo",
      linhas: [caso.resumo || "Sem resumo no acervo."],
    },
    {
      olho: "Última atualização",
      linhas: [caso.atualizacao || "Sem atualização registrada."],
    },
  ];
}

function blocosPrazos(caso: Caso): RelatorioPdf["blocos"] {
  if (!caso.prazos.length) {
    return [{ linhas: ["Nenhum prazo lançado no acervo deste caso."] }];
  }

  return caso.prazos.map((item) => {
    const dias = diasRestantes(item.dueAt);
    const relogio =
      item.status === "cumprido"
        ? "cumprido"
        : dias < 0
          ? `${Math.abs(dias)} dia(s) em atraso`
          : `${dias} dia(s) restantes`;

    return {
      olho: ROTULO_PRAZO_STATUS[item.status],
      titulo: item.title,
      linhas: [
        `Vence em ${formatarDataIso(item.dueAt)} · ${item.days} ${ROTULO_CALENDARIO[item.calendar]} · ${relogio}`,
        `Tipo: ${ROTULO_PRAZO_KIND[item.kind]} · Responsável: ${item.owner}`,
        `Gatilho (${item.gatilhoFonte === "datajud" ? "DataJud" : "acervo"}): ${item.trigger}`,
        item.notes || "Sem nota adicional.",
      ],
    };
  });
}

function blocosAcervo(caso: Caso): RelatorioPdf["blocos"] {
  const grupos = [
    { olho: "Petições", itens: caso.peticoes },
    { olho: "Contratos", itens: caso.contratos },
    { olho: "Documentos do cliente", itens: caso.documentos },
    { olho: "Decisões", itens: caso.decisoes },
    { olho: "Modelos", itens: caso.modelos },
  ];

  return grupos.map((grupo) => ({
    olho: `${grupo.olho} · ${grupo.itens.length}`,
    linhas: grupo.itens.length
      ? grupo.itens.map(
          (item) => `${item.titulo} (${item.tipo} · ${item.data}) — ${item.resumo}`
        )
      : ["Nada neste acervo ainda."],
  }));
}

function blocosEstrategia(caso: Caso): RelatorioPdf["blocos"] {
  const teses = caso.teses.length
    ? caso.teses.map((tese) => `${tese.titulo} · força ${tese.forca} — ${tese.uso}`)
    : ["Nenhuma tese lançada."];

  const resultados = caso.resultados.length
    ? caso.resultados.map(
        (item) => `${item.titulo}: ${item.desfecho} Aprendizado: ${item.aprendizado}`
      )
    : ["Nenhum resultado interno catalogado."];

  const dissidios = caso.dissidios.length
    ? caso.dissidios.map((item) => `${item.camara} — ${item.orientacao}. ${item.nota}`)
    : ["Sem mapa de dissídio no acervo."];

  const juris = caso.jurisprudencias.length
    ? caso.jurisprudencias.map((item) =>
        ehCitavel(item)
          ? `${item.acordao} · ${item.chamber} · citável`
          : `${item.acordao || item.processNumber || "Julgado"} · não citável (ementa oficial ausente)`
      )
    : ["Nenhum julgado no acervo."];

  return [
    { olho: "Teses", linhas: teses },
    { olho: "Resultados internos", linhas: resultados },
    { olho: "Dissídios", linhas: dissidios },
    { olho: "Jurisprudência (cite-or-silent)", linhas: juris },
  ];
}

function blocosJurimetria(caso: Caso): RelatorioPdf["blocos"] {
  const chance = chanceIndisponivel(caso)
    ? "Chance oficial indisponível — sem modelo publicado, o número não sai."
    : `${caso.chance}% · ${caso.chanceRotulo}. ${caso.chanceTexto}`;

  return [
    {
      olho: "Amostra",
      linhas: [
        `${caso.jurimetria.amostra} julgados no recorte interno.`,
        `Votos do acervo: ${caso.votos.for} a favor, ${caso.votos.against} contra, ${caso.votos.diverge} divergentes.`,
      ],
    },
    { olho: "Padrão externo", linhas: [caso.jurimetria.padrao || "Sem padrão lançado."] },
    { olho: "Memória interna", linhas: [caso.jurimetria.interno || "Sem memória interna."] },
    {
      olho: "Riscos",
      linhas: caso.jurimetria.riscos.length ? caso.jurimetria.riscos : ["Nenhum risco listado."],
    },
    { olho: "Chance", linhas: [chance] },
  ];
}
