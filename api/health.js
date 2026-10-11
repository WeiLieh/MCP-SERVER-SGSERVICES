const BASE_MCP_URL = 'https://server.smithery.ai/vdineshk/sg-weather-data-mcp';

const IGNORED_ENV_KEYS = new Set([
  'GEMINI_API_KEY',
  'APP_URL',
  'PORT',
  'NODE_ENV',
  'PATH',
  'HOME',
  'PWD',
]);

function getApiKey() {
  const explicit =
    process.env.SMITHERY_API_KEY ||
    process.env.SMITHERY_KEY ||
    process.env.MCP_API_KEY ||
    process.env.MCP_KEY ||
    process.env.API_KEY ||
    process.env.BEARER_TOKEN ||
    process.env.MCP_SERVER_KEY;

  if (explicit) return explicit.trim();

  for (const [k, v] of Object.entries(process.env)) {
    if (!v || IGNORED_ENV_KEYS.has(k) || k.startsWith('VITE_') || k.startsWith('VERCEL') || k.startsWith('npm_')) {
      continue;
    }
    const upper = k.toUpperCase();
    if (upper.includes('SMITHERY') || upper.includes('MCP') || upper.endsWith('_API_KEY') || upper.endsWith('_TOKEN')) {
      return v.trim();
    }
  }
  return '';
}

export default async function handler(req, res) {
  try {
    const key = getApiKey();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    let targetUrl = BASE_MCP_URL;
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
      const urlObj = new URL(BASE_MCP_URL);
      urlObj.searchParams.set('api_key', key);
      targetUrl = urlObj.toString();
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        answered: true,
        ok: false,
        status: response.status,
        keyConfigured: Boolean(key),
        reason: key
          ? `Upstream MCP server returned HTTP ${response.status} (verify your Smithery API key is valid)`
          : `Upstream MCP server returned HTTP ${response.status} (missing Smithery API key in environment variables)`,
      });
    }

    await response.text();

    return res.status(200).json({
      answered: true,
      ok: true,
      status: response.status,
      keyConfigured: Boolean(key),
      reason: 'MCP server answered successfully',
    });
  } catch {
    return res.status(502).json({
      answered: false,
      ok: false,
      status: 502,
      reason: 'Upstream MCP server unreachable or network failure',
    });
  }
}
