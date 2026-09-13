import {
  Alinhamento,
  BlocoAnalise,
  Caso,
  Dissidio,
  Documento,
  Jurisprudencia,
  Prazo,
  ResultadoInterno,
  Tese,
} from "@models/caso.model";

const MARCA_DEMO =
  /demo|heur[ií]stica|fict[ií]ci|simulado|demonstra[cç][aã]o|\[DEMO/i;

const CONTRATO =
  /contrato|c[eé]dula|arrendamento|financiamento|aliena[cç][aã]o|tarif|empr[eé]stimo/i;

export function temMarcaDemo(valor: string): boolean {
  return MARCA_DEMO.test(valor);
}

export function limparDemo(valor: string): string {
  return valor
    .replace(/\[[^\]]*DEMO[^\]]*\]/gi, "")
    .replace(/\(heur[ií]stica de demo\)/gi, "")
    .replace(/heur[ií]stica de demo\.?/gi, "")
    .replace(/no recorte da demo:?\s*/gi, "")
    .replace(/alinhamento no recorte da demo:?\s*/gi, "")
    .replace(
      /classifica[cç][aã]o heur[ií]stica sobre o texto oficial\s*\(demo\)\.?/gi,
      ""
    )
    .replace(/desfecho classificado como \w+ por heur[ií]stica[^.]*\.?/gi, "")
    .replace(/n[aã]o [eé] modelo preditivo publicado\.?/gi, "")
    .replace(/equipe jur[ií]dica\s*[—\-]\s*demonstra[cç][aã]o/gi, "Equipe jurídica")
    .replace(/dados fict[ií]cios[^.]*\./gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function fraseOficial(valor: string): string {
  const limpo = limparDemo(valor).replace(/\s+/g, " ").trim();
  if (!limpo) {
    return "";
  }

  const letras = limpo.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const maiusculas = letras.replace(/[^A-ZÀ-Ý]/g, "").length;
  if (!letras.length || maiusculas / letras.length <= 0.45) {
    return limpo;
  }

  const baixo = limpo.toLocaleLowerCase("pt-BR");
  return baixo.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, sep: string, letra: string) => {
    return sep + letra.toLocaleUpperCase("pt-BR");
  });
}

export function frasesDaEmenta(ementa: string): string[] {
  const protegido = fraseOficial(ementa)
    .replace(/\bart\./gi, "art¤")
    .replace(/\binc\./gi, "inc¤")
    .replace(/\bn[º°.]/gi, "n¤");

  return protegido
    .split(/(?<=[.;])\s+/)
    .map((frase) =>
      frase
        .replace(/¤/g, ".")
        .replace(/^\(\d+\)\s*/, "")
        .replace(/^[\-–]\s*/, "")
        .trim()
    )
    .filter((frase) => frase.length > 18);
}

export function resumoOficial(ementa: string, limite = 280): string {
  const frases = frasesDaEmenta(ementa);
  if (!frases.length) {
    return fraseOficial(ementa).slice(0, limite);
  }

  let saida = "";
  for (const frase of frases) {
    const proxima = saida ? `${saida} ${frase}` : frase;
    if (proxima.length > limite && saida) {
      break;
    }
    saida = proxima;
    if (saida.length >= 140) {
      break;
    }
  }
  return saida;
}

function dispositivo(ementa: string): string {
  const frases = frasesDaEmenta(ementa);
  const marca =
    /rejeitad|n[aã]o provid|improced|parcialmente|em parte|provid[oa]|acolhid|embargos reje|reforma|inviab|n[aã]o cab|restitu|devolu/i;
  return frases.find((frase) => marca.test(frase)) || frases[frases.length - 1] || "";
}

export function motivoDoVoto(
  alinhamento: Alinhamento,
  ementa: string,
  camara: string,
  data: string
): string {
  const nucleo = dispositivo(ementa) || resumoOficial(ementa, 220);
  const onde = [camara, data].filter(Boolean).join(" · ");
  const prefixo = onde ? `${onde}. ` : "";

  if (alinhamento === "against") {
    return `${prefixo}A ementa oficial fecha contra o pedido: ${nucleo}`;
  }
  if (alinhamento === "diverge") {
    return `${prefixo}A ementa oficial é parcial — uma parte favorece, outra não: ${nucleo}`;
  }
  if (alinhamento === "for") {
    return `${prefixo}A ementa oficial acolhe o sentido do pedido: ${nucleo}`;
  }
  return nucleo;
}

