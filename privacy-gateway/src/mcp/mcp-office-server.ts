import type { SafeDTO } from '../domain/safe-dto.js';
import { serializeSafeDtoForMcp, validateSafeDto } from '../domain/safe-dto.js';
import type { UserPrincipal } from '../domain/types.js';
import { EgressFirewall } from '../firewall/egress-firewall.js';
import { VirtualOffice } from '../office/virtual-office.js';

export type McpToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type McpToolResult =
  | {
      isError: false;
      structuredContent: SafeDTO;
      /** Wire bytes that would enter the external agent context. */
      content: [{ type: 'text'; text: string }];
    }
  | {
      isError: true;
      content: [{ type: 'text'; text: string }];
    };

/**
 * BYOAI MCP boundary. External models only receive serialized SafeDTO bytes.
 */
export class McpOfficeServer {
  private readonly office: VirtualOffice;
  private readonly firewall: EgressFirewall;
  private readonly onFirewallBlock?: (code: string) => void;

  constructor(
    office: VirtualOffice = new VirtualOffice(),
    opts?: { firewall?: EgressFirewall; onFirewallBlock?: (code: string) => void },
  ) {
    this.office = office;
    this.firewall = opts?.firewall ?? new EgressFirewall();
    this.onFirewallBlock = opts?.onFirewallBlock;
  }

  callTool(user: UserPrincipal, call: McpToolCall): McpToolResult {
    const result = this.office.handleTool({
      toolName: call.name,
      user,
      caseId:
        typeof call.arguments.caseId === 'string'
          ? call.arguments.caseId
          : undefined,
      sessionId:
        typeof call.arguments.sessionId === 'string'
          ? call.arguments.sessionId
          : undefined,
      intent:
        typeof call.arguments.intent === 'string'
          ? call.arguments.intent
          : undefined,
    });

    if (!result.ok) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Requested resource could not be accessed.',
            }),
          },
        ],
      };
    }

    if (result.tool === 'enter_office' || result.tool === 'leave_office') {
      const lifecycle: SafeDTO = {
        schemaVersion: '1',
        sessionId: result.sessionId ?? 'ofs_none',
        releaseId: 'rel_session',
        summary:
          result.tool === 'enter_office'
            ? 'Office session opened. Private context remains server-side.'
            : 'Office session closed.',
        decisions: [],
        tasks: [],
        safeReferences: [],
        warnings: [
          {
            code: 'session_only',
            message: 'No case body released on session lifecycle tools.',
          },
        ],
      };
      return this.release(lifecycle);
    }

    if (!result.dto || !result.mcpBytes) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Requested resource could not be accessed.',
            }),
          },
        ],
      };
    }

    return this.release(result.dto, result.mcpBytes);
  }

  /** Single outbound path. Validate, serialize, then run the independent firewall. */
  private release(dto: SafeDTO, expectedBytes?: string): McpToolResult {
    const checked = validateSafeDto(dto);
    if (!checked.ok) {
      return publicError();
    }
    let wire: string;
    try {
      wire = serializeSafeDtoForMcp(checked.dto);
    } catch {
      return publicError();
    }
    if (expectedBytes !== undefined && wire !== expectedBytes) {
      return publicError();
    }
    const verdict = this.firewall.inspect(wire);
    if (!verdict.ok) {
      this.onFirewallBlock?.(verdict.code);
      return publicError();
    }
    return {
      isError: false,
      structuredContent: checked.dto,
      content: [{ type: 'text', text: wire }],
    };
  }
}

function publicError(): McpToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Requested resource could not be accessed.',
        }),
      },
    ],
  };
}
