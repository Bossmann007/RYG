import { Public } from "@common/decorators/public.decorator";
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { RegistrarManualDto } from "./process.dto";
import { ProcessService } from "./process.service";

@Controller("process")
export class ProcessController {
  constructor(private processService: ProcessService) {}

  @Public()
  @Get("source")
  fonte() {
    return {
      zone: "internal" as const,
      ...this.processService.fonteAtiva(),
      kinds: ["fixture", "datajud", "eproc", "manual", "upload"],
    };
  }

  @Post("manual")
  @HttpCode(HttpStatus.CREATED)
  registrarManual(@Body() body: RegistrarManualDto) {
    const processo = this.processService.registrarManual(body);
    return {
      zone: "internal" as const,
      processo,
    };
  }

  @Get("capa")
  capa(@Query("numero") numero: string) {
    const processo = this.processService.buscarCapa(numero);
    return {
      zone: "internal" as const,
      processo,
    };
  }
}
