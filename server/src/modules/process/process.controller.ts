import { Public } from "@common/decorators/public.decorator";
import { Controller, Get } from "@nestjs/common";
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
}
