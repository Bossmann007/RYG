import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { WikiModule } from "@modules/wiki/wiki.module";
import { Module } from "@nestjs/common";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";

@Module({
  imports: [DbModule, GatewayModule, WikiModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
