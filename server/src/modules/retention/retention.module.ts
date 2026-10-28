import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { RetentionController } from "./retention.controller";
import { RetentionService } from "./retention.service";

@Module({
  imports: [DbModule, GatewayModule],
  controllers: [RetentionController],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
