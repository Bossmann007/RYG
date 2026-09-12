import type { LlmProvider, SanitizedContext } from '../domain/types.js';

/**
 * Wraps an LlmProvider and throws if any forbidden literal appears in the
 * outbound payload. Adversarial tests rely on this observable failure.
 */
export class ForbiddenStringSpy implements LlmProvider {
  constructor(
    private readonly inner: LlmProvider,
    private readonly forbidden: string[],
  ) {}

  async generate(context: SanitizedContext, prompt: string): Promise<string> {
    const blob = `${context.text}\n${prompt}`;
    for (const needle of this.forbidden) {
      if (needle && blob.includes(needle)) {
        throw new Error(`FORBIDDEN_STRING_REACHED_PROVIDER:${needle}`);
      }
    }
    return this.inner.generate(context, prompt);
  }
}