function bloco(resumo: string, itens: string[]): BlocoAnalise {
  const unicos: string[] = [];
  const visto = new Set<string>();
  for (const item of itens) {
    const texto = fraseOficial(item);
    const chave = texto.toLocaleLowerCase("pt-BR");
    if (!texto || visto.has(chave) || temMarcaDemo(texto)) {
      continue;
    }
    visto.add(chave);
    unicos.push(texto);
  }
  return { resumo: fraseOficial(resumo), itens: unicos.slice(0, 4) };
}

function blocosDaEmenta(item: Jurisprudencia): Pick<
  Jurisprudencia,
  "essencial" | "fortalecer" | "blindar" | "contrapor"
> {
  const holdings = frasesDaEmenta(item.ementa).slice(0, 4);
  const motivo = motivoDoVoto(item.alignment, item.ementa, item.chamber, item.date);
  const aFavor = holdings.filter((frase) =>
    /restitu|devolu|cdc|tarifa|vrg|provid|acolh|prescri[cç][aã]o.*inocorr/i.test(frase)
  );
  const contra = holdings.filter((frase) =>
    /rejeit|improced|inviab|n[aã]o cab|n[aã]o provid|embargos reje/i.test(frase)
  );

  return {
    essencial: bloco(motivo, holdings.length ? holdings : [resumoOficial(item.ementa)]),
    fortalecer: bloco(
      item.alignment === "for"
        ? "O que este acórdão oficial já reconheceu e pode ir para a peça."
        : item.alignment === "diverge"
          ? "Use só a parte do julgado que favorece o pedido e isole o restante."
          : "Este julgado fecha contra. Sirva-se dele para saber o que o tribunal já recusou.",
      (aFavor.length ? aFavor : holdings).slice(0, 3)
    ),
    blindar: bloco(
      "Onde a parte contrária pode apoiar o ataque, segundo a ementa oficial.",
      (contra.length ? contra : holdings).slice(0, 3)
    ),
    contrapor: bloco(
      item.alignment === "against" || item.alignment === "diverge"
        ? "Como limitar o alcance deste julgado: o dispositivo oficial e o contexto da câmara."
        : "Se citarem este julgado contra você, volte ao dispositivo oficial e à identidade do caso.",
      holdings.slice(0, 3)
    ),
  };
}

function jurisOficial(item: Jurisprudencia): Jurisprudencia {
  const ementa = fraseOficial(item.ementa);
  const blocos = ementa ? blocosDaEmenta({ ...item, ementa }) : {
    essencial: bloco(item.essencial.resumo, item.essencial.itens),
    fortalecer: bloco(item.fortalecer.resumo, item.fortalecer.itens),
    blindar: bloco(item.blindar.resumo, item.blindar.itens),
    contrapor: bloco(item.contrapor.resumo, item.contrapor.itens),
  };

  return {
    ...item,
    acordao: limparDemo(item.acordao),
    chamber: fraseOficial(item.chamber),
    reporter: fraseOficial(item.reporter),
    ementa,
    pontos: item.pontos.map(fraseOficial).filter(Boolean),
    ...blocos,
  };
}

function jurimetriaOficial(caso: Caso, juris: Jurisprudencia[]) {
  const oficiais = juris.filter((item) => item.ementa);
  const forN = oficiais.filter((item) => item.alignment === "for").length;
  const againstN = oficiais.filter((item) => item.alignment === "against").length;
  const divergeN = oficiais.filter((item) => item.alignment === "diverge").length;
  const orgaos = [...new Set(oficiais.map((item) => item.chamber).filter(Boolean))];

  const padrao = oficiais.length
    ? `No recorte oficial deste caso há ${oficiais.length} acórdão${oficiais.length === 1 ? "" : "s"} do TJPR${orgaos.length ? ` (${orgaos.join(", ")})` : ""}. Distribuição: ${forN} a favor, ${againstN} contra, ${divergeN} divergente.`
    : fraseOficial(limparDemo(caso.jurimetria.padrao));

  const interno = oficiais.length
    ? oficiais
        .slice(0, 3)
        .map((item) => motivoDoVoto(item.alignment, item.ementa, item.chamber, item.date))
        .join(" ")
    : fraseOficial(limparDemo(caso.jurimetria.interno));

  const riscos = oficiais
    .filter((item) => item.alignment === "against" || item.alignment === "diverge")
    .map((item) => motivoDoVoto(item.alignment, item.ementa, item.chamber, item.date));

  return {
    amostra: oficiais.length || caso.jurimetria.amostra,
    padrao,
    interno,
    riscos: riscos.length ? riscos : caso.jurimetria.riscos.map(fraseOficial).filter((t) => t && !temMarcaDemo(t)),
  };
}

