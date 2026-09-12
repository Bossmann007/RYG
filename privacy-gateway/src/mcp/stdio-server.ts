import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpOfficeServer } from './mcp-office-server.js';
import { parseConnectionFromEnv } from './connection-context.js';

const TOOLS = [
  {
    name: 'enter_office',
    description:
      'Open a server-side office session. Returns a SafeDTO with an opaque session id.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: { type: 'string' },
      },
      required: ['caseId'],
      additionalProperties: false,
    },
  },
  {
    name: 'leave_office',
    description: 'Close an office session. Returns a SafeDTO ack.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_safe_summary',
    description:
      'Release a declassified SafeDTO for the session. Never returns raw case text.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        intent: { type: 'string' },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'ask_office',
    description:
      'Ask a question inside the office. The answer is a SafeDTO, not free text.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        intent: { type: 'string' },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
] as const;

function buildServer(): Server {
  const connection = parseConnectionFromEnv();
  const office = new McpOfficeServer({ connection });
  const server = new Server(
    { name: 'openlegalai-virtual-office', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...TOOLS],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    return office.callTool({ name, arguments: args });
  });

  return server;
}

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : 'stdio_boot_failed';
  console.error(message);
  process.exit(1);
});
