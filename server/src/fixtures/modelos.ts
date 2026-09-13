import { Modelo } from "@models/modelo.model";

export const MODELO_REPLICA_CDC_ID = "mod_replica_cdc";
export const MODELO_PARECER_TARIFAS_ID = "mod_parecer_tarifas";
export const MODELO_CHECKLIST_PROVA_ID = "mod_checklist_prova";

export const MODELOS_INICIAIS: Modelo[] = [
  {
    id: MODELO_REPLICA_CDC_ID,
    title: "Modelo de réplica — CDC bancário",
    kind: "peticao",
    area: "bancario",
    status: "ativo",
    tags: ["cdc", "tarifas", "replica"],
    body: "Estrutura sintética já usada em casos fictícios de revisão de cédula.",
    createdAt: "2023-01-10T12:00:00.000Z",
    updatedAt: "2023-01-10T12:00:00.000Z",
  },
  {
    id: MODELO_PARECER_TARIFAS_ID,
    title: "Parecer interno sobre tarifas",
    kind: "parecer",
    area: "bancario",
    status: "ativo",
    tags: ["tarifas", "tjpr"],
    body: "Mapa sintético do que câmaras fictícias do TJPR aceitam e rejeitam.",
    createdAt: "2024-02-01T12:00:00.000Z",
    updatedAt: "2024-02-01T12:00:00.000Z",
  },
  {
    id: MODELO_CHECKLIST_PROVA_ID,
    title: "Checklist de prova em revisional",
    kind: "outro",
    area: "consumidor",
    status: "ativo",
    tags: ["prova", "checklist"],
    body: "O que pedir ao cliente fictício antes de protocolar a inicial.",
    createdAt: "2024-03-01T12:00:00.000Z",
    updatedAt: "2024-03-01T12:00:00.000Z",
  },
];
