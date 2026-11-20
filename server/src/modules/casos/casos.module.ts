import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { CasosController } from "./casos.controller";
import { CasosRepository } from "./casos.repository";
import { CasosService } from "./casos.service";
import { LancamentosService } from "./lancamentos.service";

@Module({
  imports: [DbModule, GatewayModule],
  controllers: [CasosController],
  providers: [CasosService, CasosRepository, LancamentosService],
  exports: [CasosService],
})
export class CasosModule {}
