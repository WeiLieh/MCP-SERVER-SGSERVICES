import { MCP_URL, getApiKey, openMcpSession } from './_mcp.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  const key = getApiKey();

  const session = await openMcpSession(key);
  const listed = session.ok ? await session.listTools() : session;
  const latencyMs = Date.now() - startTime;

  if (!listed.ok) {
    return res.status(listed.status).json({
      answered: listed.answered,
      ok: false,
      status: listed.status,
      latencyMs,
      keyConfigured: Boolean(key),
      server: MCP_URL,
      tools: [],
      reason: listed.reason,
    });
  }

  return res.status(200).json({
    answered: true,
    ok: true,
    status: listed.status,
    latencyMs,
    keyConfigured: Boolean(key),
    server: MCP_URL,
    tools: listed.tools,
    reason: 'MCP server answered successfully',
  });
}
