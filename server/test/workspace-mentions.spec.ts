import { describe, expect, it } from "vitest";
import { extrairMencoes } from "../src/modules/workspace/workspace-mentions";

const DIR = [
  { id: "u-001", nome: "Dra. Helena Prado", papel: "socio" as const, escritorio: "prado-advogados" },
  { id: "u-002", nome: "Dr. Rafael Nunes", papel: "advogado" as const, escritorio: "prado-advogados" },
];

describe("extrairMencoes", () => {
  it("resolves exact office names", () => {
    const achados = extrairMencoes("Oi @Dr. Rafael Nunes, vê isso", DIR);
    expect(achados.map((p) => p.id)).toEqual(["u-002"]);
  });

  it("ignores unknown mentions", () => {
    expect(extrairMencoes("Oi @Desconhecido", DIR)).toEqual([]);
  });

  it("dedupes repeated mentions", () => {
    const achados = extrairMencoes("@Dr. Rafael Nunes e @Dr. Rafael Nunes", DIR);
    expect(achados).toHaveLength(1);
  });
});
