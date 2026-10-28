import { CaseClassification } from "@common/security/case-classification";

export type RagCiteStatus = "ok" | "nao_citavel";

export type RagRuntime = "office-hosted" | "linked-provider" | "none";

export type RagChunk = {
  sourceId: string;
  officeId: string;
  title: string;
  snippet: string;
  classification: CaseClassification;
  /** Principals allowed to see this chunk (mirrors hardvault_acl shapes). */
  acl: Array<{ principalType: "office" | "user" | "role"; principalId: string }>;
};

export type RagHit = {
  sourceId: string;
  title: string;
  snippet: string;
  classification: CaseClassification;
  citeStatus: RagCiteStatus;
};

export type RagCiteLedgerRow = {
  id: string;
  officeId: string;
  userId: string;
  casoId: string | null;
  sourceId: string;
  releaseId: string | null;
  citeStatus: RagCiteStatus;
  queryText: string;
  runtime: RagRuntime;
  at: string;
};
