import {
  CHANCE_INDISPONIVEL,
  FonteFato,
  ProvenienciaCaso,
  fonteDeTexto,
} from "@common/security/fonte-fato";
import { ementaCitavel } from "@common/security/cite-or-silent";
import { sanitizeUntrustedList, sanitizeUntrustedText } from "@common/security/untrusted-text";
import {
  BlocoAnalise,
  Caso,
  Dissidio,
  Documento,
  Jurisprudencia,
  Prazo,
  Tese,
} from "@models/caso.model";

const BLOCO_VAZIO: BlocoAnalise = { resumo: "", itens: [] };

export function aplicarPoliticaCaso(caso: Caso): Caso {
  const jurisprudencias = (caso.jurisprudencias || []).map(carimbarJurisprudencia);
  const teses = (caso.teses || []).map(carimbarTese);

  const limpo: Caso = {
    ...caso,
    id: sanitizeUntrustedText(caso.id),
    processoId: sanitizeUntrustedText(caso.processoId),
    titulo: sanitizeUntrustedText(caso.titulo),
    tema: sanitizeUntrustedText(caso.tema),
    subtema: sanitizeUntrustedText(caso.subtema),
    processNumber: sanitizeUntrustedText(caso.processNumber),
    court: sanitizeUntrustedText(caso.court),
    chamber: sanitizeUntrustedText(caso.chamber),
    cliente: sanitizeUntrustedText(caso.cliente),
    resumo: sanitizeUntrustedText(caso.resumo),
    tese: sanitizeUntrustedText(caso.tese),
    atualizacao: sanitizeUntrustedText(caso.atualizacao),
    chance: 0,
    chanceRotulo: CHANCE_INDISPONIVEL,
    chanceTexto: CHANCE_INDISPONIVEL,
    partes: (caso.partes || []).map((parte) => ({
      papel: sanitizeUntrustedText(parte.papel),
      nome: sanitizeUntrustedText(parte.nome),
    })),
    peticoes: (caso.peticoes || []).map(carimbarDocumento),
    contratos: (caso.contratos || []).map(carimbarDocumento),
    documentos: (caso.documentos || []).map(carimbarDocumento),
    decisoes: (caso.decisoes || []).map(carimbarDocumento),
    modelos: (caso.modelos || []).map(carimbarDocumento),
    historico: (caso.historico || []).map((item) => ({
      data: sanitizeUntrustedText(item.data),
      titulo: sanitizeUntrustedText(item.titulo),
      detalhe: sanitizeUntrustedText(item.detalhe),
    })),
    prazos: (caso.prazos || []).map(carimbarPrazo),
    teses,
    resultados: (caso.resultados || []).map((item) => ({
      id: sanitizeUntrustedText(item.id),
      titulo: sanitizeUntrustedText(item.titulo),
      desfecho: sanitizeUntrustedText(item.desfecho),
      aprendizado: sanitizeUntrustedText(item.aprendizado),
    })),
    conversas: (caso.conversas || []).map((item) => ({
      ...item,
      id: sanitizeUntrustedText(item.id),
      autora: sanitizeUntrustedText(item.autora),
      papel: sanitizeUntrustedText(item.papel),
      hora: sanitizeUntrustedText(item.hora),
      texto: sanitizeUntrustedText(item.texto),
    })),
    jurisprudencias,
    dissidios: (caso.dissidios || []).map(carimbarDissidio),
    jurimetria: {
      amostra: Number.isFinite(caso.jurimetria?.amostra) ? caso.jurimetria.amostra : 0,
      padrao: sanitizeUntrustedText(caso.jurimetria?.padrao),
      interno: sanitizeUntrustedText(caso.jurimetria?.interno),
      riscos: sanitizeUntrustedList(caso.jurimetria?.riscos || []),
    },
    fontes: {} as ProvenienciaCaso,
  };

  limpo.fontes = derivarFontes(limpo, jurisprudencias);

  return limpo;
}

function carimbarDocumento(doc: Documento): Documento {
  return {
    id: sanitizeUntrustedText(doc.id),
    titulo: sanitizeUntrustedText(doc.titulo),
    tipo: sanitizeUntrustedText(doc.tipo),
    data: sanitizeUntrustedText(doc.data),
    origem: sanitizeUntrustedText(doc.origem),
    resumo: sanitizeUntrustedText(doc.resumo),
  };
}

function carimbarPrazo(prazo: Prazo): Prazo {
  const limpo: Prazo = {
    id: sanitizeUntrustedText(prazo.id),
    title: sanitizeUntrustedText(prazo.title),
    kind: prazo.kind,
    dueAt: sanitizeUntrustedText(prazo.dueAt),
    days: Number.isFinite(prazo.days) ? prazo.days : 0,
    calendar: prazo.calendar,
    status: prazo.status,
    owner: sanitizeUntrustedText(prazo.owner),
    trigger: sanitizeUntrustedText(prazo.trigger),
    gatilhoFonte: prazo.gatilhoFonte || "acervo_interno",
  };

  if (prazo.startedAt) {
    limpo.startedAt = sanitizeUntrustedText(prazo.startedAt);
  }

  if (prazo.notes) {
    limpo.notes = sanitizeUntrustedText(prazo.notes);
  }

  return limpo;
}

