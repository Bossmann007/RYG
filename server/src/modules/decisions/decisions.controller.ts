import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CreateDecisaoDto, ListarDecisoesQueryDto, UpdateDecisaoDto } from "./decisions.dto";
import { DecisionsService } from "./decisions.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List omits the ruling summary. Do not mount these routes on the LLM path.
 */
@Controller("decisoes")
export class DecisionsController {
  constructor(private decisionsService: DecisionsService) {}

  @Get()
  async listar(@Req() req: Request, @Query() query: ListarDecisoesQueryDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal",
      decisoes: await this.decisionsService.listar(officeId, {
        clienteId: query.clienteId,
        processNumber: query.processNumber,
        casoId: query.casoId,
        kind: query.kind,
      }),
    };
  }

  @Get(":id")
  obter(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", decisao: this.decisionsService.obter(officeId, id) };
  }

  @Post()
  criar(@Req() req: Request, @Body() dto: CreateDecisaoDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", decisao: this.decisionsService.criar(officeId, dto) };
  }

  @Patch(":id")
  atualizar(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateDecisaoDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", decisao: this.decisionsService.atualizar(officeId, id, dto) };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    this.decisionsService.remover(officeId, id);
  }
}
