import { Processo } from "@models/processo.model";
import { ProcessSource } from "../process-source";

/** In-memory capas. Restart wipes the map. */
export class ManualProcessSource implements ProcessSource {
  readonly kind = "manual" as const;
  readonly configurado = true;

  private readonly porNumero = new Map<string, Processo>();

  registrar(processo: Processo): void {
    this.porNumero.set(processo.processNumber, { ...processo });
  }

  buscarCapa(numeroNormalizado: string): Processo | null {
    const processo = this.porNumero.get(numeroNormalizado);
    return processo ? { ...processo } : null;
  }
}
