import { Public } from "@common/decorators/public.decorator";
import { ResearchDto } from "@modules/research/research.dto";
import { ResearchService } from "@modules/research/research.service";
import { Body, Controller, Post } from "@nestjs/common";

@Controller("research")
export class ResearchController {
  constructor(private researchService: ResearchService) {}

  @Public()
  @Post()
  pesquisar(@Body() dto: ResearchDto) {
    return this.researchService.pesquisar(dto);
  }
}
