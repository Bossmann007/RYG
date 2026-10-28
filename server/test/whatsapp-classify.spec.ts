import { describe, expect, it } from "vitest";
import { avaliarEnvioWhatsapp, detectarPiiEnvio } from "../src/modules/whatsapp/whatsapp-classify";

describe("whatsapp-classify", () => {
  it("detects CNJ and CPF", () => {
    expect(
      detectarPiiEnvio("CNJ 0001234-56.2026.8.16.0001 CPF 123.456.789-00"),
    ).toEqual(expect.arrayContaining(["cnj", "cpf"]));
  });

  it("requires classification ack", () => {
    const r = avaliarEnvioWhatsapp({
      texto: "oi",
      classificationAck: false,
      classification: "interno",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown classification labels", () => {
    const r = avaliarEnvioWhatsapp({
      texto: "oi",
      classificationAck: true,
      classification: "cliente",
    });
    expect(r.ok).toBe(false);
  });

  it("allows clean text with ack", () => {
    const r = avaliarEnvioWhatsapp({
      texto: "Lembrete de audiencia amanha",
      classificationAck: true,
      classification: "interno",
    });
    expect(r).toEqual({ ok: true });
  });

  it("blocks PII without template or SafeDTO release", () => {
    const r = avaliarEnvioWhatsapp({
      texto: "CPF 123.456.789-00",
      classificationAck: true,
      classification: "sigiloso",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.pii).toContain("cpf");
    }
  });

  it("allows PII with approved template", () => {
    const r = avaliarEnvioWhatsapp({
      texto: "CPF 123.456.789-00",
      classificationAck: true,
      classification: "sigiloso",
      templateId: "prazo_simples",
    });
    expect(r).toEqual({ ok: true });
  });

  it("allows PII with SafeDTO release id", () => {
    const r = avaliarEnvioWhatsapp({
      texto: "CNJ 0001234-56.2026.8.16.0001",
      classificationAck: true,
      classification: "sigiloso",
      safeDtoReleaseId: "rel_abc123def0",
    });
    expect(r).toEqual({ ok: true });
  });
});
