import { Processo } from "@models/processo.model";
import { ProcessSource } from "../process-source";

/**
 * In-memory manual capas keyed by office_id. No external scrape.
 * Seed one demo CNJ under prado-advogados for PROCESS_SOURCE=manual proofs.
 * Lookup without officeId fail-closed (null) so public routes cannot read writes.
 */
export class ManualProcessSource implements ProcessSource {
  readonly kind = "manual" as const;
  private readonly porEscritorio = new Map<string, Map<string, Processo>>();

  constructor(seed: Array<{ officeId: string; processo: Processo }> = [SEED_PRADO]) {
    for (const item of seed) {
      this.registrar(item.officeId, item.processo);
    }
  }

  buscarCapa(numeroNormalizado: string, officeId?: string): Processo | null {
    const escritorio = (officeId || "").trim();
    if (!escritorio) {
      return null;
    }
    const capa = this.porEscritorio.get(escritorio)?.get(numeroNormalizado);
    return capa ? clonar(capa) : null;
  }

  registrar(officeId: string, processo: Processo): Processo {
    const escritorio = officeId.trim();
    if (!escritorio) {
      throw new Error("officeId obrigatório para capa manual.");
    }
    const copia = clonar(processo);
    let mapa = this.porEscritorio.get(escritorio);
    if (!mapa) {
      mapa = new Map();
      this.porEscritorio.set(escritorio, mapa);
    }
    mapa.set(copia.processNumber, copia);
    return clonar(copia);
  }
}

function clonar(processo: Processo): Processo {
  return {
    ...processo,
    parties: [...(processo.parties || [])],
    movements: [...(processo.movements || [])],
    subjects: [...(processo.subjects || [])],
  };
}

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

const SEED_PRADO = {
  officeId: "prado-advogados",
  processo: CAPA_MANUAL_DEMO,
};
