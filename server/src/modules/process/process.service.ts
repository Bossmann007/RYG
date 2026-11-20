import { Processo } from "@models/processo.model";
import { NUMERO_PROCESSO_DEMO } from "../../fixtures/processos";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProcessSource } from "./process-source";
import { criarProcessSource } from "./process-source.factory";
import { ManualProcessSource } from "./sources/manual.process-source";
import { RegistrarManualDto } from "./process.dto";

@Injectable()
export class ProcessService {
  private readonly source: ProcessSource;

  constructor(config: ConfigService) {
    this.source = criarProcessSource(config.get<string>("PROCESS_SOURCE"));
  }

  fonteAtiva() {
    return {
      kind: this.source.kind,
      configurado: this.source.configurado,
    };
  }

  buscarCapa(numero: string): Processo {
    if (!this.source.configurado) {
      throw new ServiceUnavailableException(
        `ProcessSource "${this.source.kind}" ainda não configurado. Use PROCESS_SOURCE=fixture ou implemente o adaptador.`
      );
    }

    const normalizado = this.normalizarNumero(numero);
    const processo = this.source.buscarCapa(normalizado);

    if (processo) {
      return processo;
    }

    if (this.source.kind === "fixture") {
      throw new NotFoundException(
        `Processo não encontrado. Use o caso: ${NUMERO_PROCESSO_DEMO}.`
      );
    }

    throw new NotFoundException("Processo não encontrado.");
  }

  registrarManual(parcial: RegistrarManualDto): Processo {
    if (this.source.kind !== "manual" || !(this.source instanceof ManualProcessSource)) {
      throw new ServiceUnavailableException(
        `ProcessSource "${this.source.kind}" não aceita registro manual. Use PROCESS_SOURCE=manual.`
      );
    }

    if (!this.numeroValido(parcial.processNumber)) {
      throw new BadRequestException("Número de processo inválido.");
    }

    const processNumber = this.normalizarNumero(parcial.processNumber);
    const processo: Processo = {
      processNumber,
      court: parcial.court?.trim() || "",
      courtUnit: "",
      caseClass: "",
      subjects: Array.isArray(parcial.subjects) ? [...parcial.subjects] : [],
      chamber: "",
      organ: "",
      degree: "",
      distributionDate: "",
      parties: [],
      movements: [],
      thesis: "",
      summary: "",
      chamberOrientation: "rejeita_revisao",
    };

    this.source.registrar(processo);
    return { ...processo };
  }

  numeroValido(numero: string): boolean {
    const normalizado = this.normalizarNumero(numero);
    return /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(normalizado);
  }

  normalizarNumero(numero: string): string {
    const digitos = (numero || "").replace(/\D/g, "");

    if (digitos.length !== 20) {
      return (numero || "").trim();
    }

    return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16, 20)}`;
  }
}
