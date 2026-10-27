import { ProcessSource, ProcessSourceKind, PROCESS_SOURCE_KINDS } from "./process-source";
import { FixtureProcessSource } from "./sources/fixture.process-source";
import { ManualProcessSource } from "./sources/manual.process-source";
import { UnconfiguredProcessSource } from "./sources/unconfigured.process-source";

export function criarProcessSource(kindBruto?: string): ProcessSource {
  const kind = normalizarKind(kindBruto);

  switch (kind) {
    case "fixture":
      return new FixtureProcessSource();
    case "manual":
      return new ManualProcessSource();
    case "datajud":
    case "eproc":
    case "upload":
      return new UnconfiguredProcessSource(kind);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function normalizarKind(bruto?: string): ProcessSourceKind {
  const valor = (bruto || "fixture").trim().toLowerCase();
  if ((PROCESS_SOURCE_KINDS as readonly string[]).includes(valor)) {
    return valor as ProcessSourceKind;
  }
  return "fixture";
}
