import { DissidioModule } from "@modules/dissidio/dissidio.module";
import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { ProcessModule } from "@modules/process/process.module";
import { ResearchController } from "@modules/research/research.controller";
import { ResearchService } from "@modules/research/research.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [ProcessModule, JurisprudenceModule, DissidioModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
