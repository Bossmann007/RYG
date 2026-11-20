import { JurisprudenceModule } from "@modules/jurisprudence/jurisprudence.module";
import { ProcessModule } from "@modules/process/process.module";
import { ResearchModule } from "@modules/research/research.module";
import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { ClassificationService } from "./classification.service";
import { DeclassifyService } from "./declassify.service";
import { DlpService } from "./dlp.service";
import { GatewayController } from "./gateway.controller";
import { GatewayService } from "./gateway.service";
import { HubSessionService } from "./hub-session.service";
import { IdentityService } from "./identity.service";
import { JmlController } from "./jml.controller";
import { PaCredentialService } from "./pa-credential.service";
import { PolicyService } from "./policy.service";
import { ToolCatalogService } from "./tool-catalog.service";

@Module({
  imports: [ProcessModule, JurisprudenceModule, ResearchModule],
  controllers: [GatewayController, JmlController],
  providers: [
    AuditService,
    ClassificationService,
    DeclassifyService,
    DlpService,
    GatewayService,
    HubSessionService,
    IdentityService,
    PaCredentialService,
    PolicyService,
    ToolCatalogService,
  ],
  exports: [GatewayService, IdentityService, PolicyService, AuditService, HubSessionService, PaCredentialService],
})
export class GatewayModule {}
