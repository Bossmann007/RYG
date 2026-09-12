import { AuditLog } from '../audit/audit-log.js';
import {
  asRawContext,
  isAllowlistedTool,
  type LlmProvider,
  type UserPrincipal,
} from '../domain/types.js';
import { EgressGate } from '../egress/egress-gate.js';
import { ContextMinimizer } from '../minimize/context-minimizer.js';
import { DeterministicBrPii } from '../pii/deterministic-br-pii.js';
import {
  NoopPresidioClient,
  type NerEngine,
  type PresidioClient,
} from '../pii/presidio-client.js';
import { CaseFixtureStore } from '../store/case-fixture-store.js';

export type GatewayConfig = {
  store: CaseFixtureStore;
  externalProvider: LlmProvider;
  localProvider: LlmProvider;
  presidio?: PresidioClient;
  presidioBudgetMs?: number;
  /** strict = deny when sidecar fails; local_fallback = local_only after deterministic PII */
  failClosedMode?: 'strict' | 'local_fallback';
  /**
   * When NER engine is weaker than Presidio (regex_fallback/noop), force local_only
   * so the demo cannot claim full Presidio coverage.
   */
  degradeOnWeakNer?: boolean;
  audit?: AuditLog;
  egressGate?: EgressGate;
  minimizer?: ContextMinimizer;
  brPii?: DeterministicBrPii;
};

export type GatewayResult =
  | {
      ok: true;
      answer: string;
      mode: 'external' | 'local_only';
      redactions: number;
      nerEngine: NerEngine;
    }
  | { ok: false; reason: string };

export class PrivacyGateway {
  private readonly store: CaseFixtureStore;
  private readonly externalProvider: LlmProvider;
  private readonly localProvider: LlmProvider;
  private readonly presidio: PresidioClient;
  private readonly presidioBudgetMs: number;
  private readonly failClosedMode: 'strict' | 'local_fallback';
  private readonly degradeOnWeakNer: boolean;
  private readonly audit: AuditLog;
  private readonly egressGate: EgressGate;
  private readonly minimizer: ContextMinimizer;
  private readonly brPii: DeterministicBrPii;

  constructor(config: GatewayConfig) {
    this.store = config.store;
    this.externalProvider = config.externalProvider;
    this.localProvider = config.localProvider;
    this.presidio = config.presidio ?? new NoopPresidioClient();
    this.presidioBudgetMs = config.presidioBudgetMs ?? 400;
    this.failClosedMode = config.failClosedMode ?? 'local_fallback';
    this.degradeOnWeakNer = config.degradeOnWeakNer ?? true;
    this.audit = config.audit ?? new AuditLog();
    this.egressGate = config.egressGate ?? new EgressGate();
    this.minimizer = config.minimizer ?? new ContextMinimizer();
    this.brPii = config.brPii ?? new DeterministicBrPii();
  }

  async getSanitizedCaseSummary(
    user: UserPrincipal,
    caseId: string,
    prompt: string,
    toolName = 'get_sanitized_case_summary',
  ): Promise<GatewayResult> {
    try {
      if (!isAllowlistedTool(toolName)) {
        this.audit.append({
          action: 'tool_denied',
          userId: user.id,
          caseId,
          outcome: 'deny',
          reason: 'tool_not_allowlisted',
        });
        return { ok: false, reason: 'tool_not_allowlisted' };
      }

      if (!user.role) {
        this.audit.append({
          action: 'rbac_denied',
          userId: user.id,
          caseId,
          outcome: 'deny',
          reason: 'missing_role',
        });
        return { ok: false, reason: 'missing_role' };
      }

      const raw = this.store.getAuthorizedSummary(user, caseId);
      if (!raw) {
        this.audit.append({
          action: 'rbac_denied',
          userId: user.id,
          caseId,
          outcome: 'deny',
          reason: 'unauthorized_or_missing_classification',
        });
        return { ok: false, reason: 'unauthorized_or_missing_classification' };
      }

      const minimized = this.minimizer.minimize(raw);
      const detSpans = this.brPii.findSpans(minimized.text);

      let mode: 'external' | 'local_only' = 'external';
      let nerSpans = [] as typeof detSpans;
      let nerEngine: NerEngine = 'none';
      try {
        const analyzed = await this.presidio.analyze(
          minimized.text,
          this.presidioBudgetMs,
        );
        nerSpans = analyzed.spans;
        nerEngine = analyzed.engine;
        if (
          this.degradeOnWeakNer &&
          (nerEngine === 'regex_fallback' || nerEngine === 'noop')
        ) {
          mode = 'local_only';
        }
      } catch {
        if (this.failClosedMode === 'strict') {
          this.audit.append({
            action: 'presidio_failed',
            userId: user.id,
            caseId,
            outcome: 'deny',
            reason: 'presidio_unavailable',
          });
          return { ok: false, reason: 'presidio_unavailable' };
        }
        mode = 'local_only';
        nerEngine = 'none';
      }

      const decision = this.egressGate.build(
        minimized,
        [...detSpans, ...nerSpans],
        mode,
      );
      if (decision.kind === 'deny') {
        this.audit.append({
          action: 'egress_denied',
          userId: user.id,
          caseId,
          outcome: 'deny',
          reason: decision.reason,
        });
        return { ok: false, reason: decision.reason };
      }

      const sanitizedPrompt = this.sanitizePrompt(prompt, caseId);
      if (sanitizedPrompt === null) {
        this.audit.append({
          action: 'prompt_denied',
          userId: user.id,
          caseId,
          outcome: 'deny',
          reason: 'prompt_sanitize_failed',
        });
        return { ok: false, reason: 'prompt_sanitize_failed' };
      }

      // Audit BEFORE provider call so a late audit failure cannot follow egress.
      this.audit.append({
        action: 'egress_intent',
        userId: user.id,
        caseId,
        outcome: decision.mode === 'external' ? 'allow' : 'local_only',
        reason: `ner_engine=${nerEngine}`,
        redactions: decision.context.redactions,
        egressChars: decision.context.text.length,
      });

      const provider =
        decision.mode === 'external'
          ? this.externalProvider
          : this.localProvider;

      const answer = await provider.generate(
        decision.context,
        sanitizedPrompt,
      );

      return {
        ok: true,
        answer,
        mode: decision.mode,
        redactions: decision.context.redactions,
        nerEngine,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      if (message.startsWith('FORBIDDEN_STRING_REACHED_PROVIDER')) {
        throw err;
      }
      if (
        message === 'audit_write_failed' ||
        message === 'audit_contains_cpf_shaped_data'
      ) {
        return { ok: false, reason: message };
      }
      return { ok: false, reason: message };
    }
  }

  /** Prompt is a second egress channel. Same BR deterministic redaction applies. */
  private sanitizePrompt(prompt: string, caseId: string): string | null {
    const raw = asRawContext(prompt, caseId, ['user-prompt']);
    const spans = this.brPii.findSpans(raw.text);
    const decision = this.egressGate.build(raw, spans, 'external');
    if (decision.kind === 'deny') {
      return null;
    }
    return decision.context.text;
  }
}
