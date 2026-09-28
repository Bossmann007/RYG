import { Processo } from "@models/processo.model";
import { ProcessSource, ProcessSourceKind } from "../process-source";

/** Stub until a real connector lands. Returns null so callers stay fail-closed. */
export class UnconfiguredProcessSource implements ProcessSource {
  constructor(readonly kind: Exclude<ProcessSourceKind, "fixture">) {}

  buscarCapa(_numeroNormalizado: string): Processo | null {
    return null;
  }
}
