import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, Param, Put, Req } from "@nestjs/common";
import { Request } from "express";
import { RetentionService } from "./retention.service";

@Controller("casos/:casoId/retention")
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}

  @Get()
  async obter(@Req() req: Request, @Param("casoId") casoId: string) {
    const identidade = identidadeDaRequisicao(req);
    const estado = await this.retention.obter(identidade.officeId, casoId);
    const politica = await this.retention.politicaEscritorio(identidade.officeId);
    return { zone: "internal" as const, retention: estado, policy: politica };
  }

  @Put()
  async definir(
    @Req() req: Request,
    @Param("casoId") casoId: string,
    @Body() body: { legalHold?: boolean; retentionUntil?: string | null },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const retention = await this.retention.definirHold(
      identidade,
      casoId,
      Boolean(body?.legalHold),
      body?.retentionUntil,
    );
    return { zone: "internal" as const, retention };
  }
}
