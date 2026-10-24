import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { USUARIOS_POR_TOKEN } from "../../fixtures/usuarios";

type DesafioJml = {
  officeId: string;
  actorId: string;
  targetUserId: string;
  expiraEm: number;
};

const DESAFIO_TTL_MS = 120_000;
const IDLE_DEFAULT_MS = 30 * 60 * 1000;

/**
 * Demo session lifecycle: disable, idle timeout, one-shot JML MFA factor.
 * Product login / TOTP stay out of this stub.
 */
@Injectable()
export class HubSessionService {
  private readonly desabilitados = new Set<string>();
  private readonly atividade = new Map<string, number>();
  private readonly desafios = new Map<string, DesafioJml>();

  constructor() {
    const demoOff = USUARIOS_POR_TOKEN["demo-off"];
    if (demoOff) {
      this.desabilitados.add(demoOff.id);
    }
  }

  agora(): number {
    if (process.env.NODE_ENV !== "production" && process.env.HUB_NOW_MS) {
      const forcado = Number(process.env.HUB_NOW_MS);
      if (Number.isFinite(forcado) && forcado > 0) {
        return forcado;
      }
    }
    return Date.now();
  }

  idleTimeoutMs(): number {
    const raw = Number(process.env.HUB_IDLE_TIMEOUT_MS);
    if (Number.isFinite(raw) && raw > 0) {
      return raw;
    }
    return IDLE_DEFAULT_MS;
  }

  estaDesabilitado(userId: string): boolean {
    return this.desabilitados.has(userId);
  }

  desabilitar(userId: string): void {
    this.desabilitados.add(userId);
  }

  tocarAtividade(token: string): void {
    this.atividade.set(token, this.agora());
  }

  estaIdle(token: string): boolean {
    const ultimo = this.atividade.get(token);
    if (ultimo == null) {
      return false;
    }
    return this.agora() - ultimo > this.idleTimeoutMs();
  }

  abrirDesafioJml(officeId: string, actorId: string, targetUserId: string): {
    desafio: string;
    expiraEm: string;
  } {
    this.limparDesafios();
    const desafio = randomBytes(24).toString("hex");
    const expiraEm = this.agora() + DESAFIO_TTL_MS;
    this.desafios.set(desafio, {
      officeId,
      actorId,
      targetUserId,
      expiraEm,
    });
    return { desafio, expiraEm: new Date(expiraEm).toISOString() };
  }

  consumirDesafioJml(
    desafio: string,
    officeId: string,
    actorId: string,
    targetUserId: string,
  ): boolean {
    this.limparDesafios();
    const aberto = this.desafios.get(desafio);
    if (!aberto) {
      return false;
    }
    this.desafios.delete(desafio);
    return (
      aberto.officeId === officeId &&
      aberto.actorId === actorId &&
      aberto.targetUserId === targetUserId &&
      aberto.expiraEm >= this.agora()
    );
  }

  private limparDesafios(): void {
    const agora = this.agora();
    for (const [chave, valor] of this.desafios) {
      if (valor.expiraEm < agora) {
        this.desafios.delete(chave);
      }
    }
  }
}

/** Stable fingerprint for audit args. Never the raw secret. */
export function hashCurto(valor: string): string {
  return createHash("sha256").update(valor).digest("hex").slice(0, 12);
}
