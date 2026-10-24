import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { TransferController } from "./transfer.controller";

@Module({
  imports: [GatewayModule],
  controllers: [TransferController],
})
export class TransferModule {}
