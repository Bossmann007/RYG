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
import { CreateModeloDto, ListarModelosQueryDto, UpdateModeloDto } from "./templates.dto";
import { TemplatesService } from "./templates.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * List omits the template body. Do not mount these routes on the LLM path.
 */
@Controller("modelos")
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Public()
  @Get()
  listar(@Query() query: ListarModelosQueryDto) {
    return {
      zone: "internal",
      modelos: this.templatesService.listar({
        kind: query.kind,
        area: query.area,
        status: query.status,
      }),
    };
  }

  @Public()
  @Get(":id")
  obter(@Param("id") id: string) {
    return { zone: "internal", modelo: this.templatesService.obter(id) };
  }

  @Public()
  @Post()
  criar(@Body() dto: CreateModeloDto) {
    return { zone: "internal", modelo: this.templatesService.criar(dto) };
  }

  @Public()
  @Patch(":id")
  atualizar(@Param("id") id: string, @Body() dto: UpdateModeloDto) {
    return { zone: "internal", modelo: this.templatesService.atualizar(id, dto) };
  }

  @Public()
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param("id") id: string) {
    this.templatesService.remover(id);
  }
}
