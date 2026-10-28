import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Controller, Get, Param, Req } from "@nestjs/common";
import { Request } from "express";
import { XirpRunsService } from "./xirp-runs.service";

@Controller("xirp")
export class XirpController {
  constructor(private readonly runs: XirpRunsService) {}

  @Get("casos/:casoId/runs")
  async listarPorCaso(@Req() req: Request, @Param("casoId") casoId: string) {
    const identidade = identidadeDaRequisicao(req);
    const runs = await this.runs.listarPorCaso(identidade, casoId);
    return {
      zone: "internal" as const,
      runs: runs.map((run) => ({
        id: run.id,
        toolName: run.toolName,
        releaseId: run.releaseId,
        sessionId: run.sessionId,
        citeStatus: run.citeStatus,
        summary: run.summary,
        referenceCount: run.referenceCount,
        createdAt: run.createdAt,
      })),
    };
  }
}
