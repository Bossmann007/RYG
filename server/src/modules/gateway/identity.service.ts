import { Identidade } from "@models/gateway.model";
import { PERFIS_DEMO, USUARIOS_POR_TOKEN } from "../../fixtures/usuarios";
import { Injectable } from "@nestjs/common";

/**
 * Resolve quem está do outro lado da chamada. Sem credencial reconhecida não há
 * identidade — e sem identidade a política nega tudo (default deny).
 */
@Injectable()
export class IdentityService {
  resolver(authorization?: string): Identidade | null {
    const token = this.extrairToken(authorization);

    if (!token) {
      return null;
    }

    return USUARIOS_POR_TOKEN[token] || null;
  }

  perfisDemo() {
    return PERFIS_DEMO;
  }

  private extrairToken(authorization?: string): string {
    if (!authorization) {
      return "";
    }

    const [esquema, valor] = authorization.trim().split(/\s+/);

    if (esquema?.toLowerCase() !== "bearer" || !valor) {
      return "";
    }

    return valor;
  }
}
