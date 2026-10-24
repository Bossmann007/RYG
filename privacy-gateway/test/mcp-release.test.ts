import { describe, expect, it } from 'vitest';
import type { SafeDTO } from '../src/domain/safe-dto.js';
import { serializeSafeDtoForMcp } from '../src/domain/safe-dto.js';
import { releaseForMcp } from '../src/mcp/mcp-release.js';

const DRAFT: SafeDTO = {
  schemaVersion: '1',
  sessionId: 'ofs_0a1b2c3d4e5f',
  releaseId: 'rel_0a1b2c3d4e',
  summary: 'Caso em fase recursal no TJSP.',
  decisions: [{ id: 'fase', text: 'Fase: recursal.' }],
  tasks: [{ id: 'ponto_1', text: 'Antecipe a linha do órgão.', status: 'open' }],
  safeReferences: [{ id: 'jur_1', label: 'REsp 1.845.321/SP', kind: 'public_jurisprudence' }],
  warnings: [{ code: 'omitted', message: 'texto dos andamentos' }],
};

describe('releaseForMcp', () => {
  it('releases the canonical wire bytes and the validated DTO', () => {
    const out = releaseForMcp(DRAFT);
    if (!out.ok) throw new Error(out.code);
    expect(out.wire).toBe(serializeSafeDtoForMcp(DRAFT));
    expect(JSON.parse(out.wire)).toEqual(out.dto);
  });

  it('denies a contract violation at the contract stage', () => {
    const out = releaseForMcp({ ...DRAFT, tipo: 'case_summary' });
    expect(out).toEqual({
      ok: false,
      stage: 'contract',
      code: 'SAFE_DTO_INVALID:unknown_field:tipo',
    });
  });

  it('denies a BR identifier at the firewall stage without echoing it', () => {
    const out = releaseForMcp({ ...DRAFT, summary: 'Parte CPF 529.982.247-25 no resumo' });
    expect(out).toEqual({ ok: false, stage: 'firewall', code: 'FIREWALL_BR_PATTERN' });
    expect(JSON.stringify(out)).not.toContain('529.982');
  });
});
