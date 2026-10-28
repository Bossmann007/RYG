import { describe, expect, it } from "vitest";
import { deriveCiteStatus } from "../src/modules/xirp/xirp-cite";

describe("deriveCiteStatus", () => {
  it("is silent with no references", () => {
    expect(deriveCiteStatus([])).toBe("silent");
  });

  it("is cited when labels mark citável", () => {
    expect(
      deriveCiteStatus([{ label: "TJSP (15ª). Sentido favorável; citável." }]),
    ).toBe("cited");
  });

  it("is silent when every label is não citável", () => {
    expect(
      deriveCiteStatus([{ label: "Ref X. Sentido neutro; não citável." }]),
    ).toBe("silent");
  });

  it("is mixed when both appear", () => {
    expect(
      deriveCiteStatus([
        { label: "A; citável." },
        { label: "B; não citável." },
      ]),
    ).toBe("mixed");
  });

  it("is silent when labels omit citabilidade", () => {
    expect(deriveCiteStatus([{ label: "TJSP precedente sem marcador." }])).toBe(
      "silent",
    );
  });
});
