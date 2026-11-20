import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { DsarController } from "./dsar.controller";

@Module({
  imports: [GatewayModule],
  controllers: [DsarController],
})
export class DsarModule {}
