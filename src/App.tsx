import { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sun,
  Wrench,
  Wind,
  XCircle,
} from 'lucide-react';

interface PsiRegionValues {
  national?: number;
  central?: number;
  west?: number;
  east?: number;
  north?: number;
  south?: number;
  [key: string]: number | undefined;
}

interface PsiData {
  timestamp?: string;
  update_timestamp?: string;
  readings?: {
    psi_twenty_four_hourly?: PsiRegionValues;
    pm25_twenty_four_hourly?: PsiRegionValues;
    pm10_twenty_four_hourly?: PsiRegionValues;
    o3_sub_index?: PsiRegionValues;
    co_sub_index?: PsiRegionValues;
    so2_sub_index?: PsiRegionValues;
    no2_one_hour_max?: PsiRegionValues;
  };
  items?: Array<{
    timestamp?: string;
    update_timestamp?: string;
    readings?: {
      psi_twenty_four_hourly?: PsiRegionValues;
      pm25_twenty_four_hourly?: PsiRegionValues;
      pm10_twenty_four_hourly?: PsiRegionValues;
      o3_sub_index?: PsiRegionValues;
      co_sub_index?: PsiRegionValues;
      so2_sub_index?: PsiRegionValues;
      no2_one_hour_max?: PsiRegionValues;
    };
  }>;
  regions?: Record<string, any>;
  region_metadata?: Array<{ name?: string; label_location?: { latitude?: number; longitude?: number } }>;
}

interface WeatherNowArea {
  area?: string;
  name?: string;
  forecast: string;
}

interface WeatherNowData {
  items?: Array<{
    update_timestamp?: string;
    timestamp?: string;
    valid_period?: { start?: string; end?: string };
    forecasts?: WeatherNowArea[];
  }>;
  forecasts?: WeatherNowArea[];
  valid_period?: { start?: string; end?: string };
}

interface Forecast24hPeriod {
  time?: { start?: string; end?: string };
  regions?: {
    west?: string;
    east?: string;
    central?: string;
    south?: string;
    north?: string;
  };
}

interface Forecast4DayItem {
  date?: string;
  forecast?: string;
  temperature?: { low?: number; high?: number };
  relative_humidity?: { low?: number; high?: number };
  wind?: { direction?: string; speed?: { low?: number; high?: number } };
}

interface ForecastPayload {
  forecast_24h?: {
    items?: Array<{
      valid_period?: { start?: string; end?: string };
      general?: {
        forecast?: string;
        relative_humidity?: { low?: number; high?: number };
        temperature?: { low?: number; high?: number };
        wind?: { direction?: string; speed?: { low?: number; high?: number } };
      };
      periods?: Forecast24hPeriod[];
    }>;
    general?: {
      forecast?: string;
      relative_humidity?: { low?: number; high?: number };
      temperature?: { low?: number; high?: number };
      wind?: { direction?: string; speed?: { low?: number; high?: number } };
    };
    periods?: Forecast24hPeriod[];
  };
  forecast_4day?: {
    items?: Array<{
      forecasts?: Forecast4DayItem[];
    }>;
    forecasts?: Forecast4DayItem[];
  };
  items?: any[];
}

interface AseanCountryClimate {
  country_code?: string;
  code?: string;
  country?: string;
  name?: string;
  capital?: string;
  average_temperature?: unknown;
  annual_rainfall?: unknown;
  monsoon_seasons?: unknown;
  natural_hazards?: unknown;
}

interface ToolResult<T> {
  ok: boolean;
  status: number;
  reason?: string;
  data?: T;
}

interface McpFailure {
  tool: string;
  section: string;
  status: number;
  reason: string;
}

interface BusResponse {
  ok: boolean;
  failures: McpFailure[];
  get_sg_psi: ToolResult<PsiData>;
  get_sg_weather_now: ToolResult<WeatherNowData>;
  get_sg_forecast_24h: ToolResult<ForecastPayload['forecast_24h'] & { items?: any[] }>;
  get_sg_forecast_4day: ToolResult<ForecastPayload['forecast_4day']>;
  get_asean_climate: ToolResult<unknown>;
}

interface HealthStatus {
  answered: boolean;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  checkedAt: string;
  server?: string;
  tools: string[];
  reason?: string;
}

const REGIONS = ['central', 'north', 'south', 'east', 'west'] as const;
type SgRegion = (typeof REGIONS)[number];

// Used only to map a postal code / GPS position to the nearest PSI region when the
// MCP PSI response does not include region_metadata coordinates.
const REGION_COORDS: Record<SgRegion, { lat: number; lon: number }> = {
  central: { lat: 1.35735, lon: 103.82 },
  east: { lat: 1.35735, lon: 103.94 },
  north: { lat: 1.41803, lon: 103.82 },
  south: { lat: 1.29587, lon: 103.82 },
  west: { lat: 1.35735, lon: 103.7 },
};

function findNearestRegion(
  lat: number,
  lon: number,
  coords: Record<SgRegion, { lat: number; lon: number }>
): SgRegion {
  let closest: SgRegion = 'central';
  let minDistance = Infinity;
  for (const r of REGIONS) {
    const c = coords[r];
    const dist = Math.hypot(lat - c.lat, lon - c.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = r;
    }
  }
  return closest;
}

function formatDayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const weekday = utcDate.toLocaleDateString('en-SG', {
        weekday: 'short',
        timeZone: 'UTC',
      });
      const dd = String(day).padStart(2, '0');
      const mm = String(month).padStart(2, '0');
      return `${weekday} (${dd}/${mm})`;
    }
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const weekday = d.toLocaleDateString('en-SG', {
    weekday: 'short',
    timeZone: 'Asia/Singapore',
  });
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${weekday} (${dd}/${mm})`;
}

function getForecastIcon(forecast?: string) {
  const f = (forecast || '').toLowerCase();
  if (f.includes('thunder') || f.includes('lightning')) {
    return <CloudLightning className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" aria-hidden="true" />;
  }
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) {
    return <CloudRain className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" aria-hidden="true" />;
  }
  if (f.includes('partly cloudy')) {
    return <CloudSun className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" aria-hidden="true" />;
  }
  if (f.includes('cloud') || f.includes('overcast') || f.includes('hazy')) {
    return <Cloud className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" aria-hidden="true" />;
  }
  return <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />;
}

function getHeroWeatherIcon(forecast?: string) {
  const f = (forecast || '').toLowerCase();
  if (f.includes('thunder') || f.includes('lightning')) {
    return <CloudLightning className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />;
  }
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) {
    return <CloudRain className="w-5 h-5 text-sky-500 shrink-0" aria-hidden="true" />;
  }
  if (f.includes('partly cloudy')) {
    return <CloudSun className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />;
  }
  if (f.includes('cloud') || f.includes('overcast') || f.includes('hazy')) {
    return <Cloud className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />;
  }
  return <Sun className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />;
}

interface PsiSelectedCardTheme {
  rangeLabel: string;
  skyDescriptor: string;
  actionStatus: string;
  cardGradientClass: string;
  pillClass: string;
  bottomBoxClass: string;
  showParticles: boolean;
  particleOpacityClass: string;
}

const HAZE_PARTICLES: Array<{ left: string; top: string; size: string }> = [
  { left: '8%', top: '12%', size: 'w-1.5 h-1.5' },
  { left: '16%', top: '24%', size: 'w-1 h-1' },
  { left: '28%', top: '14%', size: 'w-1.5 h-1.5' },
  { left: '42%', top: '19%', size: 'w-1 h-1' },
  { left: '54%', top: '11%', size: 'w-1.5 h-1.5' },
  { left: '68%', top: '22%', size: 'w-1 h-1' },
  { left: '82%', top: '15%', size: 'w-1.5 h-1.5' },
  { left: '92%', top: '28%', size: 'w-1 h-1' },
  { left: '11%', top: '38%', size: 'w-1 h-1' },
  { left: '23%', top: '44%', size: 'w-1.5 h-1.5' },
  { left: '34%', top: '35%', size: 'w-1 h-1' },
  { left: '49%', top: '42%', size: 'w-1.5 h-1.5' },
  { left: '63%', top: '36%', size: 'w-1 h-1' },
  { left: '77%', top: '46%', size: 'w-1.5 h-1.5' },
  { left: '89%', top: '39%', size: 'w-1 h-1' },
  { left: '9%', top: '58%', size: 'w-1.5 h-1.5' },
  { left: '21%', top: '65%', size: 'w-1 h-1' },
  { left: '37%', top: '59%', size: 'w-1.5 h-1.5' },
  { left: '52%', top: '64%', size: 'w-1 h-1' },
  { left: '66%', top: '57%', size: 'w-1.5 h-1.5' },
  { left: '79%', top: '66%', size: 'w-1 h-1' },
  { left: '91%', top: '60%', size: 'w-1.5 h-1.5' },
  { left: '14%', top: '82%', size: 'w-1 h-1' },
  { left: '31%', top: '88%', size: 'w-1.5 h-1.5' },
  { left: '57%', top: '85%', size: 'w-1 h-1' },
  { left: '74%', top: '91%', size: 'w-1.5 h-1.5' },
  { left: '88%', top: '84%', size: 'w-1 h-1' },
];

function getPsiSelectedCardTheme(psi: number | undefined): PsiSelectedCardTheme {
  if (psi === undefined || Number.isNaN(psi)) {
    return {
      rangeLabel: 'No data',
      skyDescriptor: '',
      actionStatus: '',
      cardGradientClass: 'bg-gradient-to-br from-slate-500 to-slate-600',
      pillClass: 'bg-white/15 border-white/30 text-white',
      bottomBoxClass: '',
      showParticles: false,
      particleOpacityClass: 'opacity-0',
    };
  }
  const val = psi;
  if (val <= 50) {
    return {
      rangeLabel: 'Good',
      skyDescriptor: 'Clear Sky',
      actionStatus: 'Optimal',
      cardGradientClass: 'bg-gradient-to-br from-[#3B93E6] via-[#34B3D1] to-[#2BCBBA]',
      pillClass: 'bg-white/20 border-white/35 text-white',
      bottomBoxClass: 'bg-[#1D6F7A]/65 border-white/15',
      showParticles: false,
      particleOpacityClass: 'opacity-0',
    };
  }
  if (val <= 100) {
    return {
      rangeLabel: 'Moderate',
      skyDescriptor: 'Hazy Sun',
      actionStatus: 'Acceptable',
      cardGradientClass: 'bg-gradient-to-br from-[#6C9EAB] via-[#8DAE73] to-[#C2D548]',
      pillClass: 'bg-white/20 border-white/35 text-white',
      bottomBoxClass: 'bg-[#5E6D3B]/65 border-white/15',
      showParticles: true,
      particleOpacityClass: 'opacity-20',
    };
  }
  if (val <= 200) {
    return {
      rangeLabel: 'Unhealthy',
      skyDescriptor: 'Dusty Haze',
      actionStatus: 'Warning',
      cardGradientClass: 'bg-gradient-to-br from-[#E27B18] via-[#E99A15] to-[#F1B711]',
      pillClass: 'bg-white/15 border-white/35 text-white',
      bottomBoxClass: 'bg-[#8F5B0A]/65 border-white/15',
      showParticles: true,
      particleOpacityClass: 'opacity-30',
    };
  }
  if (val <= 300) {
    return {
      rangeLabel: 'Very Unhealthy',
      skyDescriptor: 'Thick Smog',
      actionStatus: 'Alert',
      cardGradientClass: 'bg-gradient-to-br from-[#C84A09] via-[#D94D1A] to-[#EA512D]',
      pillClass: 'bg-white/15 border-white/35 text-white',
      bottomBoxClass: 'bg-[#7A260D]/70 border-white/15',
      showParticles: true,
      particleOpacityClass: 'opacity-35',
    };
  }
  return {
    rangeLabel: 'Hazardous',
    skyDescriptor: 'Severe Smog',
    actionStatus: 'Emergency',
    cardGradientClass: 'bg-gradient-to-br from-[#751E19] via-[#4D2A2C] to-[#2A333E]',
    pillClass: 'bg-[#6E221F]/80 border-white/25 text-white',
    bottomBoxClass: 'bg-[#1F242D]/80 border-white/15',
    showParticles: true,
    particleOpacityClass: 'opacity-40',
  };
}

function getPsiDescriptor(psi: number | undefined): { label: string; colorClass: string } {
  if (psi === undefined || Number.isNaN(psi)) {
    return { label: 'N/A', colorClass: 'text-slate-500' };
  }
  if (psi <= 50) return { label: 'Good', colorClass: 'text-emerald-700' };
  if (psi <= 100) return { label: 'Moderate', colorClass: 'text-sky-700' };
  if (psi <= 200) return { label: 'Unhealthy', colorClass: 'text-amber-700' };
  if (psi <= 300) return { label: 'Very Unhealthy', colorClass: 'text-orange-700' };
  return { label: 'Hazardous', colorClass: 'text-rose-700' };
}

function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  const fmt = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-SG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Singapore',
    });
  };
  const s = fmt(start);
  const e = fmt(end);
  return s && e ? `${s} – ${e} SGT` : s || e;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function formatRange(range?: { low?: number; high?: number }): string | undefined {
  const low = firstNumber(range?.low);
  const high = firstNumber(range?.high);
  if (low !== undefined && high !== undefined) return low === high ? `${low}` : `${low}–${high}`;
  if (low !== undefined) return `${low}`;
  if (high !== undefined) return `${high}`;
  return undefined;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${displayValue(v)}`)
      .join(' · ');
  }
  return String(value);
}

