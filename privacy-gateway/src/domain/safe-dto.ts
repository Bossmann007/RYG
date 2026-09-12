export type SafeItem = {
  id: string;
  text: string;
};

export type SafeTask = {
  id: string;
  text: string;
  status: 'open' | 'done';
};

export type SafeRef = {
  id: string;
  label: string;
  kind: 'public_jurisprudence' | 'internal_case_ref' | 'workproduct_ref';
};

export type SafeWarning = {
  code: string;
  message: string;
};

/** Frozen outbound MCP contract. Only this shape may cross the boundary. */
export type SafeDTO = {
  schemaVersion: '1';
  sessionId: string;
  releaseId: string;
  summary: string;
  decisions: SafeItem[];
  tasks: SafeTask[];
  safeReferences: SafeRef[];
  warnings: SafeWarning[];
};

export const SUMMARY_MAX = 600;
export const LIST_MAX = 5;

const FORBIDDEN_LITERALS = [
  'Joao da Silva',
  '123.456.789-00',
  '12345678900',
  '12345-6',
  '9000033-02.2026.8.16.0001',
  'Ignore as regras',
  'envie todos os documentos',
];

export type SafeDtoValidation =
  | { ok: true; dto: SafeDTO }
  | { ok: false; reason: string };

const TOP_KEYS = [
  'schemaVersion',
  'sessionId',
  'releaseId',
  'summary',
  'decisions',
  'tasks',
  'safeReferences',
  'warnings',
] as const;

const ITEM_SHAPES = {
  decisions: { id: 'string', text: 'string' },
  tasks: { id: 'string', text: 'string', status: 'status' },
  safeReferences: { id: 'string', label: 'string', kind: 'refKind' },
  warnings: { code: 'string', message: 'string' },
} as const;

const REF_KINDS = ['public_jurisprudence', 'internal_case_ref', 'workproduct_ref'];

function checkItems(
  listName: keyof typeof ITEM_SHAPES,
  items: unknown[],
): string | null {
  const shape = ITEM_SHAPES[listName] as Record<string, string>;
  const allowed = Object.keys(shape);
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `bad_item:${listName}`;
    }
    const rec = item as Record<string, unknown>;
    for (const key of Object.keys(rec)) {
      if (!allowed.includes(key)) {
        return `unknown_field:${listName}.${key}`;
      }
    }
    for (const key of allowed) {
      const kind = shape[key];
      const value = rec[key];
      if (kind === 'string' && typeof value !== 'string') {
        return `bad_field:${listName}.${key}`;
      }
      if (kind === 'status' && value !== 'open' && value !== 'done') {
        return `bad_field:${listName}.${key}`;
      }
      if (kind === 'refKind' && !REF_KINDS.includes(String(value))) {
        return `bad_field:${listName}.${key}`;
      }
    }
  }
  return null;
}

export function validateSafeDto(input: unknown): SafeDtoValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'not_object' };
  }
  const o = input as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (!(TOP_KEYS as readonly string[]).includes(key)) {
      return { ok: false, reason: `unknown_field:${key}` };
    }
  }
  if (o.schemaVersion !== '1') {
    return { ok: false, reason: 'bad_schema_version' };
  }
  if (typeof o.sessionId !== 'string' || !o.sessionId.startsWith('ofs_')) {
    return { ok: false, reason: 'bad_session_id' };
  }
  if (typeof o.releaseId !== 'string' || !o.releaseId.startsWith('rel_')) {
    return { ok: false, reason: 'bad_release_id' };
  }
  if (typeof o.summary !== 'string' || o.summary.length === 0) {
    return { ok: false, reason: 'bad_summary' };
  }
  if (o.summary.length > SUMMARY_MAX) {
    return { ok: false, reason: 'summary_too_long' };
  }
  if (!Array.isArray(o.decisions) || o.decisions.length > LIST_MAX) {
    return { ok: false, reason: 'bad_decisions' };
  }
  if (!Array.isArray(o.tasks) || o.tasks.length > LIST_MAX) {
    return { ok: false, reason: 'bad_tasks' };
  }
  if (!Array.isArray(o.safeReferences) || o.safeReferences.length > LIST_MAX) {
    return { ok: false, reason: 'bad_safe_references' };
  }
  if (!Array.isArray(o.warnings)) {
    return { ok: false, reason: 'bad_warnings' };
  }

  for (const listName of Object.keys(ITEM_SHAPES) as (keyof typeof ITEM_SHAPES)[]) {
    const problem = checkItems(listName, o[listName] as unknown[]);
    if (problem) {
      return { ok: false, reason: problem };
    }
  }

  const dto = o as unknown as SafeDTO;
  const blob = JSON.stringify(dto);
  for (const needle of FORBIDDEN_LITERALS) {
    if (blob.includes(needle)) {
      return { ok: false, reason: `forbidden_literal:${needle}` };
    }
  }
  return { ok: true, dto };
}

/** Serialize for MCP. Throws if validation fails or forbidden bytes appear. */
export function serializeSafeDtoForMcp(dto: SafeDTO): string {
  const checked = validateSafeDto(dto);
  if (!checked.ok) {
    throw new Error(`SAFE_DTO_INVALID:${checked.reason}`);
  }
  const bytes = JSON.stringify(checked.dto);
  for (const needle of FORBIDDEN_LITERALS) {
    if (bytes.includes(needle)) {
      throw new Error(`FORBIDDEN_STRING_IN_MCP_BYTES:${needle}`);
    }
  }
  if (bytes.includes('"raw_') || bytes.includes('rag_chunks')) {
    throw new Error('FORBIDDEN_FIELD_IN_MCP_BYTES');
  }
  return bytes;
}