function carimbarTese(tese: Tese): Tese {
  return {
    id: sanitizeUntrustedText(tese.id),
    titulo: sanitizeUntrustedText(tese.titulo),
    uso: sanitizeUntrustedText(tese.uso),
    forca: tese.forca,
    fonte: "acervo_interno",
  };
}

function carimbarDissidio(item: Dissidio): Dissidio {
  return {
    camara: sanitizeUntrustedText(item.camara),
    orientacao: sanitizeUntrustedText(item.orientacao),
    versus: item.versus,
    nota: sanitizeUntrustedText(item.nota),
    fonte: "acervo_interno",
  };
}

function carimbarJurisprudencia(item: Jurisprudencia): Jurisprudencia {
  const citavel = ementaCitavel({
    citavel: item.citavel,
    ementa: item.ementa,
    ementaSnippet: item.ementa,
    processNumber: item.processNumber,
    court: item.court,
    acordao: item.acordao,
    date: item.date,
  });

  const fonte = derivarFonteJurisprudencia(item.fonte, item.court, citavel);

  return {
    ...item,
    id: sanitizeUntrustedText(item.id),
    processNumber: sanitizeUntrustedText(item.processNumber),
    acordao: sanitizeUntrustedText(item.acordao),
    court: sanitizeUntrustedText(item.court),
    chamber: sanitizeUntrustedText(item.chamber),
    reporter: sanitizeUntrustedText(item.reporter),
    date: sanitizeUntrustedText(item.date),
    ementa: citavel ? sanitizeUntrustedText(item.ementa) : "",
    pontos: sanitizeUntrustedList(item.pontos || []),
    essencial: sanitizarBloco(item.essencial),
    fortalecer: sanitizarBloco(item.fortalecer),
    blindar: sanitizarBloco(item.blindar),
    contrapor: sanitizarBloco(item.contrapor),
    citavel,
    fonte,
  };
}

function derivarFonteJurisprudencia(
  fonteOriginal: FonteFato,
  court: string,
  citavel: boolean
): FonteFato {
  if (fonteOriginal === "tjpr" || fonteOriginal === "datajud") {
    return fonteOriginal;
  }

  if (citavel && court.toUpperCase() === "TJPR") {
    return "tjpr";
  }

  if (citavel) {
    return "datajud";
  }

  return "acervo_interno";
}

function sanitizarBloco(bloco: BlocoAnalise | undefined): BlocoAnalise {
  if (!bloco) {
    return BLOCO_VAZIO;
  }

  return {
    resumo: sanitizeUntrustedText(bloco.resumo),
    itens: sanitizeUntrustedList(bloco.itens || []),
  };
}

function derivarFontes(caso: Caso, jurisprudencias: Jurisprudencia[]): ProvenienciaCaso {
  const jurisFonte: FonteFato = !jurisprudencias.length
    ? "indisponivel"
    : jurisprudencias.some((item) => item.fonte === "datajud")
      ? "datajud"
      : "acervo_interno";

  const fontes = {
    titulo: fonteDeTexto(caso.titulo, "acervo_interno"),
    tema: fonteDeTexto(caso.tema, "acervo_interno"),
    subtema: fonteDeTexto(caso.subtema, "acervo_interno"),
    processNumber: fonteDeTexto(caso.processNumber, "acervo_interno"),
    court: fonteDeTexto(caso.court, "acervo_interno"),
    chamber: fonteDeTexto(caso.chamber, "acervo_interno"),
    status: caso.status ? "acervo_interno" : "indisponivel",
    cliente: fonteDeTexto(caso.cliente, "acervo_interno"),
    partes: caso.partes.length ? "acervo_interno" : "indisponivel",
    resumo: fonteDeTexto(caso.resumo, "acervo_interno"),
    tese: fonteDeTexto(caso.tese, "acervo_interno"),
    atualizacao: fonteDeTexto(caso.atualizacao, "acervo_interno"),
    chance: "indisponivel",
    votos: caso.votos.for + caso.votos.against + caso.votos.diverge > 0
      ? "acervo_interno"
      : "indisponivel",
    peticoes: caso.peticoes.length ? "acervo_interno" : "indisponivel",
    contratos: caso.contratos.length ? "acervo_interno" : "indisponivel",
    documentos: caso.documentos.length ? "acervo_interno" : "indisponivel",
    decisoes: caso.decisoes.length ? "acervo_interno" : "indisponivel",
    modelos: caso.modelos.length ? "acervo_interno" : "indisponivel",
    historico: caso.historico.length ? "acervo_interno" : "indisponivel",
    prazos: caso.prazos?.length ? "acervo_interno" : "indisponivel",
    teses: caso.teses.length ? "acervo_interno" : "indisponivel",
    resultados: caso.resultados.length ? "acervo_interno" : "indisponivel",
    conversas: caso.conversas.length ? "acervo_interno" : "indisponivel",
    jurisprudencias: jurisFonte,
    dissidios: caso.dissidios.length ? "acervo_interno" : "indisponivel",
    jurimetria:
      caso.jurimetria.amostra || caso.jurimetria.padrao || caso.jurimetria.interno
        ? "acervo_interno"
        : "indisponivel",
  } satisfies ProvenienciaCaso;

  return fontes;
}
