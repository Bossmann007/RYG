import type { PiiSpan } from '../domain/types.js';

export type NerEngine = 'presidio' | 'regex_fallback' | 'noop' | 'none';

export type AnalyzeResult = {
  spans: PiiSpan[];
  engine: NerEngine;
};

export type PresidioClient = {
  analyze(text: string, timeoutMs: number): Promise<AnalyzeResult>;
};

/** Optional HTTP client. Failures must not open the egress path. */
export class HttpPresidioClient implements PresidioClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async analyze(text: string, timeoutMs: number): Promise<AnalyzeResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await this.fetchImpl(new URL('/v1/analyze', this.baseUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, language: 'pt', timeout_ms: timeoutMs }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new Error(`presidio_http_${res.status}`);
      }
      const body = (await res.json()) as {
        engine?: NerEngine;
        spans?: { start: number; end: number; entity_type?: string; type?: string }[];
      };
      const engine = body.engine;
      if (!engine) {
        throw new Error('presidio_missing_engine');
      }
      return {
        engine,
        spans: (body.spans ?? []).map((s) => ({
          start: s.start,
          end: s.end,
          type: s.entity_type ?? s.type ?? 'UNKNOWN',
        })),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Always fails. Forces local_only / deny path in tests. */
export class DownPresidioClient implements PresidioClient {
  async analyze(): Promise<AnalyzeResult> {
    throw new Error('presidio_down');
  }
}

/** No-op NER. Deterministic BR spans still apply. Engine is explicit. */
export class NoopPresidioClient implements PresidioClient {
  async analyze(): Promise<AnalyzeResult> {
    return { spans: [], engine: 'noop' };
  }
}

/** Test double: claims regex_fallback without throwing. */
export class RegexFallbackPresidioClient implements PresidioClient {
  async analyze(): Promise<AnalyzeResult> {
    return { spans: [], engine: 'regex_fallback' };
  }
}
