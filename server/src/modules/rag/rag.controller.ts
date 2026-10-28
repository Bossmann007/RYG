import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { RagService } from "./rag.service";
import { RagRuntime } from "./rag-types";

type QueryDto = {
  q?: string;
  casoId?: string;
  runtime?: RagRuntime;
};

@Controller("rag")
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Get("status")
  status(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      mode: "consult" as const,
      officeHostedAi: this.rag.officeHostedEnabled(),
      officeId: identidade.officeId,
      mutationTools: [] as string[],
    };
  }

  @Post("ingest")
  @HttpCode(200)
  async ingest(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.rag.ingestHardvault(identidade);
    return { zone: "internal" as const, ...result };
  }

  @Post("query")
  @HttpCode(200)
  async query(@Req() req: Request, @Body() body: QueryDto) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.rag.query(identidade, {
      q: body?.q || "",
      casoId: body?.casoId,
      runtime: body?.runtime,
    });
    return { zone: "internal" as const, mode: "consult" as const, ...result };
  }

  /** Consult pack only — no mutation tools on the model path. */
  @Post("consult")
  @HttpCode(200)
  async consult(@Req() req: Request, @Body() body: QueryDto) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.rag.consult(identidade, {
      q: body?.q || "",
      casoId: body?.casoId,
      runtime: body?.runtime,
    });
    return { zone: "internal" as const, ...result };
  }

  @Get("ledger")
  ledger(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      rows: this.rag.recentLedger(identidade.officeId, identidade.id),
    };
  }
}
