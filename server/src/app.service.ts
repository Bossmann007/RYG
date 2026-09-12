import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Server } from "http";
/* eslint-disable @typescript-eslint/no-var-requires */
const { name, description, version } = require("../package.json");

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private readonly httpAdapterHost: HttpAdapterHost<any>) {}

  onApplicationBootstrap() {
    const server: Server = this.httpAdapterHost.httpAdapter.getHttpServer();
    server.keepAliveTimeout = 300 * 1000;
    server.headersTimeout = 300 * 1000;
  }

  home(): object {
    return {
      nome: name,
      descricao: description,
      versao: version,
      ambiente: process.env.NODE_ENV,
      status: true,
    };
  }

  health(): object {
    return {
      status: "ok",
      demo: true,
    };
  }
}
