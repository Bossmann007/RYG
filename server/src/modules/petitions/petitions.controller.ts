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
import { CreatePeticaoDto, ListarPeticoesQueryDto, UpdatePeticaoDto } from "./petitions.dto";
import { PetitionsService } from "./petitions.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List omits the filing summary. Do not mount these routes on the LLM path.
 */
@Controller("peticoes")
export class PetitionsController {
  constructor(private petitionsService: PetitionsService) {}

  @Get()
  async listar(@Req() req: Request, @Query() query: ListarPeticoesQueryDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal",
      peticoes: await this.petitionsService.listar(officeId, {
        clienteId: query.clienteId,
        processNumber: query.processNumber,
        casoId: query.casoId,
      }),
    };
  }

  @Get(":id")
  obter(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", peticao: this.petitionsService.obter(officeId, id) };
  }

  @Post()
  criar(@Req() req: Request, @Body() dto: CreatePeticaoDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", peticao: this.petitionsService.criar(officeId, dto) };
  }

  @Patch(":id")
  atualizar(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdatePeticaoDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", peticao: this.petitionsService.atualizar(officeId, id, dto) };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    this.petitionsService.remover(officeId, id);
  }
}
