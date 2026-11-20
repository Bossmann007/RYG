import { IdentityGuard } from "@common/guards/identity.guard";
import { LoggerMiddleware } from "@common/middlewares/logger.middleware";
import { CasosModule } from "@modules/casos/casos.module";
import { CatalogModule } from "@modules/catalog/catalog.module";
import { ChatModule } from "@modules/chat/chat.module";
import { ClientsModule } from "@modules/clients/clients.module";
import { ContractsModule } from "@modules/contracts/contracts.module";
import { DsarModule } from "@modules/dsar/dsar.module";
import { DecisionsModule } from "@modules/decisions/decisions.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { McpModule } from "@modules/mcp/mcp.module";
import { PaModule } from "@modules/pa/pa.module";
import { PetitionsModule } from "@modules/petitions/petitions.module";
import { ProcessModule } from "@modules/process/process.module";
import { RagModule } from "@modules/rag/rag.module";
import { ResearchModule } from "@modules/research/research.module";
import { TemplatesModule } from "@modules/templates/templates.module";
import { ToolsModule } from "@modules/tools/tools.module";
import { VaultModule } from "@modules/vault/vault.module";
import { WhatsappModule } from "@modules/whatsapp/whatsapp.module";
import { WikiModule } from "@modules/wiki/wiki.module";
import { WorkspaceModule } from "@modules/workspace/workspace.module";
import { XirpModule } from "@modules/xirp/xirp.module";
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
    RagModule,
    ClientsModule,
    PetitionsModule,
    DecisionsModule,
    DsarModule,
    TemplatesModule,
    ToolsModule,
    JurisprudenceModule,
    ResearchModule,
    ContractsModule,
    GatewayModule,
    McpModule,
    PaModule,
    VaultModule,
    WhatsappModule,
    WikiModule,
    WorkspaceModule,
    XirpModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: IdentityGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
