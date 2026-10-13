// Shared MCP client for api/health.js and api/bus.js.
// Files prefixed with "_" are not deployed by Vercel as serverless functions.

export const MCP_URL = 'https://server.smithery.ai/vdineshk/sg-weather-data-mcp';

const TIMEOUT_MS = 10000;
// HTTP 429 handling: wait (Retry-After, capped) and try again a limited number of times.
const MAX_429_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(response, attempt) {
  const header = Number(response.headers.get('retry-after'));
  const ms = Number.isFinite(header) && header > 0 ? header * 1000 : 1000 * 2 ** attempt;
  return Math.min(ms, MAX_RETRY_WAIT_MS);
}

export function getApiKey() {
  const key =
    process.env.SMITHERY_API_KEY ||
    process.env.Smithery_API_Key ||
    process.env.MCP_API_KEY ||
    process.env.API_KEY ||
    '';
  return key.trim();
}

function redact(text, key) {
  const str = String(text ?? '');
  return key ? str.split(key).join('[redacted]') : str;
}

function oneLine(text, key) {
  return redact(text, key).replace(/\s+/g, ' ').trim().slice(0, 500);
}

// Diagnostics for a non-2xx reply: rate-limit / retry headers and the start of
// the body, so the real cause (e.g. a per-minute vs daily quota) is visible.
const DIAGNOSTIC_HEADER = /rate|retry|limit|quota|reset/i;

async function describeUpstreamError(response) {
  const headers = [];
  response.headers.forEach((value, name) => {
    if (DIAGNOSTIC_HEADER.test(name)) headers.push(`${name}=${value}`);
  });
  let body = '';
  try {
    body = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 200);
  } catch {
    body = '';
  }
  return [
    headers.length ? `headers: ${headers.join(', ')}` : 'no rate-limit headers',
    body ? `body: "${body}"` : 'empty body',
  ].join(' · ');
}

function parseSseOrJson(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  const lines = trimmed.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('data:')) {
      const dataStr = line.slice(5).trim();
      if (dataStr.startsWith('{') || dataStr.startsWith('[')) {
        return JSON.parse(dataStr);
      }
    }
  }
  return null;
}

// answered: false when no HTTP reply came back from the MCP server at all.
function failure(status, reason, key, answered = true) {
  return { ok: false, answered, status, reason: oneLine(reason, key) };
}

// Opens an MCP session (initialize + notifications/initialized).
// Returns { ok: true, call } or { ok: false, status, reason }.
export async function openMcpSession(key) {
  let url = MCP_URL;
  let sessionId = null;
  let nextId = 1;

  async function post(body) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;

    const send = async (target) => {
      for (let attempt = 0; ; attempt++) {
        const response = await fetch(target, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status !== 429 || attempt >= MAX_429_RETRIES) return response;
        const wait = retryAfterMs(response, attempt);
        await response.body?.cancel();
        await sleep(wait);
      }
    };

    let response = await send(url);
    if ((response.status === 401 || response.status === 403) && key && url === MCP_URL) {
      const withParam = new URL(MCP_URL);
      withParam.searchParams.set('api_key', key);
      const retry = await send(withParam.toString());
      if (retry.ok) {
        url = withParam.toString();
        response = retry;
      }
    }
    return response;
  }

  // Sends one JSON-RPC request. Returns { ok: true, status, result } or a failure.
  async function rpc(method, params) {
    let response;
    try {
      response = await post({ jsonrpc: '2.0', id: nextId++, method, params });
    } catch (err) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      return failure(
        timedOut ? 504 : 502,
        timedOut
          ? `MCP server did not respond within ${TIMEOUT_MS / 1000}s`
          : 'MCP server unreachable (network error)',
        key,
        false
      );
    }

    if (!response.ok) {
      const stage = params?.name ? `${method} ${params.name}` : method;
      const details = await describeUpstreamError(response);
      const authHint =
        response.status === 401 || response.status === 403
          ? key
            ? ' (API key rejected)'
            : ' (SMITHERY_API_KEY is not set in environment)'
          : response.status === 429
            ? ` (rate limited: Too Many Requests, still failing after ${MAX_429_RETRIES} retries)`
            : '';
      return failure(
        response.status,
        `MCP server returned HTTP ${response.status} on ${stage}${authHint} · ${details}`,
        key
      );
    }

    const returnedSession = response.headers.get('mcp-session-id');
    if (returnedSession) sessionId = returnedSession;

    let parsed;
    try {
      parsed = parseSseOrJson(await response.text());
    } catch {
      parsed = null;
    }
    if (!parsed) {
      return failure(502, `MCP server returned an unreadable response to ${method}`, key);
    }
    if (parsed.error) {
      return failure(
        502,
        `MCP ${method} error ${parsed.error.code ?? ''}: ${parsed.error.message ?? 'unknown error'}`,
        key
      );
    }
    return { ok: true, status: response.status, result: parsed.result };
  }

  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'sg-asean-weather', version: '1.0.0' },
  });
  if (!init.ok) return init;

  try {
    const note = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    await note.body?.cancel();
  } catch {
    // A failed notification surfaces on the next request.
  }

  async function listTools() {
    const res = await rpc('tools/list', {});
    if (!res.ok) return res;
    const tools = Array.isArray(res.result?.tools) ? res.result.tools.map((t) => t.name) : [];
    return { ok: true, status: res.status, tools };
  }

  // Calls an MCP tool. Returns { ok: true, status, data } or a failure.
  async function callTool(name, args) {
    const res = await rpc('tools/call', { name, arguments: args || {} });
    if (!res.ok) return res;

    const result = res.result || {};
    const textItem = Array.isArray(result.content)
      ? result.content.find((c) => c.type === 'text')
      : undefined;

    if (result.isError) {
      return failure(502, `MCP tool ${name} reported an error: ${textItem?.text || 'no details'}`, key);
    }
    if (result.structuredContent && typeof result.structuredContent === 'object') {
      return { ok: true, status: res.status, data: result.structuredContent };
    }
    if (typeof textItem?.text === 'string') {
      try {
        return { ok: true, status: res.status, data: JSON.parse(textItem.text) };
      } catch {
        return failure(502, `MCP tool ${name} returned non-JSON content: ${textItem.text}`, key);
      }
    }
    return failure(502, `MCP tool ${name} returned no data`, key);
  }

  return { ok: true, status: init.status, listTools, callTool };
}
