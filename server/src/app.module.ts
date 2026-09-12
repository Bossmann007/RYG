import { LoggerMiddleware } from "@common/middlewares/logger.middleware";
import { DissidioModule } from "@modules/dissidio/dissidio.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { McpModule } from "@modules/mcp/mcp.module";
import { ProcessModule } from "@modules/process/process.module";
import { ResearchModule } from "@modules/research/research.module";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ProcessModule,
    JurisprudenceModule,
    DissidioModule,
    ResearchModule,
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
