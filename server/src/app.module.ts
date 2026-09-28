import { IdentityGuard } from "@common/guards/identity.guard";
import { LoggerMiddleware } from "@common/middlewares/logger.middleware";
import { CasosModule } from "@modules/casos/casos.module";
import { CatalogModule } from "@modules/catalog/catalog.module";
import { ChatModule } from "@modules/chat/chat.module";
import { ClientsModule } from "@modules/clients/clients.module";
import { ContractsModule } from "@modules/contracts/contracts.module";
import { DecisionsModule } from "@modules/decisions/decisions.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { McpModule } from "@modules/mcp/mcp.module";
import { PetitionsModule } from "@modules/petitions/petitions.module";
import { ProcessModule } from "@modules/process/process.module";
import { ResearchModule } from "@modules/research/research.module";
import { TemplatesModule } from "@modules/templates/templates.module";
import { WhatsappModule } from "@modules/whatsapp/whatsapp.module";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
    CasosModule,
    CatalogModule,
    ChatModule,
    ProcessModule,
    ClientsModule,
    PetitionsModule,
    DecisionsModule,
    TemplatesModule,
    JurisprudenceModule,
    ResearchModule,
    ContractsModule,
    GatewayModule,
    McpModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: IdentityGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
