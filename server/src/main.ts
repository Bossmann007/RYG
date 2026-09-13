import "./register-aliases";
/* eslint-disable @typescript-eslint/no-var-requires */
import { config as loadEnv } from "dotenv";
loadEnv();
loadEnv({ path: "../.env" });
const { name } = require("../package.json");

import { HttpExceptionFilter } from "@common/filters/http-exception.filter";
import { ValidationPipe } from "@common/pipes/validation.pipe";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import helmet from "helmet";
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from "nest-winston";
import { format, transports } from "winston";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      format: format.combine(
        format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike(name.toUpperCase(), {
          colors: true,
        })
      ),
      transports: [new transports.Console()],
    }),
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix("api");
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(ValidationPipe);
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  const porta = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000;
  await app.listen(porta);
  Logger.log(`Servidor iniciado na porta ${porta}`, "NestApplication");
}

bootstrap();
