import { Public } from "@common/decorators/public.decorator";
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
} from "@nestjs/common";
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

  @Public()
  @Get()
  async listar(@Query() query: ListarContratosQueryDto) {
    return {
      zone: "internal",
      contratos: await this.contractsService.listar({
        casoId: query.casoId,
      }),
    };
  }

  @Public()
  @Get(":id")
  async obter(@Param("id") id: string) {
    return { zone: "internal", contrato: await this.contractsService.obter(id) };
  }

  @Public()
  @Post()
  async criar(@Body() dto: CreateContratoDto) {
    return { zone: "internal", contrato: await this.contractsService.criar(dto) };
  }

  @Public()
  @Patch(":id")
  async atualizar(@Param("id") id: string, @Body() dto: UpdateContratoDto) {
    return {
      zone: "internal",
      contrato: await this.contractsService.atualizar(id, dto),
    };
  }

  @Public()
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(@Param("id") id: string) {
    await this.contractsService.remover(id);
  }
}
