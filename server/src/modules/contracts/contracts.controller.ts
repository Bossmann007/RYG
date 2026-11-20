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
import {
  CreateContratoDto,
  ListarContratosQueryDto,
  UpdateContratoDto,
} from "./contracts.dto";
import { ContractsService } from "./contracts.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * Contract text stays a short summary. Do not mount these routes on the LLM path.
 */
@Controller("contratos")
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Get()
  async listar(@Req() req: Request, @Query() query: ListarContratosQueryDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal",
      contratos: await this.contractsService.listar(officeId, {
        casoId: query.casoId,
        processNumber: query.processNumber,
      }),
    };
  }

  @Get(":id")
  async obter(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", contrato: await this.contractsService.obter(officeId, id) };
  }

  @Post()
  async criar(@Req() req: Request, @Body() dto: CreateContratoDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", contrato: await this.contractsService.criar(officeId, dto) };
  }

  @Patch(":id")
  async atualizar(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateContratoDto
  ) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal",
      contrato: await this.contractsService.atualizar(officeId, id, dto),
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    await this.contractsService.remover(officeId, id);
  }
}
