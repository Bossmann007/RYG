import { describe, expect, it } from "vitest";
import { calcularPrazoCpc } from "../src/modules/tools/prazo-cpc";

describe("calcularPrazoCpc", () => {
  it("counts consecutive calendar days", () => {
    const r = calcularPrazoCpc({
      startedAt: "2026-10-01",
      days: 5,
      calendar: "corridos",
    });
    expect(r.dueAt).toBe("2026-10-06");
  });

  it("skips weekend for business days", () => {
    // Thu 2026-10-01 + 1 útil → Fri 02; +2 → Mon 05
    const r = calcularPrazoCpc({
      startedAt: "2026-10-01",
      days: 2,
      calendar: "uteis",
    });
    expect(r.dueAt).toBe("2026-10-05");
  });

  it("skips fixed holiday", () => {
    // Fri 2026-04-30 + 1 útil skips Sat/Sun and May 1 → Mon 2026-05-04
    const r = calcularPrazoCpc({
      startedAt: "2026-04-30",
      days: 1,
      calendar: "uteis",
    });
    expect(r.dueAt).toBe("2026-05-04");
    expect(r.feriadosAplicados).toContain("2026-05-01");
  });
});