function McpError({ tool, result }: { tool: string; result?: { status?: number; reason?: string } }) {
  return (
    <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
      <div className="flex items-center gap-1.5 font-semibold">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>MCP call {tool} failed</span>
      </div>
      <div className="mt-1 font-mono break-words">
        HTTP {result?.status ?? '—'} · {result?.reason || 'No response from /api/bus'}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'Singapore' | 'ASEAN'>('Singapore');
  const [data, setData] = useState<BusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  // Postal code & geolocation states
  const [postalInput, setPostalInput] = useState<string>('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SgRegion>(() => {
    try {
      const saved = localStorage.getItem('sg_weather_selected_region');
      if (saved && REGIONS.includes(saved as SgRegion)) {
        return saved as SgRegion;
      }
    } catch {
      // Ignore storage access errors
    }
    return 'central';
  });
  const [locating, setLocating] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [weatherNowOpen, setWeatherNowOpen] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);

  async function checkMcpHealth() {
    setCheckingHealth(true);
    const t0 = performance.now();
    const checkedAt = () =>
      new Date().toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Singapore',
      });
    try {
      const res = await fetch('/api/health');
      const elapsed = Math.round(performance.now() - t0);
      const json = await res.json().catch(() => null);
      setHealthStatus({
        answered: Boolean(json?.answered),
        ok: res.ok && Boolean(json?.ok),
        status: typeof json?.status === 'number' ? json.status : res.status,
        latencyMs: typeof json?.latencyMs === 'number' ? json.latencyMs : elapsed,
        checkedAt: checkedAt(),
        server: json?.server,
        tools: Array.isArray(json?.tools) ? json.tools : [],
        reason: json?.reason || `/api/health returned HTTP ${res.status}`,
      });
    } catch {
      setHealthStatus({
        answered: false,
        ok: false,
        status: null,
        latencyMs: Math.round(performance.now() - t0),
        checkedAt: checkedAt(),
        tools: [],
        reason: 'Could not reach /api/health',
      });
    } finally {
      setCheckingHealth(false);
    }
  }

  useEffect(() => {
    checkMcpHealth();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sg_weather_selected_region', selectedRegion);
    } catch {
      // Ignore storage access errors
    }
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setLoading(true);
        // /api/bus returns non-2xx when any MCP call failed, but the body still
        // describes every section, so read it regardless of status.
        const res = await fetch('/api/bus');
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (json && Array.isArray(json.failures)) {
          setData(json as BusResponse);
          setErrorReason(null);
        } else {
          setErrorReason(
            `/api/bus returned HTTP ${res.status}${json?.reason ? ` · ${json.reason}` : ''}`
          );
        }
      } catch {
        if (!cancelled) setErrorReason('Unable to reach /api/bus');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize get_sg_psi
  const psiResult = data?.get_sg_psi;
  const psiRaw = psiResult?.data;
  const psiItem = psiRaw?.items?.[0] || psiRaw;
  const psiReadings = psiItem?.readings;
  const psiRegionsRaw = psiRaw?.regions;
  const regionReading = (r: SgRegion, ...keys: string[]): number | undefined => {
    const entry = psiRegionsRaw?.[r];
    if (typeof entry === 'number') return keys.includes('psi_twenty_four_hourly') ? entry : undefined;
    return firstNumber(...keys.map((k) => entry?.[k]));
  };
  const readingsFor = (
    field: keyof NonNullable<PsiData['readings']>,
    ...altKeys: string[]
  ): PsiRegionValues => {
    const fromReadings = psiReadings?.[field];
    if (fromReadings) return fromReadings;
    const out: PsiRegionValues = {};
    for (const r of REGIONS) out[r] = regionReading(r, field, ...altKeys);
    return out;
  };
  const psi24h = readingsFor('psi_twenty_four_hourly', 'psi_24h', 'psi', 'value');
  const pm25_24h = readingsFor('pm25_twenty_four_hourly', 'pm25_24h', 'pm25');
  const pm10_24h = readingsFor('pm10_twenty_four_hourly', 'pm10_24h', 'pm10');
  const o3Sub = readingsFor('o3_sub_index', 'o3');
  const coSub = readingsFor('co_sub_index', 'co');
  const so2Sub = readingsFor('so2_sub_index', 'so2');
  const psiTimestamp = psiItem?.timestamp || psiItem?.update_timestamp;

  // Region centroids from MCP region_metadata when present
  const regionCoords: Record<SgRegion, { lat: number; lon: number }> = { ...REGION_COORDS };
  for (const m of psiRaw?.region_metadata || []) {
    const name = m.name as SgRegion;
    const lat = m.label_location?.latitude;
    const lon = m.label_location?.longitude;
    if (REGIONS.includes(name) && typeof lat === 'number' && typeof lon === 'number') {
      regionCoords[name] = { lat, lon };
    }
  }

  async function lookupSixDigitPostal(
    code: string
  ): Promise<{ found: true; address: string; region: SgRegion } | { found: false; error?: string }> {
    try {
      const res = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
          code
        )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
      );
      if (!res.ok) {
        return { found: false, error: `postal code lookup failed (HTTP ${res.status})` };
      }
      const json = await res.json();
      const match = json?.results?.find((r: any) => r.POSTAL === code);
      const lat = parseFloat(match?.LATITUDE);
      const lon = parseFloat(match?.LONGITUDE);
      if (!match?.ADDRESS || Number.isNaN(lat) || Number.isNaN(lon)) {
        return { found: false };
      }
      return { found: true, address: match.ADDRESS, region: findNearestRegion(lat, lon, regionCoords) };
    } catch {
      return { found: false, error: 'postal code lookup service unreachable' };
    }
  }

  async function resolveNearestPostalFromCoords(
    lat: number,
    lon: number
  ): Promise<{ postal: string; address: string; region: SgRegion } | null> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      if (!res.ok) return null;
      const json = await res.json();
      const postcode = json?.address?.postcode;
      if (!postcode || !/^\d{6}$/.test(postcode)) return null;
      const oneMapRes = await lookupSixDigitPostal(postcode);
      return {
        postal: postcode,
        address: oneMapRes.found
          ? oneMapRes.address
          : (json.display_name || `SINGAPORE ${postcode}`).toUpperCase(),
        region: oneMapRes.found ? oneMapRes.region : findNearestRegion(lat, lon, regionCoords),
      };
    } catch {
      return null;
    }
  }

  async function defaultToNearestPostal(withUnrecognisedNotice: boolean) {
    setFallbackNotice(
      withUnrecognisedNotice ? 'unrecognised postal code, defaulted to postal code nearest to you' : null
    );
    setLocating(true);

    const applyCoords = async (lat: number, lon: number) => {
      setUserCoords({ lat, lon });
      const resolved = await resolveNearestPostalFromCoords(lat, lon);
      if (resolved) {
        setPostalInput(resolved.postal);
        setResolvedAddress(resolved.address);
        setSelectedRegion(resolved.region);
      } else {
        setResolvedAddress(null);
        setFallbackNotice('could not find a postal code for your location');
      }
      setLocating(false);
    };

    const locationUnavailable = () => {
      setResolvedAddress(null);
      setFallbackNotice(
        withUnrecognisedNotice
          ? 'unrecognised postal code, and your location is unavailable'
          : 'location unavailable — enter a 6-digit postal code'
      );
      setLocating(false);
    };

    if (userCoords) {
      await applyCoords(userCoords.lat, userCoords.lon);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await applyCoords(pos.coords.latitude, pos.coords.longitude);
        },
        locationUnavailable,
        { timeout: 6000, maximumAge: 60000 }
      );
    } else {
      locationUnavailable();
    }
  }

  async function handlePostalSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = postalInput.trim();
    if (!trimmed) return;

    if (/^\d{6}$/.test(trimmed)) {
      const res = await lookupSixDigitPostal(trimmed);
      if (res.found) {
        setFallbackNotice(null);
        setResolvedAddress(res.address);
        setSelectedRegion(res.region);
        return;
      }
      if (res.error) {
        setResolvedAddress(null);
        setFallbackNotice(res.error);
        return;
      }
    }

    // Any other unrecognised format or invalid 6-digit code fails gracefully
    await defaultToNearestPostal(true);
  }

  // Normalize get_sg_weather_now
  const nowResult = data?.get_sg_weather_now;
  const nowRaw = nowResult?.data;
  const nowItem = nowRaw?.items?.[0] || nowRaw;
  const areaForecasts: WeatherNowArea[] = nowItem?.forecasts || [];
  const nowPeriod = formatTimeRange(nowItem?.valid_period?.start, nowItem?.valid_period?.end);

  // Normalize get_sg_forecast (24h)
  const forecast24Result = data?.get_sg_forecast_24h;
  const forecast24Raw: any = forecast24Result?.data;
  const forecast24hItem = forecast24Raw?.items?.[0] || forecast24Raw;
  const general24h = forecast24hItem?.general || forecast24hItem;
  const current24h = forecast24hItem?.current || forecast24Raw?.current;

  // Current readings: only values the MCP server returns. If it has no current
  // reading, show the MCP 24-hour range instead of inventing a number.
  const currentTemp = firstNumber(current24h?.temperature, general24h?.temperature);
  const tempLow = firstNumber(general24h?.temperature?.low);
  const tempHigh = firstNumber(general24h?.temperature?.high);
  const tempRange = formatRange(general24h?.temperature);
  const humidityText =
    firstNumber(current24h?.humidity, current24h?.relative_humidity, general24h?.relative_humidity)?.toString() ??
    formatRange(general24h?.relative_humidity ?? general24h?.humidity);
  const windText =
    firstNumber(current24h?.wind_speed, general24h?.wind?.speed)?.toString() ??
    formatRange(general24h?.wind?.speed);
  const forecastText: string | undefined =
    typeof general24h?.forecast === 'string'
      ? general24h.forecast
      : general24h?.forecast?.text || general24h?.forecast?.summary;

  // Normalize get_sg_forecast (4day)
  const forecast4Result = data?.get_sg_forecast_4day;
  const forecast4Raw: any = forecast4Result?.data;
  const forecast4dItem = forecast4Raw?.items?.[0] || forecast4Raw;
  const days4d: Forecast4DayItem[] = Array.isArray(forecast4dItem?.forecasts)
    ? forecast4dItem.forecasts
    : Array.isArray(forecast4Raw)
      ? forecast4Raw
      : [];

  // Normalize get_asean_climate
  const aseanResult = data?.get_asean_climate;
  const rawAsean: any = aseanResult?.data;
  const aseanCountries: AseanCountryClimate[] = Array.isArray(rawAsean)
    ? rawAsean
    : Array.isArray(rawAsean?.countries)
      ? rawAsean.countries
      : rawAsean && typeof rawAsean === 'object'
        ? Object.values(rawAsean).filter((v): v is AseanCountryClimate => Boolean(v) && typeof v === 'object')
        : [];

  const mcpDown = (data && !data.ok) || (healthStatus && !healthStatus.ok);
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 border-x border-slate-200 flex flex-col">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="px-4 h-12 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight text-slate-900 whitespace-nowrap">
              SG &amp; ASEAN Weather
            </span>
            <nav className="flex items-center gap-1" role="tablist" aria-label="Main Tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'Singapore'}
                onClick={() => setActiveTab('Singapore')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'Singapore'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Singapore
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ASEAN'}
                onClick={() => setActiveTab('ASEAN')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'ASEAN'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ASEAN
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-4 py-4">
          {loading && (
            <div className="py-12 text-xs text-slate-500 font-mono">
              Loading telemetry...
            </div>
          )}

          {!loading && errorReason && (
            <div className="p-3 border border-rose-200 bg-white text-xs text-rose-700 font-mono">
              {errorReason}
            </div>
          )}

          {!loading && mcpDown && (
            <div role="alert" className="mb-4 p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs text-rose-800">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>MCP server vdineshk/sg-weather-data-mcp is failing</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 font-mono break-words">
                {data?.failures.map((f) => (
                  <li key={f.section}>
                    {f.section} · HTTP {f.status} · {f.reason}
                  </li>
                ))}
                {healthStatus && !healthStatus.ok && (
                  <li>
                    /api/health · HTTP {healthStatus.status ?? '—'} · {healthStatus.reason}
                  </li>
                )}
              </ul>
            </div>
          )}

          {!loading && !errorReason && activeTab === 'Singapore' && (
            <div className="space-y-5">
              {/* Top Postal Code Search & One-Tap Browser Geolocation */}
              <div>
                <form onSubmit={handlePostalSubmit} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={postalInput}
                      onChange={(e) => setPostalInput(e.target.value)}
                      placeholder="check PSI at your postal code"
                      aria-label="check PSI at your postal code"
                      className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => defaultToNearestPostal(false)}
                    disabled={locating}
                    aria-label="Use current location"
                    title="Use current location"
                    className="h-11 w-11 shrink-0 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
                  >
                    <Compass className={`w-5 h-5 ${locating ? 'animate-spin' : ''}`} />
                  </button>
                </form>

                {fallbackNotice && (
                  <p className="mt-2 text-xs text-amber-700 px-1">
                    {fallbackNotice}
                  </p>
                )}

                {resolvedAddress && (
                  <div className="mt-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">{resolvedAddress}</span>
                    {selectedRegion && (
                      <span className="font-mono text-slate-500 capitalize shrink-0">
                        {selectedRegion} · PSI {psi24h[selectedRegion] ?? '—'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Section 1: get_sg_psi */}
              <section aria-labelledby="heading-psi" className="bg-white border border-slate-200 p-4 rounded-xl">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-200">
                  <h2 id="heading-psi" className="text-sm font-semibold text-slate-900">
                    PSI
                  </h2>
                  {psiResult?.ok && psiTimestamp && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Last updated {formatTimeRange(psiTimestamp)}
                    </span>
                  )}
                </div>

                {!psiResult?.ok ? (
                  <div className="pt-3">
                    <McpError tool="get_sg_psi" result={psiResult} />
                  </div>
                ) : (
                <>
                <div className="pt-3 space-y-2.5">
                  {(() => {
                    const activeVal = psi24h[selectedRegion];
                    const theme = getPsiSelectedCardTheme(activeVal);
                    const unselectedRegions = REGIONS.filter((r) => r !== selectedRegion);

                    return (
                      <>
                        {/* Main large rectangle for the selected region styled according to the 5 PSI ranges */}
                        <div
                          className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-sm transition-colors duration-300 ${theme.cardGradientClass}`}
                        >
                          {/* Atmospheric haze particles for Moderate, Unhealthy, Very Unhealthy, and Hazardous ranges */}
                          {theme.showParticles && (
                            <div
                              className={`pointer-events-none absolute inset-0 ${theme.particleOpacityClass}`}
                              aria-hidden="true"
                            >
                              {HAZE_PARTICLES.map((pt, i) => (
                                <span
                                  key={i}
                                  style={{ left: pt.left, top: pt.top }}
                                  className={`absolute rounded-full bg-white ${pt.size}`}
                                />
                              ))}
                            </div>
                          )}

                          {/* Top header row: Singapore <Region> */}
                          <div className="relative z-10 flex items-start justify-between gap-3">
                            <div className="text-lg font-semibold tracking-tight leading-snug capitalize">
                              Singapore {selectedRegion}
                            </div>
                          </div>

                          {/* Center PSI Number & Range Label below it */}
                          <div className="relative z-10 my-6 flex flex-col items-center text-center">
                            <div className="text-5xl font-bold tracking-tight leading-none tabular-nums drop-shadow-xs">
                              {activeVal ?? '—'}
                            </div>
                            <span
                              className={`mt-3 px-3.5 py-1 rounded-full border text-xs font-semibold tracking-wide backdrop-blur-xs ${theme.pillClass}`}
                            >
                              {theme.rangeLabel}
                            </span>
                          </div>
                        </div>

                        {/* 4 smaller rectangles below for the unselected regions */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {unselectedRegions.map((region) => {
                            const val = psi24h[region];
                            const status = getPsiDescriptor(val);
                            return (
                              <button
                                key={region}
                                type="button"
                                onClick={() => setSelectedRegion(region)}
                                className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/50 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                              >
                                <div className="text-xs text-slate-500 capitalize">{region}</div>
                                <div className="mt-0.5 text-xl font-semibold font-mono text-slate-900">
                                  {val ?? '—'}
                                </div>
                                <div className={`text-[11px] font-medium ${status.colorClass}`}>
                                  {status.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1.5 pr-2 font-medium">PSI Sub-Index</th>
                        {REGIONS.map((r) => (
                          <th key={r} className="py-1.5 px-1 font-medium capitalize text-right">
                            {r}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      <tr>
                        <td className="py-1.5 pr-2 font-sans text-slate-600">24h PSI</td>
                        {REGIONS.map((r) => (
                          <td key={r} className="py-1.5 px-1 text-right">{psi24h[r] ?? '—'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 font-sans text-slate-600">24h PM2.5 (µg/m³)</td>
                        {REGIONS.map((r) => (
                          <td key={r} className="py-1.5 px-1 text-right">{pm25_24h[r] ?? '—'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 font-sans text-slate-600">24h PM10 (µg/m³)</td>
                        {REGIONS.map((r) => (
                          <td key={r} className="py-1.5 px-1 text-right">{pm10_24h[r] ?? '—'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 font-sans text-slate-600">O₃ Sub-Index</td>
                        {REGIONS.map((r) => (
                          <td key={r} className="py-1.5 px-1 text-right">{o3Sub[r] ?? '—'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 font-sans text-slate-600">CO Sub-Index</td>
                        {REGIONS.map((r) => (
                          <td key={r} className="py-1.5 px-1 text-right">{coSub[r] ?? '—'}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 font-sans text-slate-600">SO₂ Sub-Index</td>
                        {REGIONS.map((r) => (
                          <td key={r} className="py-1.5 px-1 text-right">{so2Sub[r] ?? '—'}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </section>

              {/* Section 2: Weather forecast for Singapore */}
              <section aria-labelledby="heading-forecast" className="bg-white border border-slate-200 p-5 rounded-2xl">
                <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
                  <h2 id="heading-forecast" className="text-sm font-semibold text-slate-900">
                    Weather forecast for Singapore
                  </h2>
                  {forecast24Result?.ok && forecast24hItem?.valid_period && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Last updated{' '}
                      {formatTimeRange(
                        forecast24hItem.valid_period.start,
                        forecast24hItem.valid_period.end
                      )}
                    </span>
                  )}
                </div>

                {!forecast24Result?.ok ? (
                  <div className="pt-4">
                    <McpError tool="get_sg_forecast (24h)" result={forecast24Result} />
                  </div>
                ) : (
                  <div className="pt-4">
                    <div className="text-2xl font-bold tracking-tight text-slate-900">
                      Singapore
                    </div>

                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div
                        className={`${
                          currentTemp !== undefined ? 'text-5xl' : 'text-4xl'
                        } font-bold tracking-tight text-slate-900 leading-none tabular-nums`}
                      >
                        {currentTemp ?? tempRange ?? '—'}°C
                      </div>

                      <div className="text-right">
                        {forecastText && (
                          <div className="flex items-center justify-end gap-1.5">
                            {getHeroWeatherIcon(forecastText)}
                            <span className="text-sm font-semibold text-slate-800">
                              {forecastText.replace(/\s*\([^)]*\)/g, '')}
                            </span>
                          </div>
                        )}
                        {currentTemp !== undefined && (
                          <div className="mt-1 font-mono text-xs whitespace-nowrap">
                            <span className="text-[11px] font-sans font-medium text-slate-400 mr-1.5">
                              Low / High
                            </span>
                            <span className="text-slate-400">{tempLow ?? '—'}°</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="font-semibold text-slate-900">{tempHigh ?? '—'}°</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                      <div className="bg-slate-50/70 rounded-2xl p-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-hidden="true" />
                          <span>Humidity</span>
                        </div>
                        <div className="mt-1.5 text-lg font-mono font-bold text-slate-900">
                          {humidityText ? `${humidityText}%` : '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50/70 rounded-2xl p-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Wind className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                          <span>Wind Speed</span>
                        </div>
                        <div className="mt-1.5 text-lg font-mono font-bold text-slate-900">
                          {windText ? `${windText} km/h` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-900">4-Day Forecast</h3>
                    {forecast4Result?.ok && (
                      <span className="text-[11px] font-medium text-slate-400">Low / High</span>
                    )}
                  </div>
                  {!forecast4Result?.ok ? (
                    <McpError tool="get_sg_forecast (4day)" result={forecast4Result} />
                  ) : days4d.length === 0 ? (
                    <p className="text-xs text-slate-500">MCP returned no 4-day forecast.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {days4d.map((day, idx) => (
                        <div key={idx} className="py-3 flex items-start justify-between gap-2">
                          <div className="w-24 shrink-0 font-medium text-slate-700 pt-0.5">
                            {formatDayDate(day.date)}
                          </div>
                          <div className="flex-1 min-w-0 flex items-start gap-2">
                            {getForecastIcon(day.forecast)}
                            <div className="min-w-0">
                              <div className="text-slate-600 leading-snug">{day.forecast}</div>
                              <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                                RH {day.relative_humidity?.low}–{day.relative_humidity?.high}% ·{' '}
                                {day.wind?.direction} {day.wind?.speed?.low}–{day.wind?.speed?.high} km/h
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 font-mono text-xs pt-0.5 whitespace-nowrap text-right">
                            <span className="text-slate-400">{day.temperature?.low}°</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="font-semibold text-slate-900">{day.temperature?.high}°</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Section 3: Weather now (2 hourly) by area (Accordion collapsed by default) */}
              <section aria-labelledby="heading-now" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWeatherNowOpen((prev) => !prev)}
                  aria-expanded={weatherNowOpen}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <h2 id="heading-now" className="text-sm font-semibold text-slate-900">
                      Weather now (2 hourly) by area
                    </h2>
                    {nowResult?.ok && nowPeriod && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Last updated {nowPeriod}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                      weatherNowOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* A failed MCP call is shown even while the accordion is collapsed */}
                {!nowResult?.ok && (
                  <div className="px-4 pb-4">
                    <McpError tool="get_sg_weather_now" result={nowResult} />
                  </div>
                )}

                {nowResult?.ok && weatherNowOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-200 divide-y divide-slate-100 text-xs">
                    {areaForecasts.length === 0 && (
                      <p className="py-2 text-slate-500">MCP returned no area forecasts.</p>
                    )}
                    {areaForecasts.map((item, idx) => {
                      const areaName = item.area || item.name || `Area ${idx + 1}`;
                      return (
                        <div
                          key={`${areaName}-${idx}`}
                          className="flex items-baseline justify-between py-2 gap-2"
                        >
                          <span className="font-medium text-slate-800">{areaName}</span>
                          <span className="text-slate-600 text-right shrink-0">{item.forecast}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Section 4: Smithery MCP Service Status below Weather now */}
              <section
                aria-labelledby="heading-mcp-status"
                className="bg-white border border-slate-200 p-5 rounded-2xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
                    <h2 id="heading-mcp-status" className="text-sm font-semibold text-slate-900">
                      Smithery MCP Service
                    </h2>
                  </div>
                  {!healthStatus ? (
                    <div className="text-xs font-medium text-slate-500 shrink-0">Checking…</div>
                  ) : healthStatus.ok ? (
                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reachable</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-medium text-rose-600 shrink-0">
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{healthStatus.answered ? 'Error' : 'Unreachable'}</span>
                    </div>
                  )}
                </div>

                {healthStatus?.server && (
                  <div className="mt-1 font-mono text-xs text-slate-500 break-all">
                    {healthStatus.server}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/70 rounded-2xl p-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>Latency</span>
                    </div>
                    <div className="mt-1.5 text-lg font-mono font-bold text-slate-900">
                      {healthStatus ? `${healthStatus.latencyMs} ms` : '— ms'}
                    </div>
                  </div>

                  <div className="bg-slate-50/70 rounded-2xl p-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>HTTP / Auth</span>
                    </div>
                    <div className="mt-1.5 text-sm leading-snug">
                      <span className="font-mono font-bold text-slate-900">
                        HTTP {healthStatus?.status ?? '—'}
                      </span>
                      {healthStatus && (
                        <>
                          <span className="text-slate-400 mx-1">·</span>
                          <span className="text-xs text-slate-600">
                            {healthStatus.ok
                              ? 'Authenticated'
                              : healthStatus.status === 401 || healthStatus.status === 403
                                ? 'Unauthorized'
                                : 'Failed'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-xs">
                  {healthStatus && (
                    <p
                      className={`leading-relaxed break-words ${
                        healthStatus.ok ? 'text-slate-600' : 'text-rose-700 font-mono'
                      }`}
                    >
                      {healthStatus.reason}
                    </p>
                  )}

                  {healthStatus?.ok && (
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span>Available MCP Weather Tools</span>
                      </div>
                      <div className="font-mono text-slate-700 leading-relaxed">
                        {healthStatus.tools.length > 0 ? healthStatus.tools.join(' · ') : 'none listed'}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Endpoint: /api/health</span>
                    <span className="font-mono">
                      Checked {healthStatus?.checkedAt || '—'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={checkMcpHealth}
                    disabled={checkingHealth}
                    className="mt-1 w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>Check MCP Server Status</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {!loading && !errorReason && activeTab === 'ASEAN' && (
            <section aria-labelledby="heading-asean" className="bg-white border border-slate-200 p-4 rounded-xl">
              <div className="pb-3 border-b border-slate-200">
                <h2 id="heading-asean" className="text-sm font-semibold text-slate-900">
                  ASEAN Member States Climate Information
                </h2>
              </div>

              {!aseanResult?.ok ? (
                <div className="pt-3">
                  <McpError tool="get_asean_climate" result={aseanResult} />
                </div>
              ) : aseanCountries.length === 0 ? (
                <p className="pt-3 text-xs text-slate-500">MCP returned no ASEAN countries.</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {aseanCountries.map((c, idx) => {
                    const name = c.country || c.name;
                    const code = c.country_code || c.code;
                    return (
                      <div key={code || name || `asean-${idx}`} className="py-3.5 space-y-2 text-xs">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {name ?? '—'}{' '}
                            {code && <span className="font-mono text-xs text-slate-500">({code})</span>}
                          </div>
                          {c.capital && (
                            <div className="text-slate-500 mt-0.5">Capital: {c.capital}</div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <span className="text-slate-500 block">Average Temperatures</span>
                            <span className="font-mono text-slate-900">{displayValue(c.average_temperature)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Annual Rainfall</span>
                            <span className="font-mono text-slate-900">{displayValue(c.annual_rainfall)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Monsoon Seasons</span>
                            <span className="text-slate-800">{displayValue(c.monsoon_seasons)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Natural Hazards</span>
                            <span className="text-slate-800">{displayValue(c.natural_hazards)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
