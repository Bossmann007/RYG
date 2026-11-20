import { CasosModule } from "@modules/casos/casos.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { WhatsappModule } from "@modules/whatsapp/whatsapp.module";
import { Module } from "@nestjs/common";
import { PaController } from "./pa.controller";

@Module({
  imports: [CasosModule, GatewayModule, WhatsappModule],
  controllers: [PaController],
})
export class PaModule {}
