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

// The MCP server rate-limits (HTTP 429). Successful MCP results are reused for
// CACHE_SECONDS so page views don't each trigger a burst of MCP calls. Only
// successful MCP data is cached, and never past CACHE_SECONDS; failures are never cached.
const CACHE_SECONDS = 300;
const cache = new Map();

function cached(name) {
  const hit = cache.get(name);
  return hit && Date.now() - hit.at < CACHE_SECONDS * 1000 ? hit.result : null;
}

// Allows time for sequential calls plus 429 retries on Vercel.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const key = getApiKey();

  // Single-tool mode: /api/bus?tool=get_sg_psi
  const queryTool = req.query?.tool || req.body?.tool;
  if (queryTool) {
    const tool = String(queryTool).toLowerCase();
    if (!ALLOWED_TOOLS.has(tool)) {
      return res.status(400).json({ status: 400, reason: `Unsupported tool: ${tool}` });
    }
    const session = await openMcpSession(key);
    const result = session.ok ? await session.callTool(tool, req.body?.arguments || {}) : session;
    if (!result.ok) {
      return res
        .status(result.status)
        .json({ tool, status: result.status, reason: result.reason, upstream: result.upstream });
    }
    return res.status(200).json(result.data);
  }

  const names = Object.keys(SECTIONS);
  const results = names.map(cached);
  if (results.some((r) => !r)) {
    const session = await openMcpSession(key);
    // One call at a time to stay under the MCP server's rate limit.
    for (let i = 0; i < names.length; i++) {
      if (results[i]) continue;
      const name = names[i];
      results[i] = session.ok ? await session.callTool(SECTIONS[name].tool, SECTIONS[name].args) : session;
      if (results[i].ok) cache.set(name, { at: Date.now(), result: results[i] });
    }
  }

  const body = { ok: true, failures: [] };
  names.forEach((name, i) => {
    const r = results[i];
    body[name] = r.ok
      ? { ok: true, status: r.status, data: r.data }
      : { ok: false, status: r.status, reason: r.reason, upstream: r.upstream };
    if (!r.ok) {
      body.ok = false;
      // Short reason for the screen; full MCP reply (key redacted) is in body[name].upstream.
      body.failures.push({ tool: SECTIONS[name].tool, section: name, status: r.status, reason: r.reason });
    }
  });

  // Non-2xx when any MCP call failed; the body still carries the sections that succeeded.
  const status = body.ok ? 200 : body.failures[0].status;
  res.setHeader(
    'Cache-Control',
    body.ok ? `public, max-age=0, s-maxage=${CACHE_SECONDS}` : 'no-store'
  );
  return res.status(status).json(body);
}
