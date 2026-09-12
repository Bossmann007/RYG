import { MAX_EGRESS_CHARS, type RawContext } from '../domain/types.js';

/** Field-priority truncation. Prefer thesis-like later docs over long party dumps. */
export class ContextMinimizer {
  constructor(private readonly maxChars = MAX_EGRESS_CHARS) {}

  minimize(raw: RawContext): RawContext {
    const chunks = raw.text.split(/\n\n+/);
    const preferred = [...chunks].reverse();
    let out = '';
    for (const chunk of preferred) {
      const next = out ? `${chunk}\n\n${out}` : chunk;
      if (next.length > this.maxChars) {
        const room = this.maxChars - (out ? out.length + 2 : 0);
        if (room <= 0) {
          break;
        }
        const clipped = chunk.slice(Math.max(0, chunk.length - room));
        out = out ? `${clipped}\n\n${out}` : clipped;
        break;
      }
      out = next;
    }
    if (!out) {
      out = raw.text.slice(0, this.maxChars);
    }
    if (out.length > this.maxChars) {
      out = out.slice(0, this.maxChars);
    }
    return { ...raw, text: out };
  }
}
