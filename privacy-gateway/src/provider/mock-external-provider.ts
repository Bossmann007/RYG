import type { LlmProvider, SanitizedContext } from '../domain/types.js';

export class MockExternalProvider implements LlmProvider {
  readonly calls: { context: SanitizedContext; prompt: string }[] = [];

  async generate(context: SanitizedContext, prompt: string): Promise<string> {
    this.calls.push({ context, prompt });
    return `mock-ok:${context.caseId}:${context.redactions}`;
  }
}

export class LocalOnlyResponder implements LlmProvider {
  async generate(context: SanitizedContext, prompt: string): Promise<string> {
    return `local_only summary for ${context.caseId} (${context.redactions} redactions). prompt_len=${prompt.length}`;
  }
}
