import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { ProcessModule } from "@modules/process/process.module";
import { ResearchModule } from "@modules/research/research.module";
import { XirpModule } from "@modules/xirp/xirp.module";
import { Module, forwardRef } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { ClassificationService } from "./classification.service";
import { DeclassifyService } from "./declassify.service";
import { DlpService } from "./dlp.service";
import { GatewayController } from "./gateway.controller";
import { GatewayService } from "./gateway.service";
import { HubSessionService } from "./hub-session.service";
import { IdentityService } from "./identity.service";
import { PolicyService } from "./policy.service";
import { SafeDtoEgressService } from "./safe-dto-egress.service";
import { ToolCatalogService } from "./tool-catalog.service";

@Module({
  imports: [forwardRef(() => ProcessModule), JurisprudenceModule, ResearchModule, XirpModule],
  controllers: [GatewayController],
  providers: [
    AuditService,
    ClassificationService,
    DeclassifyService,
    DlpService,
    GatewayService,
    HubSessionService,
    IdentityService,
    PolicyService,
    SafeDtoEgressService,
    ToolCatalogService,
  ],
  exports: [
    GatewayService,
    IdentityService,
    PolicyService,
    AuditService,
    HubSessionService,
  ],
})
export class GatewayModule {}

