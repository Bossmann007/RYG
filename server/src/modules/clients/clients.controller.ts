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
import { CreateClienteDto, ListarClientesQueryDto, UpdateClienteDto } from "./clients.dto";
import { ClientsService } from "./clients.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List/get omit CPF, bank, and contact. Do not mount these routes on the LLM path.
 */
@Controller("clientes")
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  async listar(@Req() req: Request, @Query() query: ListarClientesQueryDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal",
      clientes: await this.clientsService.listar(officeId, {
        casoId: query.casoId,
        processNumber: query.processNumber,
      }),
    };
  }

  @Get(":id")
  obter(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", cliente: this.clientsService.obter(officeId, id) };
  }

  @Post()
  criar(@Req() req: Request, @Body() dto: CreateClienteDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", cliente: this.clientsService.criar(officeId, dto) };
  }

  @Patch(":id")
  atualizar(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateClienteDto) {
    const { officeId } = identidadeDaRequisicao(req);
    return { zone: "internal", cliente: this.clientsService.atualizar(officeId, id, dto) };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Req() req: Request, @Param("id") id: string) {
    const { officeId } = identidadeDaRequisicao(req);
    this.clientsService.remover(officeId, id);
  }
}
