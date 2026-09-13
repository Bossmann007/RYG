import { Peticao } from "@models/peticao.model";
import { NUMERO_PROCESSO_DEMO } from "./processos";
import { CLIENTE_OLIVEIRA_ID, CLIENTE_SOUZA_ID } from "./clientes";

export const NUMERO_PROCESSO_SOUZA = "9000032-85.2024.8.16.0001";

export const PETICOES_INICIAIS: Peticao[] = [
  {
    id: "pet_oliveira_inicial",
    clienteId: CLIENTE_OLIVEIRA_ID,
    processNumber: NUMERO_PROCESSO_DEMO,
    title: "Petição inicial",
    kind: "inicial",
    status: "juntada",
    filedAt: "2023-08-10",
    summary:
      "Revisão de financiamento de veículo. Tarifa de cadastro e seguro prestamista.",
    createdAt: "2023-08-10T12:00:00.000Z",
    updatedAt: "2023-08-10T12:00:00.000Z",
  },
  {
    id: "pet_souza_inicial",
    clienteId: CLIENTE_SOUZA_ID,
    processNumber: NUMERO_PROCESSO_SOUZA,
    title: "Petição inicial",
    kind: "inicial",
    status: "juntada",
    filedAt: "2024-03-12",
    summary:
      "Revisão da cédula, repetição do indébito e exibição do contrato integral.",
    createdAt: "2024-03-12T12:00:00.000Z",
    updatedAt: "2024-03-12T12:00:00.000Z",
  },
  {
    id: "pet_souza_replica",
    clienteId: CLIENTE_SOUZA_ID,
    processNumber: NUMERO_PROCESSO_SOUZA,
    title: "Réplica à contestação",
    kind: "replica",
    status: "juntada",
    filedAt: "2024-06-02",
    summary: "Resposta à tese de que o CDC não incidiria sobre a cédula.",
    createdAt: "2024-06-02T12:00:00.000Z",
    updatedAt: "2024-06-02T12:00:00.000Z",
  },
];
