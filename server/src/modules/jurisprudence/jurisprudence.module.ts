import { JurisprudenceController } from "@modules/jurisprudence/jurisprudence.controller";
import { JurisprudenceService } from "@modules/jurisprudence/jurisprudence.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [JurisprudenceController],
  providers: [JurisprudenceService],
  exports: [JurisprudenceService],
})
export class JurisprudenceModule {}
