import { USUARIOS_POR_TOKEN } from "../../fixtures/usuarios";
import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

const IDLE_PADRAO_MS = 30 * 60 * 1000;
const MFA_MS = 120_000;

type DesafioMfa = {
  userId: string;
  expira: number;
};

/**
 * Demo session for the bearer token. Not a login UI.
 * Disabled users and idle bearers fail closed. Socio JML uses a one-shot factor.
 */
@Injectable()
export class HubSessionService {
  private readonly desabilitados = new Set<string>();
  private readonly visto = new Map<string, number>();
  private readonly fatores = new Map<string, DesafioMfa>();

  constructor() {
    for (const identidade of Object.values(USUARIOS_POR_TOKEN)) {
      if (identidade.disabled) {
        this.desabilitados.add(identidade.id);
      }
    }
  }

  agora(): number {
    if (process.env.NODE_ENV !== "production") {
      const fixo = process.env.HUB_NOW_MS;
      if (fixo && fixo.trim()) {
        const n = Number(fixo);
        if (Number.isFinite(n)) {
          return n;
        }
      }
    }
    return Date.now();
  }

  idleMs(): number {
    const bruto = Number(process.env.HUB_IDLE_TIMEOUT_MS);
    if (Number.isFinite(bruto) && bruto > 0) {
      return bruto;
    }
    return IDLE_PADRAO_MS;
  }

  /** First sighting starts the clock. Idle does not refresh it. */
  avaliar(token: string, userId: string): "ok" | "disabled" | "idle" {
    if (this.desabilitados.has(userId)) {
      return "disabled";
    }
    const agora = this.agora();
    const visto = this.visto.get(token);
    if (visto !== undefined && agora - visto > this.idleMs()) {
      return "idle";
    }
    this.visto.set(token, agora);
    return "ok";
  }

  desabilitar(userId: string): void {
    this.desabilitados.add(userId);
  }

  exigeMfa(papel: string): boolean {
    return papel === "socio";
  }

  abrirMfa(userId: string): { desafio: string; expiraEm: string } {
    const desafio = randomBytes(16).toString("hex");
    const expira = this.agora() + MFA_MS;
    this.fatores.set(desafio, { userId, expira });
    return { desafio, expiraEm: new Date(expira).toISOString() };
  }

  /** Deletes the factor first, so a second presentation fails. */
  consumirMfa(userId: string, desafio: string): boolean {
    const salvo = this.fatores.get(desafio);
    this.fatores.delete(desafio);
    if (!salvo || salvo.userId !== userId || salvo.expira < this.agora()) {
      return false;
    }
    return true;
  }
}
