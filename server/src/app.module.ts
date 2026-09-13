import { LoggerMiddleware } from "@common/middlewares/logger.middleware";
import { CasosModule } from "@modules/casos/casos.module";
import { ClientsModule } from "@modules/clients/clients.module";
import { ContractsModule } from "@modules/contracts/contracts.module";
import { DissidioModule } from "@modules/dissidio/dissidio.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { McpModule } from "@modules/mcp/mcp.module";
import { PetitionsModule } from "@modules/petitions/petitions.module";
import { ProcessModule } from "@modules/process/process.module";
import { ResearchModule } from "@modules/research/research.module";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
    CasosModule,
    ProcessModule,
    ClientsModule,
    PetitionsModule,
    JurisprudenceModule,
    DissidioModule,
    ResearchModule,
    ContractsModule,
    GatewayModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