function dissidiosOficiais(juris: Jurisprudencia[], fallback: Dissidio[]): Dissidio[] {
  const grupos = new Map<string, Jurisprudencia[]>();
  for (const item of juris.filter((j) => j.ementa && j.chamber)) {
    const lista = grupos.get(item.chamber) || [];
    lista.push(item);
    grupos.set(item.chamber, lista);
  }

  if (!grupos.size) {
    return fallback
      .map((item) => ({
        ...item,
        orientacao: fraseOficial(limparDemo(item.orientacao)),
        nota: fraseOficial(limparDemo(item.nota)),
      }))
      .filter((item) => item.nota && !temMarcaDemo(item.nota));
  }

  return [...grupos.entries()].map(([camara, itens]) => {
    const forN = itens.filter((item) => item.alignment === "for").length;
    const againstN = itens.filter((item) => item.alignment === "against").length;
    const divergeN = itens.filter((item) => item.alignment === "diverge").length;
    const versus: Alinhamento =
      againstN >= forN && againstN >= divergeN
        ? "against"
        : divergeN >= forN
          ? "diverge"
          : "for";
    const amostra = itens[0];
    return {
      camara,
      orientacao: `Neste órgão: ${forN} a favor, ${againstN} contra, ${divergeN} divergente.`,
      versus,
      nota: motivoDoVoto(versus, amostra.ementa, amostra.chamber, amostra.date),
      fonte: "tjpr" as const,
    };
  });
}

function teseOficial(caso: Caso, juris: Jurisprudencia[]): string {
  const atual = fraseOficial(limparDemo(caso.tese));
  const primeira = juris.find((item) => item.ementa);
  if (!primeira) {
    return atual;
  }
  if (!atual || temMarcaDemo(caso.tese) || atual.length > 360 || /ementa oficial/i.test(atual)) {
    return resumoOficial(primeira.ementa, 300);
  }
  return atual;
}

function tesesOficiais(teses: Tese[], juris: Jurisprudencia[], tema: string): Tese[] {
  const limpas = teses
    .map((tese) => ({
      ...tese,
      titulo: fraseOficial(limparDemo(tese.titulo)),
      uso: fraseOficial(limparDemo(tese.uso)),
    }))
    .filter((tese) => tese.titulo && !temMarcaDemo(tese.uso));

  if (limpas.length && limpas.some((tese) => tese.uso && !/usar ementas oficiais/i.test(tese.uso))) {
    return limpas;
  }

  return juris
    .filter((item) => item.ementa)
    .slice(0, 3)
    .map((item, indice) => ({
      id: `tese-oficial-${indice}`,
      titulo: tema || item.chamber || "Tese do recorte oficial",
      uso: motivoDoVoto(item.alignment, item.ementa, item.chamber, item.date),
      forca: item.alignment === "for" ? "alta" : item.alignment === "diverge" ? "media" : "baixa",
      fonte: item.fonte,
    }));
}

function resultadosOficiais(
  resultados: ResultadoInterno[],
  juris: Jurisprudencia[]
): ResultadoInterno[] {
  if (juris.some((item) => item.ementa)) {
    return juris
      .filter((item) => item.ementa)
      .map((item, indice) => ({
        id: item.id || `res-oficial-${indice}`,
        titulo: [item.chamber, item.date].filter(Boolean).join(" · ") || item.acordao,
        desfecho: resumoOficial(item.ementa, 320),
        aprendizado: motivoDoVoto(item.alignment, item.ementa, item.chamber, item.date),
      }));
  }

  return resultados.map((item) => ({
    ...item,
    titulo: fraseOficial(limparDemo(item.titulo)),
    desfecho: resumoOficial(item.desfecho, 320),
    aprendizado: fraseOficial(limparDemo(item.aprendizado)),
  }));
}

