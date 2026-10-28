import { CasosModule } from "@modules/casos/casos.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { WhatsappModule } from "@modules/whatsapp/whatsapp.module";
import { WikiModule } from "@modules/wiki/wiki.module";
import { Module } from "@nestjs/common";
import { PaController } from "./pa.controller";
import { PaService } from "./pa.service";

@Module({
  imports: [GatewayModule, CasosModule, WikiModule, WhatsappModule],
  controllers: [PaController],
  providers: [PaService],
  exports: [PaService],
})
export class PaModule {}
