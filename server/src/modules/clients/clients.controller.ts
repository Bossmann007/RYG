import { Public } from "@common/decorators/public.decorator";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { CreateClienteDto, UpdateClienteDto } from "./clients.dto";
import { ClientsService } from "./clients.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List/get omit CPF, bank, and contact. Do not mount these routes on the LLM path.
 */
@Controller("clientes")
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Public()
  @Get()
  listar() {
    return { zone: "internal", clientes: this.clientsService.listar() };
  }

  @Public()
  @Get(":id")
  obter(@Param("id") id: string) {
    return { zone: "internal", cliente: this.clientsService.obter(id) };
  }

  @Public()
  @Post()
  criar(@Body() dto: CreateClienteDto) {
    return { zone: "internal", cliente: this.clientsService.criar(dto) };
  }

  @Public()
  @Patch(":id")
  atualizar(@Param("id") id: string, @Body() dto: UpdateClienteDto) {
    return { zone: "internal", cliente: this.clientsService.atualizar(id, dto) };
  }

  @Public()
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param("id") id: string) {
    this.clientsService.remover(id);
  }
}
