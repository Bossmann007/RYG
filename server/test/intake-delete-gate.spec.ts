import { describe, expect, it } from "vitest";
import { decidirPurgeIntake } from "../src/modules/casos/intake-delete-gate";

describe("decidirPurgeIntake", () => {
  it("purges children after an intake capa DELETE", () => {
    expect(decidirPurgeIntake({ capaRemovida: true, statusRestante: null })).toBe("purge");
  });

  it("conflicts when a non-intake capa still exists", () => {
    expect(
      decidirPurgeIntake({ capaRemovida: false, statusRestante: "ativo" }),
    ).toBe("conflict");
  });

  it("purges orphan children when the capa row is already gone", () => {
    expect(decidirPurgeIntake({ capaRemovida: false, statusRestante: null })).toBe("purge");
  });
});
