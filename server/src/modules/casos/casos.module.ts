import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { RetentionModule } from "@modules/retention/retention.module";
import { Module } from "@nestjs/common";
import { CasosController } from "./casos.controller";
import { CasosRepository } from "./casos.repository";
import { CasosService } from "./casos.service";

@Module({
  imports: [DbModule, GatewayModule, RetentionModule],
  controllers: [CasosController],
  providers: [CasosService, CasosRepository],
  exports: [CasosService],
})
export class CasosModule {}
