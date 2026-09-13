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
import { CreateDecisaoDto, ListarDecisoesQueryDto, UpdateDecisaoDto } from "./decisions.dto";
import { DecisionsService } from "./decisions.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List omits the ruling summary. Do not mount these routes on the LLM path.
 */
@Controller("decisoes")
export class DecisionsController {
  constructor(private decisionsService: DecisionsService) {}

  @Public()
  @Get()
  async listar(@Query() query: ListarDecisoesQueryDto) {
    return {
      zone: "internal",
      decisoes: await this.decisionsService.listar({
        clienteId: query.clienteId,
        processNumber: query.processNumber,
        casoId: query.casoId,
        kind: query.kind,
      }),
    };
  }

  @Public()
  @Get(":id")
  obter(@Param("id") id: string) {
    return { zone: "internal", decisao: this.decisionsService.obter(id) };
  }

  @Public()
  @Post()
  criar(@Body() dto: CreateDecisaoDto) {
    return { zone: "internal", decisao: this.decisionsService.criar(dto) };
  }

  @Public()
  @Patch(":id")
  atualizar(@Param("id") id: string, @Body() dto: UpdateDecisaoDto) {
    return { zone: "internal", decisao: this.decisionsService.atualizar(id, dto) };
  }

  @Public()
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param("id") id: string) {
    this.decisionsService.remover(id);
  }
}
