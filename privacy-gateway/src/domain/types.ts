export type Role = 'socio' | 'advogado' | 'estagiario';

export type DocClassification =
  | 'public_jurisprudence'
  | 'case_workproduct'
  | 'client_secret';

export type UserPrincipal = {
  id: string;
  role: Role;
};

export type CaseDocument = {
  id: string;
  classification: DocClassification;
  text: string;
};

export type CaseRecord = {
  id: string;
  title: string;
  allowedUserIds: string[];
  allowedRoles: Role[];
  documents: CaseDocument[];
};

/** Post-authz text. Never pass to LlmProvider. */
export type RawContext = {
  readonly __brand: 'raw';
  text: string;
  caseId: string;
  docIds: string[];
};

/** Built only by EgressGate. */
export type SanitizedContext = {
  readonly __brand: 'sanitized';
  text: string;
  caseId: string;
  redactions: number;
};

export type EgressDecision =
  | { kind: 'deny'; reason: string }
  | {
      kind: 'allow';
      context: SanitizedContext;
      mode: 'external' | 'local_only';
    };

export type AuditEvent = {
  ts: string;
  action: string;
  userId: string;
  caseId?: string;
  outcome: 'allow' | 'deny' | 'local_only';
  reason?: string;
  redactions?: number;
  egressChars?: number;
};

export type LlmProvider = {
  generate(context: SanitizedContext, prompt: string): Promise<string>;
};

export type PiiSpan = {
  start: number;
  end: number;
  type: string;
};

export const MAX_EGRESS_CHARS = 4000;

export const ALLOWLISTED_TOOLS = ['get_sanitized_case_summary'] as const;
export type AllowlistedTool = (typeof ALLOWLISTED_TOOLS)[number];

export function isAllowlistedTool(name: string): name is AllowlistedTool {
  return (ALLOWLISTED_TOOLS as readonly string[]).includes(name);
}

export function asRawContext(
  text: string,
  caseId: string,
  docIds: string[],
): RawContext {
  return { __brand: 'raw', text, caseId, docIds };
}

export function asSanitizedContext(
  text: string,
  caseId: string,
  redactions: number,
): SanitizedContext {
  return { __brand: 'sanitized', text, caseId, redactions };
}
