import { JurisprudenciaFixture } from "@models/jurisprudencia.model";

export const JURISPRUDENCIAS_BANCARIAS: JurisprudenciaFixture[] = [
  {
    id: "juris-tjsp-15-tarifa",
    court: "TJSP",
    chamber: "15ª Câmara de Direito Privado",
    organ: "Tribunal de Justiça do Estado de São Paulo",
    ementaSnippet:
      "Apelação. Contrato bancário. Financiamento de veículo. Tarifa de cadastro prevista no instrumento. Ausência de abusividade quando informada de forma clara. Recurso desprovido.",
    voteSummary: "Unânime — negaram provimento (mantém a tarifa de cadastro).",
    orientation: "rejeita_revisao",
    relatedSubjects: [
      "Contratos bancários",
      "Tarifa de cadastro",
      "Revisão de contrato",
    ],
  },
  {
    id: "juris-tjsp-11-prestamista",
    court: "TJSP",
    chamber: "11ª Câmara de Direito Privado",
    organ: "Tribunal de Justiça do Estado de São Paulo",
    ementaSnippet:
      "Apelação. Seguro prestamista embutido em financiamento. Venda casada. Ausência de contratação destacada. Restituição dos valores. Recurso provido.",
    voteSummary:
      "Maioria — deram provimento (afastam o seguro prestamista).",
    orientation: "aceita_revisao",
    relatedSubjects: [
      "Seguro prestamista",
      "Contratos bancários",
      "Revisão de contrato",
    ],
  },
  {
    id: "juris-tjsp-37-tarifa",
    court: "TJSP",
    chamber: "37ª Câmara de Direito Privado",
    organ: "Tribunal de Justiça do Estado de São Paulo",
    ementaSnippet:
      "Tarifa de cadastro. Cobrança sem demonstração de serviço efetivo. Abusividade reconhecida. Provimento parcial para afastar a tarifa e manter os juros pactuados.",
    voteSummary:
      "Unânime — provimento parcial (afasta só a tarifa de cadastro).",
    orientation: "aceita_revisao",
    relatedSubjects: [
      "Tarifa de cadastro",
      "Revisão de contrato",
      "Contratos bancários",
    ],
  },
  {
    id: "juris-stj-2secao-cadastro",
    court: "STJ",
    chamber: "2ª Seção",
    organ: "Superior Tribunal de Justiça",
    ementaSnippet:
      "Tarifa de cadastro. Validade da cobrança no início do relacionamento, desde que pactuada. Orientação consolidada em repetitivo. Não se presume abusividade pelo só fato da cobrança.",
    voteSummary:
      "Maioria — validade da tarifa de cadastro se pactuada no início do contrato.",
    orientation: "rejeita_revisao",
    relatedSubjects: ["Tarifa de cadastro", "Contratos bancários"],
  },
  {
    id: "juris-tjsp-13-juros",
    court: "TJSP",
    chamber: "13ª Câmara de Direito Privado",
    organ: "Tribunal de Justiça do Estado de São Paulo",
    ementaSnippet:
      "Financiamento veicular. Juros e encargos acessórios. Revisão parcial admitida quando o seguro prestamista é imposto sem opção real de recusa. Provimento em parte.",
    voteSummary:
      "Maioria — revisão parcial (afastam o seguro, mantêm os juros).",
    orientation: "aceita_revisao",
    relatedSubjects: [
      "Seguro prestamista",
      "Revisão de contrato",
      "Contratos bancários",
    ],
  },
  {
    id: "juris-tjsp-16-contrato",
    court: "TJSP",
    chamber: "16ª Câmara de Direito Privado",
    organ: "Tribunal de Justiça do Estado de São Paulo",
    ementaSnippet:
      "Contrato bancário. Pacta sunt servanda. Tarifa de cadastro e seguro expressamente previstos. Recurso do consumidor desprovido.",
    voteSummary:
      "Unânime — negaram provimento (mantêm tarifa e seguro pactuados).",
    orientation: "rejeita_revisao",
    relatedSubjects: [
      "Contratos bancários",
      "Tarifa de cadastro",
      "Seguro prestamista",
    ],
  },
  {
    id: "juris-tjsp-22-sem-ementa",
    court: "TJSP",
    chamber: "22ª Câmara de Direito Privado",
    organ: "Tribunal de Justiça do Estado de São Paulo",
    ementaSnippet: null,
    voteSummary: null,
    orientation: null,
    relatedSubjects: ["Contratos bancários", "Revisão de contrato"],
  },
];
