import {
  CriarContratoDto,
  EditarContratoDto,
  ListarContratosDto,
} from "@modules/contracts/contracts.dto";
import { ContractsService } from "@modules/contracts/contracts.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

/**
 * Contratos de um caso.
 *
 * Sem `@Public()` de proposito. Contrato e peca de cliente: no dia em que um
 * guard global entrar, estas rotas devem ficar fechadas por padrao, nao abertas
 * por terem herdado um decorador copiado de outro controller.
 */
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  listar(@Query() query: ListarContratosDto) {
    return this.contractsService.listarPorCaso(query.casoId);
  }

  @Get(":id")
  buscar(@Param("id") id: string) {
    return this.contractsService.buscarPorId(id);
  }

  @Post()
  criar(@Body() dto: CriarContratoDto) {
    return this.contractsService.criar(dto);
  }

  @Patch(":id")
  atualizar(@Param("id") id: string, @Body() dto: EditarContratoDto) {
    return this.contractsService.atualizar(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remover(@Param("id") id: string) {
    await this.contractsService.remover(id);
  }
}
