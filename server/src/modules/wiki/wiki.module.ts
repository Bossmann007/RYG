import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { WikiController } from "./wiki.controller";
import { WikiService } from "./wiki.service";

@Module({
  imports: [DbModule, GatewayModule],
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService],
})
export class WikiModule {}
