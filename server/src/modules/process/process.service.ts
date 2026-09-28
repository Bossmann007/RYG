import { Processo } from "@models/processo.model";
import { NUMERO_PROCESSO_DEMO } from "../../fixtures/processos";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProcessSource } from "./process-source";
import { criarProcessSource } from "./process-source.factory";

@Injectable()
export class ProcessService {
  private readonly source: ProcessSource;

  constructor(config: ConfigService) {
    this.source = criarProcessSource(config.get<string>("PROCESS_SOURCE"));
  }

  fonteAtiva() {
    return {
      kind: this.source.kind,
      configurado: this.source.kind === "fixture",
    };
  }

  buscarCapa(numero: string): Processo {
    const normalizado = this.normalizarNumero(numero);
    const processo = this.source.buscarCapa(normalizado);

    if (processo) {
      return processo;
    }

    if (this.source.kind !== "fixture") {
      throw new ServiceUnavailableException(
        `ProcessSource "${this.source.kind}" ainda não configurado. Use PROCESS_SOURCE=fixture ou implemente o adaptador.`
      );
    }

    throw new NotFoundException(
      `Processo não encontrado. Use o caso: ${NUMERO_PROCESSO_DEMO}.`
    );
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
