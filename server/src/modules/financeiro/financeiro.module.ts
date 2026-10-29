import { CasosModule } from "@modules/casos/casos.module";
import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { FinanceiroController } from "./financeiro.controller";
import { FinanceiroService } from "./financeiro.service";

@Module({
  imports: [DbModule, GatewayModule, CasosModule],
  controllers: [FinanceiroController],
  providers: [FinanceiroService],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
