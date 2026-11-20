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
import { CreateModeloDto, ListarModelosQueryDto, UpdateModeloDto } from "./templates.dto";
import { TemplatesService } from "./templates.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List omits the template body. Do not mount these routes on the LLM path.
 */
@Controller("modelos")
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  async listar(@Req() req: Request, @Query() query: ListarModelosQueryDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal",
      modelos: await this.templatesService.listar(officeId, {
        kind: query.kind,
        area: query.area,
        status: query.status,
        casoId: query.casoId,
        processNumber: query.processNumber,
      }),
    };
  }

  @Get(":id")
  obter(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", modelo: this.templatesService.obter(officeId, id) };
  }

  @Post()
  criar(@Req() req: Request, @Body() dto: CreateModeloDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", modelo: this.templatesService.criar(officeId, dto) };
  }

  @Patch(":id")
  atualizar(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateModeloDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", modelo: this.templatesService.atualizar(officeId, id, dto) };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    this.templatesService.remover(officeId, id);
  }
}
