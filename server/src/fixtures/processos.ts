import { Processo } from "@models/processo.model";

export const NUMERO_PROCESSO_DEMO = "9000064-42.2023.8.26.0100";

export const PROCESSO_BANCARIO: Processo = {
  processNumber: NUMERO_PROCESSO_DEMO,
  court: "TJSP",
  courtUnit: "Foro Central Cível — São Paulo",
  caseClass: "Apelação Cível",
  subjects: [
    "Contratos bancários",
    "Revisão de contrato",
    "Tarifa de cadastro",
    "Seguro prestamista",
  ],
  chamber: "15ª Câmara de Direito Privado",
  organ: "Tribunal de Justiça do Estado de São Paulo",
  degree: "2º grau",
  distributionDate: "2023-08-10",
  parties: [
    { papel: "Autor / Apelante", nome: "A. S. Oliveira" },
    { papel: "Réu / Apelado", nome: "Banco Exemplo S.A." },
  ],
  movements: [
    {
      data: "2023-08-10",
      descricao:
        "Distribuição — ação revisionista de contrato de financiamento de veículo.",
    },
    {
      data: "2024-01-22",
      descricao: "Sentença — pedidos julgados improcedentes.",
    },
    {
      data: "2024-03-15",
      descricao:
        "Apelação remetida à 15ª Câmara de Direito Privado (órgão extraído do andamento).",
    },
  ],
  thesis:
    "Revisão de financiamento de veículo: abusividade de tarifa de cadastro e de seguro prestamista embutido.",
  summary:
    "Consumidor pede revisão de contrato de financiamento de veículo. Alega cobrança de tarifa de cadastro sem contraprestação e de seguro prestamista não contratado de forma destacada. A sentença de 1º grau julgou improcedentes os pedidos. O recurso está na 15ª Câmara de Direito Privado do TJSP.",
  chamberOrientation: "rejeita_revisao",
};

export const PROCESSOS_POR_NUMERO: Record<string, Processo> = {
  [NUMERO_PROCESSO_DEMO]: PROCESSO_BANCARIO,
};
