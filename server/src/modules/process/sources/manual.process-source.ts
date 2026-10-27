import { Processo } from "@models/processo.model";
import { ProcessSource } from "../process-source";

/**
 * In-memory manual capas. Office staff registers a capa; no external scrape.
 * Seed one demo CNJ so PROCESS_SOURCE=manual proves GET /api/process/capa.
 */
export class ManualProcessSource implements ProcessSource {
  readonly kind = "manual" as const;
  private readonly capas = new Map<string, Processo>();

  constructor(seed: Processo[] = [CAPA_MANUAL_DEMO]) {
    for (const processo of seed) {
      this.registrar(processo);
    }
  }

  buscarCapa(numeroNormalizado: string): Processo | null {
    const achado = this.capas.get(numeroNormalizado);
    return achado ? { ...achado, parties: [...achado.parties], movements: [...achado.movements], subjects: [...achado.subjects] } : null;
  }

  registrar(processo: Processo): Processo {
    const copia: Processo = {
      ...processo,
      parties: [...(processo.parties || [])],
      movements: [...(processo.movements || [])],
      subjects: [...(processo.subjects || [])],
    };
    this.capas.set(processo.processNumber, copia);
    return { ...copia, parties: [...copia.parties], movements: [...copia.movements], subjects: [...copia.subjects] };
  }

  listarNumeros(): string[] {
    return [...this.capas.keys()].sort();
  }
}

/** Demo CNJ only for manual adapter evidence — not the fixture banking set. */
export const CAPA_MANUAL_DEMO: Processo = {
  processNumber: "0000999-99.2026.8.16.0001",
  court: "TJPR",
  courtUnit: "1ª Vara Cível de Curitiba",
  caseClass: "Procedimento Comum Cível",
  subjects: ["Registro manual"],
  chamber: "—",
  organ: "1ª Vara Cível de Curitiba",
  degree: "G1",
  distributionDate: "2026-10-01",
  parties: [
    { papel: "Autor", nome: "Parte Autora Manual" },
    { papel: "Réu", nome: "Parte Ré Manual" },
  ],
  movements: [
    { data: "2026-10-01", descricao: "Distribuição (registro manual no hub)." },
  ],
  thesis: "Capa inserida via ProcessSource=manual.",
  summary: "Processo de demonstração do adaptador manual (sem DataJud).",
  chamberOrientation: "rejeita_revisao",
};
