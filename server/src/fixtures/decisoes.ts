import { Decisao } from "@models/decisao.model";
import { CLIENTE_OLIVEIRA_ID, CLIENTE_SOUZA_ID } from "./clientes";
import { NUMERO_PROCESSO_SOUZA } from "./peticoes";
import { NUMERO_PROCESSO_DEMO } from "./processos";

export const DECISAO_SOUZA_SANEADORA_ID = "dec_souza_saneadora";
export const DECISAO_SOUZA_PERICIA_ID = "dec_souza_pericia";
export const DECISAO_OLIVEIRA_SENTENCA_ID = "dec_oliveira_sentenca";

export const DECISOES_INICIAIS: Decisao[] = [
  {
    id: DECISAO_SOUZA_SANEADORA_ID,
    processNumber: NUMERO_PROCESSO_SOUZA,
    clienteId: CLIENTE_SOUZA_ID,
    title: "Decisão saneadora",
    kind: "decisao_interlocutoria",
    court: "TJPR",
    chamber: "13ª Câmara Cível",
    decidedAt: "2024-04-18",
    outcome: "outro",
    status: "publicada",
    summary:
      "Determinou ao banco fictício a juntada do contrato integral e legível.",
    createdAt: "2024-04-18T12:00:00.000Z",
    updatedAt: "2024-04-18T12:00:00.000Z",
  },
  {
    id: DECISAO_SOUZA_PERICIA_ID,
    processNumber: NUMERO_PROCESSO_SOUZA,
    clienteId: CLIENTE_SOUZA_ID,
    title: "Decisão sobre prova",
    kind: "decisao_interlocutoria",
    court: "TJPR",
    decidedAt: "2024-08-30",
    outcome: "deferido",
    status: "publicada",
    summary: "Deferiu perícia contábil limitada às tarifas discutidas no caso sintético.",
    createdAt: "2024-08-30T12:00:00.000Z",
    updatedAt: "2024-08-30T12:00:00.000Z",
  },
  {
    id: DECISAO_OLIVEIRA_SENTENCA_ID,
    processNumber: NUMERO_PROCESSO_DEMO,
    clienteId: CLIENTE_OLIVEIRA_ID,
    title: "Sentença de improcedência",
    kind: "sentenca",
    court: "TJSP",
    decidedAt: "2024-01-22",
    outcome: "improcedente",
    status: "publicada",
    summary:
      "Julgou improcedentes os pedidos revisionais do financiamento fictício de veículo.",
    createdAt: "2024-01-22T12:00:00.000Z",
    updatedAt: "2024-01-22T12:00:00.000Z",
  },
];
