import { IS_PUBLIC_KEY } from "@common/decorators/public.decorator";
import { Identidade } from "@models/gateway.model";
import { IdentityService } from "@modules/gateway/identity.service";
import {
  CanActivate,
  ExecutionContext,
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
    private identityService: IdentityService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const publica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publica) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const identidade = this.identityService.resolver(req.headers.authorization);
    if (!identidade) {
      throw new UnauthorizedException("Credencial ausente ou desconhecida.");
    }

    const officeId = (identidade.escritorio || "").trim();
    if (!officeId) {
      throw new UnauthorizedException("Escritório obrigatório.");
    }

    req.identidade = { ...identidade, officeId };
    return true;
  }
}
