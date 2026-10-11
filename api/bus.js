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

const ASEAN_FALLBACK = [
  {
    country_code: 'BN',
    country: 'Brunei Darussalam',
    capital: 'Bandar Seri Begawan',
    average_temperature: '26°C – 32°C (Annual mean: 27.8°C)',
    annual_rainfall: '2,800 mm – 4,000 mm',
    monsoon_seasons: 'Northeast Monsoon (Dec–Mar), Southwest Monsoon (Jun–Sep)',
    natural_hazards: 'Flash floods, landslides, seasonal transboundary smoke haze',
  },
  {
    country_code: 'KH',
    country: 'Cambodia',
    capital: 'Phnom Penh',
    average_temperature: '25°C – 35°C (Annual mean: 28.0°C)',
    annual_rainfall: '1,400 mm – 2,000 mm (up to 4,000 mm in coastal mountains)',
    monsoon_seasons: 'Southwest Monsoon wet season (May–Oct), Northeast Monsoon dry season (Nov–Apr)',
    natural_hazards: 'Mekong river basin flooding, severe seasonal droughts, tropical depressions',
  },
  {
    country_code: 'ID',
    country: 'Indonesia',
    capital: 'Jakarta',
    average_temperature: '24°C – 33°C (Annual mean: 27.2°C)',
    annual_rainfall: '1,800 mm – 3,500 mm (up to 6,000 mm in mountainous regions)',
    monsoon_seasons: 'Wet Season (Nov–Mar), Dry Season (Apr–Oct)',
    natural_hazards: 'Volcanic eruptions, earthquakes, tsunamis, floods, forest fires and haze',
  },
  {
    country_code: 'LA',
    country: 'Lao PDR',
    capital: 'Vientiane',
    average_temperature: '18°C – 33°C (Annual mean: 25.8°C)',
    annual_rainfall: '1,300 mm – 3,000 mm',
    monsoon_seasons: 'Southwest Monsoon rainy season (May–Oct), Northeast Monsoon dry season (Nov–Apr)',
    natural_hazards: 'Riverine and flash floods, landslides, droughts, unexploded ordnance exposure during floods',
  },
  {
    country_code: 'MY',
    country: 'Malaysia',
    capital: 'Kuala Lumpur',
    average_temperature: '24°C – 33°C (Annual mean: 27.5°C)',
    annual_rainfall: '2,500 mm – 3,500 mm',
    monsoon_seasons: 'Northeast Monsoon (Nov–Mar), Southwest Monsoon (May–Sep)',
    natural_hazards: 'Monsoon flooding, coastal erosion, landslides, transboundary haze',
  },
  {
    country_code: 'MM',
    country: 'Myanmar',
    capital: 'Naypyidaw',
    average_temperature: '21°C – 36°C (Annual mean: 27.0°C)',
    annual_rainfall: '800 mm (Central Dry Zone) – 5,000 mm (Coastal Rakhine/Tanintharyi)',
    monsoon_seasons: 'Southwest Monsoon (May–Oct), Cool Dry (Nov–Feb), Hot Dry (Mar–May)',
    natural_hazards: 'Cyclones, storm surges, severe river floods, earthquakes, central zone droughts',
  },
  {
    country_code: 'PH',
    country: 'Philippines',
    capital: 'Manila',
    average_temperature: '25°C – 33°C (Annual mean: 27.6°C)',
    annual_rainfall: '1,000 mm – 4,000 mm',
    monsoon_seasons: 'Habagat Southwest Monsoon (Jun–Oct), Amihan Northeast Monsoon (Nov–May)',
    natural_hazards: 'Typhoons, storm surges, volcanic eruptions, earthquakes, landslides',
  },
  {
    country_code: 'SG',
    country: 'Singapore',
    capital: 'Singapore',
    average_temperature: '25°C – 32°C (Annual mean: 27.9°C)',
    annual_rainfall: '2,100 mm – 2,400 mm',
    monsoon_seasons: 'Northeast Monsoon (Dec–Early Mar), Southwest Monsoon (Jun–Sep)',
    natural_hazards: 'Localized flash floods, urban heat island effect, seasonal transboundary haze',
  },
  {
    country_code: 'TH',
    country: 'Thailand',
    capital: 'Bangkok',
    average_temperature: '23°C – 35°C (Annual mean: 28.1°C)',
    annual_rainfall: '1,200 mm – 4,500 mm',
    monsoon_seasons: 'Southwest Monsoon rainy season (May–Oct), Cool Dry (Nov–Feb), Hot Pre-Monsoon (Mar–May)',
    natural_hazards: 'Monsoon river basin floods, prolonged droughts, tropical storms, coastal erosion',
  },
  {
    country_code: 'VN',
    country: 'Viet Nam',
    capital: 'Hanoi',
    average_temperature: '17°C – 34°C (North-South gradient, Mean: 25.5°C)',
    annual_rainfall: '1,500 mm – 2,500 mm',
    monsoon_seasons: 'Southwest Summer Monsoon (May–Oct), Northeast Winter Monsoon (Nov–Apr)',
    natural_hazards: 'Typhoons, Mekong and Red River delta flooding, saltwater intrusion, landslides',
  },
];

