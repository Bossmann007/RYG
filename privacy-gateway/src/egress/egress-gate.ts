import {
  asSanitizedContext,
  MAX_EGRESS_CHARS,
  type EgressDecision,
  type PiiSpan,
  type RawContext,
  type SanitizedContext,
} from '../domain/types.js';

export type PseudonymMap = Map<string, string>;

const TOKEN_BY_TYPE: Record<string, string> = {
  BR_CPF: '[CPF_REDACTED]',
  BR_CNPJ: '[CNPJ_REDACTED]',
  BR_ACCOUNT: '[ACCOUNT_REDACTED]',
  PERSON: '[CLIENT]',
  PROCESS: '[PROCESS_REDACTED]',
  MONEY: '[AMOUNT_REDACTED]',
};

export class EgressGate {
  constructor(
    private readonly map: PseudonymMap = new Map(),
    private readonly maxChars = MAX_EGRESS_CHARS,
  ) {}

  build(
    raw: RawContext,
    spans: PiiSpan[],
    mode: 'external' | 'local_only',
  ): EgressDecision {
    if (!raw.caseId || !raw.text) {
      return { kind: 'deny', reason: 'missing_raw_context' };
    }

    const processSpans = findProcessSpans(raw.text);
    const moneySpans = findMoneySpans(raw.text);
    const all = [...spans, ...processSpans, ...moneySpans].sort(
      (a, b) => b.start - a.start,
    );

    let text = raw.text;
    let redactions = 0;
    for (const span of all) {
      if (span.start < 0 || span.end > text.length || span.start >= span.end) {
        continue;
      }
      const original = text.slice(span.start, span.end);
      const token = tokenFor(span.type, original, this.map);
      text = text.slice(0, span.start) + token + text.slice(span.end);
      redactions += 1;
    }

    if (text.length > this.maxChars) {
      text = text.slice(0, this.maxChars);
    }

    const context: SanitizedContext = asSanitizedContext(
      text,
      raw.caseId,
      redactions,
    );
    return { kind: 'allow', context, mode };
  }

  /** Test helper: map stays private to the process. */
  debugMapSize(): number {
    return this.map.size;
  }
}

function tokenFor(
  type: string,
  original: string,
  map: PseudonymMap,
): string {
  const base = TOKEN_BY_TYPE[type] ?? `[REDACTED_${type}]`;
  if (type === 'PERSON' || type.startsWith('PERSON')) {
    const existing = [...map.entries()].find(([, v]) => v === original)?.[0];
    if (existing) {
      return existing;
    }
    const token = `[CLIENT_${map.size + 1}]`;
    map.set(token, original);
    return token;
  }
  return base;
}

function findProcessSpans(text: string): PiiSpan[] {
  const re = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g;
  const out: PiiSpan[] = [];
  for (const match of text.matchAll(re)) {
    if (match.index === undefined) {
      continue;
    }
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'PROCESS',
    });
  }
  return out;
}

function findMoneySpans(text: string): PiiSpan[] {
  const re = /R\$\s*[\d.]+(?:,\d{2})?/g;
  const out: PiiSpan[] = [];
  for (const match of text.matchAll(re)) {
    if (match.index === undefined) {
      continue;
    }
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'MONEY',
    });
  }
  return out;
}
