import { Cliente } from "@models/cliente.model";

export const CLIENTE_OLIVEIRA_ID = "cli_oliveira";
export const CLIENTE_SOUZA_ID = "cli_souza";

export const CLIENTES_INICIAIS: Cliente[] = [
  {
    id: CLIENTE_OLIVEIRA_ID,
    displayName: "A. S. Oliveira",
    kind: "pessoa_fisica",
    status: "ativo",
    notes: "Revisional de financiamento de veículo. Parte já minimizada na capa.",
    createdAt: "2023-08-01T12:00:00.000Z",
    updatedAt: "2023-08-01T12:00:00.000Z",
  },
  {
    id: CLIENTE_SOUZA_ID,
    displayName: "Maria Clara Souza",
    kind: "pessoa_fisica",
    status: "ativo",
    notes: "Revisional de cédula bancária. Nome fictício da demo do acervo.",
    createdAt: "2024-03-10T12:00:00.000Z",
    updatedAt: "2024-03-10T12:00:00.000Z",
  },
];
