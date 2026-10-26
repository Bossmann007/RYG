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

  /** Directory lookup by stable user id (demo fixtures). */
  porUserId(userId: string): Identidade | null {
    const id = (userId || "").trim();
    if (!id) {
      return null;
    }
    return (
      Object.values(USUARIOS_POR_TOKEN).find((usuario) => usuario.id === id) || null
    );
  }

  /** Office directory for mentions / DM peers (demo fixtures). */
  diretorioDoEscritorio(officeId: string): Identidade[] {
    const escritorio = (officeId || "").trim();
    if (!escritorio) {
      return [];
    }
    const vistos = new Set<string>();
    const lista: Identidade[] = [];
    for (const usuario of Object.values(USUARIOS_POR_TOKEN)) {
      if (usuario.escritorio !== escritorio || vistos.has(usuario.id)) {
        continue;
      }
      vistos.add(usuario.id);
      lista.push(usuario);
    }
    return lista;
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
