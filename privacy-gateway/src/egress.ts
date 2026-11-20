import { serializeSafeDtoForMcp, validateSafeDto, type SafeDTO } from './domain/safe-dto.js';
import { EgressFirewall } from './firewall/egress-firewall.js';

export { serializeSafeDtoForMcp, validateSafeDto };
export type { SafeDTO };

const firewall = new EgressFirewall();

export type ReleaseResult =
  | { ok: true; wire: string; dto: SafeDTO }
  | { ok: false; reason: string };

/** Validate, serialize, then firewall. The wire is the serializer output only. */
export function releaseSafeDto(input: unknown): ReleaseResult {
  const checked = validateSafeDto(input);
  if (!checked.ok) {
    return { ok: false, reason: checked.reason };
  }

  let wire: string;
  try {
    wire = serializeSafeDtoForMcp(checked.dto);
  } catch (erro) {
    const message = erro instanceof Error ? erro.message : 'serialize';
    const reason = message.split(':')[0] || 'serialize';
    return { ok: false, reason };
  }

  const verdict = firewall.inspect(wire);
  if (!verdict.ok) {
    return { ok: false, reason: verdict.code };
  }

  return { ok: true, wire, dto: checked.dto };
}
