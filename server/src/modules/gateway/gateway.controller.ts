import { Public } from "@common/decorators/public.decorator";
import { Controller, ForbiddenException, Get, Headers, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { IdentityService } from "./identity.service";
import { PolicyService } from "./policy.service";

/** Papeis que podem ler a trilha. Auditoria e dado sensivel como qualquer outro. */
const PAPEIS_AUDITORES = ["socio", "gestor"];

@Controller("gateway")
export class GatewayController {
  constructor(
    private auditService: AuditService,
    private identityService: IdentityService,
    private policyService: PolicyService
  ) {}

  /** Quem o gateway enxerga na credencial enviada, e o que ela libera. */
  @Public()
  @Get("identidade")
  identidade(@Headers("authorization") authorization?: string) {
    const identidade = this.identityService.resolver(authorization);

    return {
      autenticado: !!identidade,
      identidade,
      ferramentas: this.policyService.ferramentasPermitidas(identidade),
    };
  }

  /**
   * Trilha de auditoria: o que passou, o que foi negado, de que sigilo era a
   * fonte e quanto dela sobreviveu.
   */
  @Public()
  @Get("auditoria")
  auditoria(
    @Headers("authorization") authorization?: string,
    @Query("limite") limite?: string
  ) {
    const identidade = this.identityService.resolver(authorization);

    if (!identidade || !PAPEIS_AUDITORES.includes(identidade.papel)) {
      throw new ForbiddenException(
        "A trilha de auditoria e restrita aos papeis socio e gestor."
      );
    }

    const total = Number(limite) > 0 ? Number(limite) : 50;

    return { registros: this.auditService.listar(total) };
  }
}