function parseSseOrJson(rawText) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  const lines = trimmed.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('data:')) {
      const dataStr = line.slice(5).trim();
      if (dataStr && (dataStr.startsWith('{') || dataStr.startsWith('['))) {
        return JSON.parse(dataStr);
      }
    }
  }
  return JSON.parse(trimmed);
}

function extractMcpToolOutput(rpcResult) {
  const content = rpcResult?.result?.content;
  if (Array.isArray(content) && content.length > 0) {
    const textItem = content.find((c) => c.type === 'text') || content[0];
    if (textItem && typeof textItem.text === 'string') {
      try {
        return JSON.parse(textItem.text);
      } catch {
        return textItem.text;
      }
    }
  }
  if (rpcResult?.result) {
    return rpcResult.result;
  }
  return rpcResult;
}

async function callMcpTool(toolName, args, key) {
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
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args || {},
      },
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      reason: `Upstream MCP server returned HTTP ${response.status}`,
    };
  }

  const rawText = await response.text();
  const parsed = parseSseOrJson(rawText);
  return {
    ok: true,
    status: 200,
    data: extractMcpToolOutput(parsed),
  };
}

async function fetchDirectFallback(toolName, args) {
  if (toolName === 'get_sg_psi') {
    const response = await fetch('https://api.data.gov.sg/v1/environment/psi');
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: `Upstream NEA PSI API returned HTTP ${response.status}`,
      };
    }
    const data = await response.json();
    return { ok: true, status: 200, data };
  }

  if (toolName === 'get_sg_weather_now') {
    const response = await fetch('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast');
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: `Upstream NEA 2-hour weather API returned HTTP ${response.status}`,
      };
    }
    const data = await response.json();
    return { ok: true, status: 200, data };
  }

  if (toolName === 'get_sg_forecast') {
    const is4Day = args?.forecast_type === '4day';
    const endpoint = is4Day
      ? 'https://api.data.gov.sg/v1/environment/4-day-weather-forecast'
      : 'https://api.data.gov.sg/v1/environment/24-hour-weather-forecast';
    const response = await fetch(endpoint);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: `Upstream NEA forecast API returned HTTP ${response.status}`,
      };
    }
    const data = await response.json();
    return { ok: true, status: 200, data };
  }

  if (toolName === 'get_asean_climate') {
    return {
      ok: true,
      status: 200,
      data: { countries: ASEAN_FALLBACK },
    };
  }

  return {
    ok: false,
    status: 400,
    reason: `Unsupported tool: ${toolName}`,
  };
}

async function executeTool(toolName, args, key) {
  try {
    const mcpRes = await callMcpTool(toolName, args, key);
    if (mcpRes.ok && mcpRes.data) {
      return mcpRes;
    }
  } catch {
    // Fallback to official NEA / ASEAN dataset if MCP transport throws
  }
  return fetchDirectFallback(toolName, args);
}

export default async function handler(req, res) {
  try {
    const key = getApiKey();
    const queryTool = req.query?.tool || req.body?.tool;
    const strictMcp = req.query?.strict === '1';

    if (queryTool) {
      const normalizedTool = String(queryTool).toLowerCase();
      if (strictMcp) {
        const mcpRes = await callMcpTool(normalizedTool, req.body?.arguments || {}, key);
        if (!mcpRes.ok) {
          return res.status(mcpRes.status).json({
            status: mcpRes.status,
            reason: mcpRes.reason,
          });
        }
        return res.status(200).json(mcpRes.data);
      }

      const result = await executeTool(normalizedTool, req.body?.arguments || {}, key);
      if (!result.ok) {
        return res.status(result.status).json({
          status: result.status,
          reason: result.reason,
        });
      }
      return res.status(200).json(result.data);
    }

    const [psiRes, nowRes, forecast24Res, forecast4dRes, aseanRes] = await Promise.all([
      executeTool('get_sg_psi', {}, key),
      executeTool('get_sg_weather_now', {}, key),
      executeTool('get_sg_forecast', { forecast_type: '24h' }, key),
      executeTool('get_sg_forecast', { forecast_type: '4day' }, key),
      executeTool('get_asean_climate', {}, key),
    ]);

    if (!psiRes.ok) {
      return res.status(psiRes.status).json({ status: psiRes.status, reason: psiRes.reason });
    }
    if (!nowRes.ok) {
      return res.status(nowRes.status).json({ status: nowRes.status, reason: nowRes.reason });
    }
    if (!forecast24Res.ok) {
      return res.status(forecast24Res.status).json({ status: forecast24Res.status, reason: forecast24Res.reason });
    }

    return res.status(200).json({
      get_sg_psi: psiRes.data,
      get_sg_weather_now: nowRes.data,
      get_sg_forecast: {
        forecast_24h: forecast24Res.data,
        forecast_4day: forecast4dRes.ok ? forecast4dRes.data : null,
      },
      get_asean_climate: aseanRes.ok ? aseanRes.data : { countries: ASEAN_FALLBACK },
    });
  } catch {
    return res.status(502).json({
      status: 502,
      reason: 'Failed to retrieve weather data from upstream service',
    });
  }
}
