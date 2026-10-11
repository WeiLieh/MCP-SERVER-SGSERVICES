const MCP_URL = 'https://server.smithery.ai/vdineshk/sg-weather-data-mcp';

function getApiKey() {
  return (
    process.env.SMITHERY_API_KEY ||
    process.env.MCP_API_KEY ||
    process.env.API_KEY ||
    process.env.SMITHERY_KEY ||
    process.env.BEARER_TOKEN ||
    ''
  );
}

export default async function handler(req, res) {
  try {
    const key = getApiKey();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const response = await fetch(MCP_URL, {
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
        reason: `Upstream MCP server responded with HTTP ${response.status} ${response.statusText || ''}`.trim(),
      });
    }

    await response.text();

    return res.status(200).json({
      answered: true,
      ok: true,
      status: response.status,
      reason: 'MCP server answered successfully',
    });
  } catch (err) {
    return res.status(502).json({
      answered: false,
      ok: false,
      status: 502,
      reason: 'Upstream MCP server unreachable or network failure',
    });
  }
}
