import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { VaultController } from "./vault.controller";
import { VaultService } from "./vault.service";

@Module({
  imports: [GatewayModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
