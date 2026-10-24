import { Identidade, Origem } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import { HubSessionService } from "@modules/gateway/hub-session.service";
import { UnauthorizedException } from "@nestjs/common";

/**
 * Shared deny path for IdentityGuard and MCP (@Public) tools/call.
 * Disabled and idle fail closed with audit before the 401.
 */
export async function exigirSessaoAtiva(
  identidade: Identidade | null,
  token: string,
  sessions: HubSessionService,
  audit: AuditService,
  ferramenta: string,
  origem: Origem = "hub",
): Promise<Identidade> {
  if (!identidade) {
    throw new UnauthorizedException("Credencial ausente ou desconhecida.");
  }

  if (sessions.estaDesabilitado(identidade.id)) {
    await audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem,
      ferramenta,
      argumentos: {},
      decisao: "negado",
      motivo: "usuario desabilitado",
      omitido: [],
      duracaoMs: 0,
    });
    throw new UnauthorizedException("Credencial revogada.");
  }

  if (token && sessions.estaIdle(token)) {
    await audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem,
      ferramenta,
      argumentos: {},
      decisao: "negado",
      motivo: "sessao idle",
      omitido: [],
      duracaoMs: 0,
    });
    throw new UnauthorizedException("Sessão expirada por inatividade.");
  }

  if (token) {
    sessions.tocarAtividade(token);
  }

  return identidade;
}

export function extrairBearer(authorization?: string): string {
  if (!authorization) {
    return "";
  }
  const [esquema, valor] = authorization.trim().split(/\s+/);
  if (esquema?.toLowerCase() !== "bearer" || !valor) {
    return "";
  }
  return valor;
}
