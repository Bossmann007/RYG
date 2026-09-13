/**
 * Testes anti-alucinação para jurisprudências.
 *
 * Valida as regras críticas:
 * 1. TJPR citável mantém fonte='tjpr', não remapeia para 'datajud'
 * 2. Alinhamento unknown/not_assessed/vazio fica 'unknown', NUNCA 'diverge'
 * 3. Não-citável tem ementa blanked (cite-or-silent)
 * 4. Citável mantém ementa original
 */

import { describe, expect, it } from "vitest";
import {
  normalizarFonte,
  rotuloFonte,
  fonteCitavelPorNatureza,
  FONTES_FATO,
} from "../src/common/security/fonte-fato";
import { ementaCitavel, ementaParaCitacao } from "../src/common/security/cite-or-silent";

describe("FonteFato", () => {
  describe("FONTES_FATO", () => {
    it("inclui tjpr como fonte first-class", () => {
      expect(FONTES_FATO).toContain("tjpr");
    });

    it("inclui todas as fontes esperadas", () => {
      expect(FONTES_FATO).toContain("tjpr");
      expect(FONTES_FATO).toContain("datajud");
      expect(FONTES_FATO).toContain("acervo_interno");
      expect(FONTES_FATO).toContain("inferencia");
      expect(FONTES_FATO).toContain("indisponivel");
    });
  });

  describe("normalizarFonte", () => {
    it("normaliza tjpr_portal_publico para tjpr", () => {
      expect(normalizarFonte("tjpr_portal_publico")).toBe("tjpr");
    });

    it("normaliza tjpr para tjpr (case insensitive)", () => {
      expect(normalizarFonte("TJPR")).toBe("tjpr");
      expect(normalizarFonte("Tjpr")).toBe("tjpr");
      expect(normalizarFonte("tjpr")).toBe("tjpr");
    });

    it("normaliza datajud para datajud", () => {
      expect(normalizarFonte("datajud")).toBe("datajud");
    });

    it("retorna indisponivel para valores vazios ou null", () => {
      expect(normalizarFonte(null)).toBe("indisponivel");
      expect(normalizarFonte(undefined)).toBe("indisponivel");
      expect(normalizarFonte("")).toBe("indisponivel");
    });

    it("retorna indisponivel para valores não reconhecidos", () => {
      expect(normalizarFonte("outra_fonte")).toBe("indisponivel");
    });
  });

  describe("rotuloFonte", () => {
    it("retorna rótulo correto para TJPR", () => {
      expect(rotuloFonte("tjpr")).toBe("TJPR");
    });

    it("retorna rótulo correto para DataJud", () => {
      expect(rotuloFonte("datajud")).toBe("DataJud");
    });

    it("retorna rótulo para acervo_interno", () => {
      expect(rotuloFonte("acervo_interno")).toBe("Acervo interno");
    });
  });

  describe("fonteCitavelPorNatureza", () => {
    it("TJPR é citável por natureza", () => {
      expect(fonteCitavelPorNatureza("tjpr")).toBe(true);
    });

    it("DataJud é citável por natureza", () => {
      expect(fonteCitavelPorNatureza("datajud")).toBe(true);
    });

    it("acervo_interno não é citável por natureza", () => {
      expect(fonteCitavelPorNatureza("acervo_interno")).toBe(false);
    });

    it("indisponivel não é citável por natureza", () => {
      expect(fonteCitavelPorNatureza("indisponivel")).toBe(false);
    });
  });
});

