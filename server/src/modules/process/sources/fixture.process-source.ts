import { Processo } from "@models/processo.model";
import { PROCESSOS_POR_NUMERO } from "../../../fixtures/processos";
import { ProcessSource } from "../process-source";

export class FixtureProcessSource implements ProcessSource {
  readonly kind = "fixture" as const;

  buscarCapa(numeroNormalizado: string, _officeId?: string): Processo | null {
    const processo = PROCESSOS_POR_NUMERO[numeroNormalizado];
    return processo ? { ...processo } : null;
  }
}
