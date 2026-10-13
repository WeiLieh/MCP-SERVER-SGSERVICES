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

// The on-screen reason is short; the full upstream reply goes in `upstream`.
const REASON_MAX_CHARS = 200;

function oneLine(text, key) {
  return redact(text, key).replace(/\s+/g, ' ').trim().slice(0, REASON_MAX_CHARS);
}

// Redacts the key anywhere inside a JSON-compatible value.
function redactValue(value, key) {
  if (!key || value === undefined) return value;
  return JSON.parse(redact(JSON.stringify(value), key));
}

// Parses text as JSON (or an SSE "data:" line) when possible, else returns the text.
function parseBody(text) {
  try {
    return parseSseOrJson(text) ?? text;
  } catch {
    return text;
  }
}

const DIAGNOSTIC_HEADER = /rate|retry|limit|quota|reset/i;

// Full details of a non-2xx reply: rate-limit / retry headers and the complete
// body (key redacted), for the endpoints' JSON.
async function readUpstreamError(response, stage, key) {
  const headers = {};
  response.headers.forEach((value, name) => {
    if (DIAGNOSTIC_HEADER.test(name)) headers[name] = redact(value, key);
  });
  let text = '';
  try {
    text = redact(await response.text(), key);
  } catch {
    text = '';
  }
  return { stage, status: response.status, headers, body: parseBody(text) };
}

// Short human-readable message from an upstream error body, e.g.
// "Rate limit exceeded. Free tier: 5 calls/day. (0 calls left today)".
function upstreamMessage(body) {
  if (typeof body === 'string') return body.length <= 120 ? body : '';
  const err = body?.error;
  const message =
    (typeof err === 'string' ? err : err?.message) ?? (typeof body?.message === 'string' ? body.message : '');
  const remaining = err?.data?.meta?.calls_remaining_today ?? body?.meta?.calls_remaining_today;
  if (!message) return '';
  return remaining !== undefined ? `${message} (${remaining} calls left today)` : message;
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
// upstream: full details of what the MCP server sent back (key redacted).
function failure(status, reason, key, answered = true, upstream = undefined) {
  return { ok: false, answered, status, reason: oneLine(reason, key), upstream };
}

// Opens an MCP session (initialize + notifications/initialized).
// Returns { ok: true, listTools, callTool } or { ok: false, status, reason, upstream }.
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
    const stage = params?.name ? `${method} ${params.name}` : method;
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
        false,
        { stage, error: err?.name || 'Error', message: redact(err?.message, key) }
      );
    }

    if (!response.ok) {
      const upstream = await readUpstreamError(response, stage, key);
      const message = upstreamMessage(upstream.body);
      const hint =
        response.status === 401 || response.status === 403
          ? key
            ? 'API key rejected'
            : 'SMITHERY_API_KEY is not set in environment'
          : response.status === 429
            ? `${message ? '' : 'rate limited, '}after ${MAX_429_RETRIES} retries`
            : '';
      return failure(
        response.status,
        `HTTP ${response.status} on ${stage}: ${message || 'MCP server error'}${hint ? ` [${hint}]` : ''}`,
        key,
        true,
        upstream
      );
    }

    const returnedSession = response.headers.get('mcp-session-id');
    if (returnedSession) sessionId = returnedSession;

    let text = '';
    let parsed;
    try {
      text = await response.text();
      parsed = parseSseOrJson(text);
    } catch {
      parsed = null;
    }
    if (!parsed) {
      return failure(502, `MCP server returned an unreadable response to ${stage}`, key, true, {
        stage,
        status: response.status,
        body: redact(text, key),
      });
    }
    if (parsed.error) {
      return failure(
        502,
        `MCP error on ${stage}: ${upstreamMessage(parsed) || `code ${parsed.error.code ?? 'unknown'}`}`,
        key,
        true,
        { stage, status: response.status, body: redactValue(parsed, key) }
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

    const stage = `tools/call ${name}`;
    if (result.isError) {
      return failure(502, `MCP tool ${name} reported an error: ${textItem?.text || 'no details'}`, key, true, {
        stage,
        status: res.status,
        body: redactValue(result, key),
      });
    }
    if (result.structuredContent && typeof result.structuredContent === 'object') {
      return { ok: true, status: res.status, data: result.structuredContent };
    }
    if (typeof textItem?.text === 'string') {
      try {
        return { ok: true, status: res.status, data: JSON.parse(textItem.text) };
      } catch {
        return failure(502, `MCP tool ${name} returned non-JSON content: ${textItem.text}`, key, true, {
          stage,
          status: res.status,
          body: redact(textItem.text, key),
        });
      }
    }
    return failure(502, `MCP tool ${name} returned no data`, key, true, {
      stage,
      status: res.status,
      body: redactValue(result, key),
    });
  }

  return { ok: true, status: init.status, listTools, callTool };
}