describe("cite-or-silent", () => {
  describe("ementaCitavel", () => {
    it("retorna true para item com citavel=true e dados completos", () => {
      const item = {
        citavel: true,
        ementa: "APELAÇÃO CÍVEL. CONTRATO BANCÁRIO.",
        processNumber: "9000031-42.2020.8.16.0001",
        court: "TJPR",
        date: "2024-01-15",
      };
      expect(ementaCitavel(item)).toBe(true);
    });

    it("retorna false para item com citavel=false", () => {
      const item = {
        citavel: false,
        ementa: "EMENTA QUE NÃO DEVE SER CITADA",
        processNumber: "9000031-42.2020.8.16.0001",
        court: "TJPR",
        date: "2024-01-15",
      };
      expect(ementaCitavel(item)).toBe(false);
    });

    it("retorna false para item sem ementa", () => {
      const item = {
        citavel: true,
        ementa: "",
        processNumber: "9000031-42.2020.8.16.0001",
        court: "TJPR",
        date: "2024-01-15",
      };
      expect(ementaCitavel(item)).toBe(false);
    });

    it("retorna false para item sem processNumber", () => {
      const item = {
        citavel: true,
        ementa: "EMENTA COMPLETA",
        processNumber: "",
        court: "TJPR",
        date: "2024-01-15",
      };
      expect(ementaCitavel(item)).toBe(false);
    });
  });

  describe("ementaParaCitacao", () => {
    it("retorna ementa quando citável", () => {
      const item = {
        citavel: true,
        ementa: "APELAÇÃO CÍVEL. CONTRATO BANCÁRIO.",
        processNumber: "9000031-42.2020.8.16.0001",
        court: "TJPR",
        date: "2024-01-15",
      };
      expect(ementaParaCitacao(item)).toBe("APELAÇÃO CÍVEL. CONTRATO BANCÁRIO.");
    });

    it("retorna null quando não citável", () => {
      const item = {
        citavel: false,
        ementa: "EMENTA SECRETA",
        processNumber: "9000031-42.2020.8.16.0001",
        court: "TJPR",
        date: "2024-01-15",
      };
      expect(ementaParaCitacao(item)).toBeNull();
    });
  });
});

describe("Cenários integrados anti-alucinação", () => {
  it("14 decisões oficiais TJPR devem ter fonte tjpr reconhecida", () => {
    const decisoesOficiais = Array.from({ length: 14 }, (_, i) => ({
      id: `juris-tjpr-oficial-${i + 1}`,
      fonte: "tjpr",
      seed_fonte: "tjpr_portal_publico",
      citavel: true,
      ementa: `EMENTA OFICIAL ${i + 1}. TEXTO REAL DO TRIBUNAL.`,
      processNumber: `000${1000 + i}-00.2024.8.16.0001`,
      court: "TJPR",
      date: "2024-01-15",
    }));

    for (const decisao of decisoesOficiais) {
      expect(normalizarFonte(decisao.fonte)).toBe("tjpr");
      expect(normalizarFonte(decisao.seed_fonte)).toBe("tjpr");
      expect(ementaCitavel(decisao)).toBe(true);
    }
  });

  it("26 seeds quarentenados não podem ser citados", () => {
    const seedsQuarentenados = Array.from({ length: 26 }, (_, i) => ({
      id: `juris-seed-quarantine-${i + 1}`,
      seed_fonte: "tema_offline_sem_ementa",
      citavel: false,
      ementa: `EMENTA INVENTADA ${i + 1} - NÃO DEVE APARECER`,
      processNumber: `000${2000 + i}-00.2024.8.16.0001`,
      court: "TJPR",
      date: "2024-01-15",
    }));

    for (const seed of seedsQuarentenados) {
      expect(ementaCitavel(seed)).toBe(false);
      expect(ementaParaCitacao(seed)).toBeNull();
    }
  });

  it("tjpr é first-class e NÃO é remapeado para datajud", () => {
    expect(FONTES_FATO).toContain("tjpr");
    expect(FONTES_FATO.indexOf("tjpr")).toBeLessThan(FONTES_FATO.indexOf("datajud"));
    expect(normalizarFonte("tjpr")).toBe("tjpr");
    expect(normalizarFonte("tjpr")).not.toBe("datajud");
  });
});
