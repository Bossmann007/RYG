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
import { CreatePeticaoDto, ListarPeticoesQueryDto, UpdatePeticaoDto } from "./petitions.dto";
import { PetitionsService } from "./petitions.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List omits the filing summary. Do not mount these routes on the LLM path.
 */
@Controller("peticoes")
export class PetitionsController {
  constructor(private petitionsService: PetitionsService) {}

  @Public()
  @Get()
  async listar(@Query() query: ListarPeticoesQueryDto) {
    return {
      zone: "internal",
      peticoes: await this.petitionsService.listar({
        clienteId: query.clienteId,
        processNumber: query.processNumber,
        casoId: query.casoId,
      }),
    };
  }

  @Public()
  @Get(":id")
  obter(@Param("id") id: string) {
    return { zone: "internal", peticao: this.petitionsService.obter(id) };
  }

  @Public()
  @Post()
  criar(@Body() dto: CreatePeticaoDto) {
    return { zone: "internal", peticao: this.petitionsService.criar(dto) };
  }

  @Public()
  @Patch(":id")
  atualizar(@Param("id") id: string, @Body() dto: UpdatePeticaoDto) {
    return { zone: "internal", peticao: this.petitionsService.atualizar(id, dto) };
  }

  @Public()
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param("id") id: string) {
    this.petitionsService.remover(id);
  }
}
