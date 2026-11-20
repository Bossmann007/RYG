import { PERMITE_CREDENCIAL_PA_KEY } from "@common/decorators/permite-credencial-pa.decorator";
import { IS_PUBLIC_KEY } from "@common/decorators/public.decorator";
import { Identidade, RegistroAuditoria } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import { HubSessionService } from "@modules/gateway/hub-session.service";
import { IdentityService } from "@modules/gateway/identity.service";
import { PaCredentialService } from "@modules/gateway/pa-credential.service";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

/** `officeId` is `escritorio` under the tenant name ADR 0001 uses. */
export type IdentidadeRequisicao = Identidade & { officeId: string };

type RequisicaoAutenticada = Request & { identidade?: IdentidadeRequisicao };

export function identidadeDaRequisicao(req: Request): IdentidadeRequisicao {
  const identidade = (req as RequisicaoAutenticada).identidade;
  if (!identidade?.officeId) {
    throw new UnauthorizedException("Escritório obrigatório.");
  }
  return identidade;
}

/** Deny-by-default: every route without @Public() needs a known token with a tenant. */
@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private identityService: IdentityService,
    private sessoes: HubSessionService,
    private credenciaisPa: PaCredentialService,
    private audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publica) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const authorization = req.headers.authorization;
    const token = this.identityService.tokenDe(authorization);
    const humana = this.identityService.resolver(authorization);
    const identidade = humana ?? this.credenciaisPa.resolver(token);
    if (!identidade) {
      throw new UnauthorizedException("Credencial ausente ou desconhecida.");
    }

    const officeId = (identidade.escritorio || "").trim();
    if (!officeId) {
      throw new UnauthorizedException("Escritório obrigatório.");
    }

    const estado = this.sessoes.avaliar(token, identidade.id);
    if (estado === "disabled") {
      await this.auditar(identidade, "utilizador desabilitado");
      throw new UnauthorizedException("Utilizador desabilitado.");
    }
    if (estado === "idle") {
      await this.auditar(identidade, "sessao idle");
      throw new UnauthorizedException("Sessão expirada por inatividade.");
    }

    if (!humana) {
      const permitida = this.reflector.getAllAndOverride<boolean>(PERMITE_CREDENCIAL_PA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!permitida) {
        throw new ForbiddenException("Credencial PA só chama ferramentas.");
      }
    }

    req.identidade = { ...identidade, officeId };
    return true;
  }

  private auditar(identidade: Identidade, motivo: string): Promise<void> {
    const registro: RegistroAuditoria = {
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "sessao",
      argumentos: {},
      decisao: "negado",
      motivo,
      omitido: [],
      duracaoMs: 0,
    };
    return this.audit.registrar(registro);
  }
}