function prazosOficiais(prazos: Prazo[]): Prazo[] {
  return prazos.map((prazo) => {
    const notes = prazo.notes ? limparDemo(prazo.notes) : "";
    const limpo: Prazo = {
      ...prazo,
      title: fraseOficial(limparDemo(prazo.title)),
      owner: fraseOficial(limparDemo(prazo.owner)) || "Equipe jurídica",
      trigger: fraseOficial(limparDemo(prazo.trigger)),
    };
    if (
      notes &&
      !temMarcaDemo(notes) &&
      !/simulado|n[aã]o representam intim|n[aã]o utilizar como prazo/i.test(notes)
    ) {
      limpo.notes = fraseOficial(notes);
    } else {
      delete limpo.notes;
    }
    return limpo;
  });
}

function documentosOficiais(itens: Documento[]): Documento[] {
  return itens.map((item) => ({
    ...item,
    titulo: fraseOficial(limparDemo(item.titulo)),
    tipo: fraseOficial(item.tipo),
    origem: fraseOficial(limparDemo(item.origem)),
    resumo: fraseOficial(limparDemo(item.resumo)),
  }));
}

function contratosDoAcervo(caso: Caso): Documento[] {
  if (caso.contratos.length) {
    return documentosOficiais(caso.contratos);
  }

  const origem = [...caso.peticoes, ...caso.decisoes, ...caso.documentos].filter((item) =>
    CONTRATO.test(item.titulo)
  );

  if (origem.length) {
    return documentosOficiais(
      origem.map((item, indice) => ({
        ...item,
        id: `ctr-acervo-${indice}`,
        tipo: item.tipo || "Contrato",
      }))
    );
  }

  if (CONTRATO.test(`${caso.titulo} ${caso.tema} ${caso.subtema} ${caso.resumo}`)) {
    const assunto = caso.resumo.match(/assunto[s]?(?:\s*datajud)?:?\s*([^.]*)/i);
    const titulo =
      (caso.subtema && CONTRATO.test(caso.subtema) && caso.subtema) ||
      (caso.tema && CONTRATO.test(caso.tema) && caso.tema) ||
      (assunto ? fraseOficial(assunto[1]) : "") ||
      "Contrato identificado na capa oficial";
    return [
      {
        id: "ctr-capa",
        titulo,
        tipo: "Capa do processo",
        data: caso.atualizacao,
        origem: caso.court || "DataJud",
        resumo: resumoOficial(caso.resumo || caso.tese, 240) || "Instrumento apontado na capa oficial do processo.",
      },
    ];
  }

  return [];
}

export function enriquecerCaso(caso: Caso): Caso {
  const jurisprudencias = caso.jurisprudencias.map(jurisOficial);
  const votos = jurisprudencias.reduce(
    (acc, item) => {
      if (item.alignment === "for") acc.for += 1;
      if (item.alignment === "against") acc.against += 1;
      if (item.alignment === "diverge") acc.diverge += 1;
      return acc;
    },
    { for: 0, against: 0, diverge: 0 }
  );
  const total = votos.for + votos.against + votos.diverge;

  return {
    ...caso,
    titulo: fraseOficial(limparDemo(caso.titulo)),
    tema: fraseOficial(limparDemo(caso.tema)),
    subtema: fraseOficial(limparDemo(caso.subtema)),
    chamber: fraseOficial(caso.chamber),
    cliente: fraseOficial(caso.cliente),
    resumo: fraseOficial(limparDemo(caso.resumo)),
    tese: teseOficial(caso, jurisprudencias),
    chanceRotulo: fraseOficial(limparDemo(caso.chanceRotulo)),
    chanceTexto: fraseOficial(limparDemo(caso.chanceTexto)),
    votos: total ? votos : caso.votos,
    peticoes: documentosOficiais(caso.peticoes),
    contratos: contratosDoAcervo({ ...caso, jurisprudencias }),
    documentos: documentosOficiais(caso.documentos),
    decisoes: documentosOficiais(caso.decisoes),
    modelos: documentosOficiais(caso.modelos),
    historico: caso.historico.map((item) => ({
      data: item.data,
      titulo: fraseOficial(limparDemo(item.titulo)),
      detalhe: fraseOficial(limparDemo(item.detalhe)),
    })),
    prazos: prazosOficiais(caso.prazos),
    teses: tesesOficiais(caso.teses, jurisprudencias, caso.subtema || caso.tema),
    resultados: resultadosOficiais(caso.resultados, jurisprudencias),
    jurisprudencias,
    dissidios: dissidiosOficiais(jurisprudencias, caso.dissidios),
    jurimetria: jurimetriaOficial(caso, jurisprudencias),
  };
}
