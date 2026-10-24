import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { JmlController } from "./jml.controller";

@Module({
  imports: [GatewayModule],
  controllers: [JmlController],
})
export class JmlModule {}
