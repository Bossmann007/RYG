import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { CasosController } from "./casos.controller";
import { CasosRepository } from "./casos.repository";
import { CasosService } from "./casos.service";

@Module({
  imports: [DbModule],
  controllers: [CasosController],
  providers: [CasosService, CasosRepository],
  exports: [CasosService],
})
export class CasosModule {}
