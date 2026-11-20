import { Identidade } from "@models/gateway.model";
import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { HubSessionService } from "./hub-session.service";

const TTL_MS = 10 * 60 * 1000;

type Entrada = { identidade: Identidade; expira: number };

/**
 * ADR 0005 model credential. In memory, so a restart wipes it. It carries the
 * delegating human's identity but the guard lets it reach only @PermiteCredencialPa() routes.
 */
@Injectable()
export class PaCredentialService {
  private readonly entradas = new Map<string, Entrada>();

  constructor(private readonly sessoes: HubSessionService) {}

  emitir(identidade: Identidade): { token: string; expiraEm: string } {
    this.podar();
    const token = `pas_${randomBytes(16).toString("hex")}`;
    const expira = this.sessoes.agora() + TTL_MS;
    const { id, nome, papel, escritorio } = identidade;
    this.entradas.set(token, { identidade: { id, nome, papel, escritorio }, expira });
    return { token, expiraEm: new Date(expira).toISOString() };
  }

  resolver(token: string): Identidade | null {
    const entrada = this.entradas.get(token);
    if (!entrada) {
      return null;
    }
    if (entrada.expira < this.sessoes.agora()) {
      this.entradas.delete(token);
      return null;
    }
    return entrada.identidade;
  }

  private podar(): void {
    const agora = this.sessoes.agora();
    for (const [token, entrada] of this.entradas) {
      if (entrada.expira < agora) {
        this.entradas.delete(token);
      }
    }
  }
}
