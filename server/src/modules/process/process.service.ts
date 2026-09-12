import { Processo } from "@models/processo.model";
import {
  NUMERO_PROCESSO_DEMO,
  PROCESSOS_POR_NUMERO,
} from "../../fixtures/processos";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class ProcessService {
  buscarCapa(numero: string): Processo {
    const normalizado = this.normalizarNumero(numero);
    const processo = PROCESSOS_POR_NUMERO[normalizado];

    if (!processo) {
      throw new NotFoundException(
        `Processo não encontrado nesta demo. Use o caso bancário fictício: ${NUMERO_PROCESSO_DEMO}.`
      );
    }

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
