const BASE_MCP_URL = 'https://server.smithery.ai/vdineshk/sg-weather-data-mcp';

function getApiKey() {
  const key =
    process.env.SMITHERY_API_KEY ||
    process.env.Smithery_API_Key ||
    process.env.MCP_API_KEY ||
    process.env.API_KEY ||
    '';
  return key.trim();
}

async function probeMcp(url, headers) {
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
}

export default async function handler(req, res) {
  const startTime = Date.now();
  try {
    const key = getApiKey();
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    let response;
    if (key) {
      response = await probeMcp(BASE_MCP_URL, {
        ...baseHeaders,
        Authorization: `Bearer ${key}`,
      });

      if (!response.ok) {
        const urlWithParam = new URL(BASE_MCP_URL);
        urlWithParam.searchParams.set('api_key', key);
        const retryResponse = await probeMcp(urlWithParam.toString(), {
          ...baseHeaders,
          Authorization: `Bearer ${key}`,
        });
        if (retryResponse.ok) {
          response = retryResponse;
        }
      }
    } else {
      response = await probeMcp(BASE_MCP_URL, baseHeaders);
    }

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return res.status(response.status).json({
        answered: true,
        ok: false,
        status: response.status,
        latencyMs,
        keyConfigured: Boolean(key),
        reason: key
          ? `Upstream MCP server returned HTTP ${response.status}`
          : `Upstream MCP server returned HTTP ${response.status} (SMITHERY_API_KEY is not set in environment)`,
      });
    }

    await response.text();

    return res.status(200).json({
      answered: true,
      ok: true,
      status: response.status,
      latencyMs,
      keyConfigured: Boolean(key),
      reason: 'MCP server answered successfully',
    });
  } catch {
    const latencyMs = Date.now() - startTime;
    return res.status(502).json({
      answered: false,
      ok: false,
      status: 502,
      latencyMs,
      reason: 'Upstream MCP server unreachable or network failure',
    });
  }
}
