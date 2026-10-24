import type { SafeDTO } from '../domain/safe-dto.js';
import { serializeSafeDtoForMcp, validateSafeDto } from '../domain/safe-dto.js';
import { EgressFirewall } from '../firewall/egress-firewall.js';

export type McpRelease =
  | { ok: true; dto: SafeDTO; wire: string }
  | { ok: false; stage: 'contract' | 'firewall'; code: string };

/**
 * The only path from a drafted SafeDTO to MCP wire bytes. Every MCP surface
 * (stdio harness and Nest `/api/mcp`) releases through here. Codes are stable
 * and never echo the matched content.
 */
export function releaseForMcp(
  draft: unknown,
  firewall: EgressFirewall = new EgressFirewall(),
): McpRelease {
  const checked = validateSafeDto(draft);
  if (!checked.ok) {
    return { ok: false, stage: 'contract', code: `SAFE_DTO_INVALID:${checked.reason}` };
  }
  let wire: string;
  try {
    wire = serializeSafeDtoForMcp(checked.dto);
  } catch (err) {
    return {
      ok: false,
      stage: 'contract',
      code: err instanceof Error ? err.message : 'SAFE_DTO_SERIALIZE_FAILED',
    };
  }
  const verdict = firewall.inspect(wire);
  if (!verdict.ok) {
    return { ok: false, stage: 'firewall', code: verdict.code };
  }
  return { ok: true, dto: checked.dto, wire };
}
