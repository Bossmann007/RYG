import { describe, expect, it } from "vitest";
import {
  enriquecerCaso,
  fraseOficial,
  limparDemo,
  motivoDoVoto,
  temMarcaDemo,
} from "../src/modules/casos/leitura-oficial";
import { aplicarPoliticaCaso } from "../src/common/security/caso-policy";
import { Caso } from "../src/models/caso.model";

describe("leitura oficial", () => {
  it("remove marca de demo sem apagar o fato oficial", () => {
    const texto = limparDemo(
      "Orientação descritiva a partir de ementas oficiais TJPR (heurística de demo)."
    );
    expect(temMarcaDemo(texto)).toBe(false);
    expect(texto).toMatch(/ementas oficiais/i);
  });

  it("passa ementa em caixa alta para leitura corrida", () => {
    expect(fraseOficial("EMBARGOS REJEITADOS. AUSÊNCIA DE OMISSÃO.")).toBe(
      "Embargos rejeitados. Ausência de omissão."
    );
  });

  it("explica voto contra a partir do dispositivo oficial", () => {
    const motivo = motivoDoVoto(
      "against",
      "EMBARGOS DE DECLARAÇÃO. AUSÊNCIA DE OMISSÃO. EMBARGOS REJEITADOS.",
      "17ª Câmara Cível",
      "16/08/2021"
    );
    expect(motivo).toMatch(/17ª Câmara Cível/);
    expect(motivo).toMatch(/fecha contra/i);
    expect(temMarcaDemo(motivo)).toBe(false);
  });

  it("enriquece o caso sem texto de demo", () => {
    const caso = enriquecerCaso({
      id: "6",
      processoId: "6",
      titulo: "Apelação Cível",
      tema: "Contratos Bancários",
      subtema: "Contratos Bancários",
      processNumber: "9000006-45.2014.8.16.0193",
      court: "TJPR",
      chamber: "17ª Câmara Cível",
      status: "ATIVO",
      cliente: "Parte autora",
      partes: [{ papel: "Autor", nome: "Parte autora" }],
      resumo: "Apelação Cível perante o TJPR. Assunto DataJud: Contratos Bancários.",
      tese: "Com base na ementa oficial TJPR: EMBARGOS REJEITADOS.",
      atualizacao: "16/08/2021",
      chance: 25,
      chanceRotulo: "recorte descritivo TJPR",
      chanceTexto: "Índice descritivo. Não é modelo preditivo publicado.",
      votos: { for: 0, against: 1, diverge: 1 },
      peticoes: [],
      contratos: [],
      documentos: [],
      decisoes: [],
      modelos: [],
      historico: [],
      prazos: [
        {
          id: "1",
          title: "Responder à intimação",
          kind: "manifestacao",
          dueAt: "2026-09-08",
          days: 5,
          calendar: "uteis",
          status: "vencido",
          owner: "Equipe jurídica — demonstração",
          trigger: "Intimação nos autos.",
          gatilhoFonte: "acervo_interno",
          notes: "[DEMO_PRAZOS_INTIMACAO_V1] Dados fictícios para demonstração.",
        },
      ],
      teses: [],
      resultados: [],
      conversas: [],
      jurisprudencias: [
        {
          id: "j1",
          processNumber: "9000006-45.2014.8.16.0193",
          acordao: "TJPR-1",
          court: "TJPR",
          chamber: "17ª Câmara Cível",
          reporter: "Des. Relator",
          date: "16/08/2021",
          status: "TRANSITADO_EM_JULGADO",
          alignment: "against",
          ementa: "EMBARGOS DE DECLARAÇÃO. AUSÊNCIA DE OMISSÃO. EMBARGOS REJEITADOS.",
          pontos: [],
          essencial: { resumo: "Alinhamento no recorte da demo: contra.", itens: [] },
          fortalecer: { resumo: "", itens: [] },
          blindar: { resumo: "", itens: [] },
          contrapor: { resumo: "", itens: [] },
          citavel: true,
          fonte: "tjpr",
        },
      ],
      dissidios: [
        {
          camara: "17ª Câmara Cível",
          orientacao: "No recorte.",
          versus: "against",
          nota: "Orientação descritiva (heurística de demo).",
        },
      ],
      jurimetria: {
        amostra: 1,
        padrao: "Corpus oficial.",
        interno: "Classificação heurística sobre o texto oficial (demo).",
        riscos: [],
      },
    } as Caso);

    const limpo = aplicarPoliticaCaso(caso);
    expect(temMarcaDemo(limpo.jurimetria.interno)).toBe(false);
    expect(limpo.prazos[0].owner).toBe("Equipe jurídica");
    expect(limpo.prazos[0].notes).toBeUndefined();
    expect(limpo.jurisprudencias[0].essencial.resumo).toMatch(/fecha contra/i);
    expect(limpo.contratos.length).toBeGreaterThan(0);
  });
});
