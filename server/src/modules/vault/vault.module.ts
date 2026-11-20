import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { TransferController, VaultController } from "./vault.controller";
import { VaultService } from "./vault.service";

@Module({
  imports: [GatewayModule],
  controllers: [VaultController, TransferController],
  providers: [VaultService],
})
export class VaultModule {}
