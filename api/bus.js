import { getApiKey, openMcpSession } from './_mcp.js';

// Every section of the app maps to exactly one MCP tool call. There are no
// alternate data sources: a failed call is reported, never replaced.
const SECTIONS = {
  get_sg_psi: { tool: 'get_sg_psi', args: {} },
  get_sg_weather_now: { tool: 'get_sg_weather_now', args: {} },
  get_sg_forecast_24h: { tool: 'get_sg_forecast', args: { period: '24h' } },
  get_sg_forecast_4day: { tool: 'get_sg_forecast', args: { period: '4day' } },
  get_asean_climate: { tool: 'get_asean_climate', args: {} },
};

const ALLOWED_TOOLS = new Set(Object.values(SECTIONS).map((s) => s.tool));

export default async function handler(req, res) {
  const key = getApiKey();
  const session = await openMcpSession(key);

  // Single-tool mode: /api/bus?tool=get_sg_psi
  const queryTool = req.query?.tool || req.body?.tool;
  if (queryTool) {
    const tool = String(queryTool).toLowerCase();
    if (!ALLOWED_TOOLS.has(tool)) {
      return res.status(400).json({ status: 400, reason: `Unsupported tool: ${tool}` });
    }
    const result = session.ok ? await session.callTool(tool, req.body?.arguments || {}) : session;
    if (!result.ok) {
      return res.status(result.status).json({ tool, status: result.status, reason: result.reason });
    }
    return res.status(200).json(result.data);
  }

  const names = Object.keys(SECTIONS);
  const results = await Promise.all(
    names.map((name) =>
      session.ok ? session.callTool(SECTIONS[name].tool, SECTIONS[name].args) : session
    )
  );

  const body = { ok: true, failures: [] };
  names.forEach((name, i) => {
    const r = results[i];
    body[name] = r.ok
      ? { ok: true, status: r.status, data: r.data }
      : { ok: false, status: r.status, reason: r.reason };
    if (!r.ok) {
      body.ok = false;
      body.failures.push({ tool: SECTIONS[name].tool, section: name, status: r.status, reason: r.reason });
    }
  });

  // Non-2xx when any MCP call failed; the body still carries the sections that succeeded.
  const status = body.ok ? 200 : body.failures[0].status;
  return res.status(status).json(body);
}
