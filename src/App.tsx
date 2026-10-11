import { useEffect, useState } from 'react';

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
  country_code: string;
  country: string;
  capital?: string;
  average_temperature: string;
  annual_rainfall: string;
  monsoon_seasons: string;
  natural_hazards: string;
}

interface BusResponse {
  get_sg_psi?: PsiData;
  get_sg_weather_now?: WeatherNowData;
  get_sg_forecast?: ForecastPayload;
  get_asean_climate?: {
    countries?: AseanCountryClimate[];
  } | AseanCountryClimate[];
  status?: number;
  reason?: string;
}

const REGIONS = ['national', 'central', 'north', 'south', 'east', 'west'] as const;

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'Singapore' | 'ASEAN'>('Singapore');
  const [data, setData] = useState<BusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/bus');
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          if (!cancelled) {
            setErrorReason(errJson.reason || `HTTP ${res.status}`);
            setLoading(false);
          }
          return;
        }
        const json: BusResponse = await res.json();
        if (!cancelled) {
          setData(json);
          setErrorReason(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setErrorReason('Unable to reach weather data endpoint.');
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize get_sg_psi
  const psiItem = data?.get_sg_psi?.items?.[0] || data?.get_sg_psi;
  const psiReadings = psiItem?.readings;
  const psi24h = psiReadings?.psi_twenty_four_hourly || {};
  const pm25_24h = psiReadings?.pm25_twenty_four_hourly || {};
  const pm10_24h = psiReadings?.pm10_twenty_four_hourly || {};
  const o3Sub = psiReadings?.o3_sub_index || {};
  const coSub = psiReadings?.co_sub_index || {};
  const so2Sub = psiReadings?.so2_sub_index || {};

  // Normalize get_sg_weather_now
  const nowItem = data?.get_sg_weather_now?.items?.[0] || data?.get_sg_weather_now;
  const areaForecasts: WeatherNowArea[] = nowItem?.forecasts || [];
  const nowPeriod = formatTimeRange(nowItem?.valid_period?.start, nowItem?.valid_period?.end);

  // Normalize get_sg_forecast
  const rawForecast = data?.get_sg_forecast;
  const forecast24hItem =
    rawForecast?.forecast_24h?.items?.[0] ||
    rawForecast?.forecast_24h ||
    (rawForecast?.items?.[0]?.general ? rawForecast.items[0] : undefined);
  const general24h = forecast24hItem?.general;
  const periods24h: Forecast24hPeriod[] = forecast24hItem?.periods || [];

  const forecast4dItem =
    rawForecast?.forecast_4day?.items?.[0] ||
    rawForecast?.forecast_4day ||
    (rawForecast?.items?.[0]?.forecasts ? rawForecast.items[0] : undefined);
  const days4d: Forecast4DayItem[] = forecast4dItem?.forecasts || [];

  // Normalize get_asean_climate
  const rawAsean = data?.get_asean_climate;
  const aseanCountries: AseanCountryClimate[] = Array.isArray(rawAsean)
    ? rawAsean
    : rawAsean?.countries || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-slate-900 whitespace-nowrap">
            SG &amp; ASEAN Weather
          </span>
          <nav className="flex items-center gap-1" role="tablist" aria-label="Main Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'Singapore'}
              onClick={() => setActiveTab('Singapore')}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
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
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <div className="py-12 text-sm text-slate-500 font-mono">
            Loading telemetry...
          </div>
        )}

        {!loading && errorReason && (
          <div className="p-4 border border-rose-200 bg-white text-sm text-rose-700 font-mono">
            {errorReason}
          </div>
        )}

        {!loading && !errorReason && activeTab === 'Singapore' && (
          <div className="space-y-8">
            {/* Section 1: get_sg_psi */}
            <section aria-labelledby="heading-psi" className="bg-white border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200">
                <h2 id="heading-psi" className="text-base font-semibold text-slate-900">
                  Pollutant Standards Index (get_sg_psi)
                </h2>
                {psiItem?.timestamp && (
                  <span className="text-xs text-slate-500 font-mono">
                    {formatTimeRange(psiItem.timestamp)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
                {REGIONS.map((region) => {
                  const val = psi24h[region];
                  const status = getPsiDescriptor(val);
                  return (
                    <div key={region} className="border border-slate-200 p-3 bg-slate-50/50">
                      <div className="text-xs text-slate-500 capitalize">{region}</div>
                      <div className="mt-1 text-2xl font-semibold font-mono text-slate-900">
                        {val ?? '—'}
                      </div>
                      <div className={`mt-0.5 text-xs font-medium ${status.colorClass}`}>
                        {status.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-medium">Sub-Index / Pollutant</th>
                      {REGIONS.map((r) => (
                        <th key={r} className="py-2 px-2 font-medium capitalize text-right">
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                    <tr>
                      <td className="py-2 pr-3 font-sans text-slate-600">24h PSI</td>
                      {REGIONS.map((r) => (
                        <td key={r} className="py-2 px-2 text-right">{psi24h[r] ?? '—'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans text-slate-600">24h PM2.5 (µg/m³)</td>
                      {REGIONS.map((r) => (
                        <td key={r} className="py-2 px-2 text-right">{pm25_24h[r] ?? '—'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans text-slate-600">24h PM10 (µg/m³)</td>
                      {REGIONS.map((r) => (
                        <td key={r} className="py-2 px-2 text-right">{pm10_24h[r] ?? '—'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans text-slate-600">O₃ Sub-Index</td>
                      {REGIONS.map((r) => (
                        <td key={r} className="py-2 px-2 text-right">{o3Sub[r] ?? '—'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans text-slate-600">CO Sub-Index</td>
                      {REGIONS.map((r) => (
                        <td key={r} className="py-2 px-2 text-right">{coSub[r] ?? '—'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans text-slate-600">SO₂ Sub-Index</td>
                      {REGIONS.map((r) => (
                        <td key={r} className="py-2 px-2 text-right">{so2Sub[r] ?? '—'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 2: get_sg_weather_now */}
            <section aria-labelledby="heading-now" className="bg-white border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200">
                <h2 id="heading-now" className="text-base font-semibold text-slate-900">
                  2-Hour Area Weather Now (get_sg_weather_now)
                </h2>
                {nowPeriod && (
                  <span className="text-xs text-slate-500 font-mono">{nowPeriod}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 pt-4 text-xs">
                {areaForecasts.map((item, idx) => {
                  const areaName = item.area || item.name || `Area ${idx + 1}`;
                  return (
                    <div
                      key={`${areaName}-${idx}`}
                      className="flex items-baseline justify-between py-1.5 border-b border-slate-100 gap-2"
                    >
                      <span className="font-medium text-slate-800 truncate">{areaName}</span>
                      <span className="text-slate-600 text-right shrink-0">{item.forecast}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 3: get_sg_forecast */}
            <section aria-labelledby="heading-forecast" className="bg-white border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200">
                <h2 id="heading-forecast" className="text-base font-semibold text-slate-900">
                  Singapore Weather Forecast (get_sg_forecast)
                </h2>
                {forecast24hItem?.valid_period && (
                  <span className="text-xs text-slate-500 font-mono">
                    {formatTimeRange(
                      forecast24hItem.valid_period.start,
                      forecast24hItem.valid_period.end
                    )}
                  </span>
                )}
              </div>

              {general24h && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="border border-slate-200 p-3 bg-slate-50/50">
                    <div className="text-xs text-slate-500">24h Outlook</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {general24h.forecast || '—'}
                    </div>
                  </div>
                  <div className="border border-slate-200 p-3 bg-slate-50/50">
                    <div className="text-xs text-slate-500">Temperature</div>
                    <div className="mt-1 text-sm font-semibold font-mono text-slate-900">
                      {general24h.temperature?.low ?? '—'}°C – {general24h.temperature?.high ?? '—'}°C
                    </div>
                  </div>
                  <div className="border border-slate-200 p-3 bg-slate-50/50">
                    <div className="text-xs text-slate-500">Relative Humidity</div>
                    <div className="mt-1 text-sm font-semibold font-mono text-slate-900">
                      {general24h.relative_humidity?.low ?? '—'}% – {general24h.relative_humidity?.high ?? '—'}%
                    </div>
                  </div>
                  <div className="border border-slate-200 p-3 bg-slate-50/50">
                    <div className="text-xs text-slate-500">Wind</div>
                    <div className="mt-1 text-sm font-semibold font-mono text-slate-900">
                      {general24h.wind?.direction || ''} {general24h.wind?.speed?.low ?? '—'}–
                      {general24h.wind?.speed?.high ?? '—'} km/h
                    </div>
                  </div>
                </div>
              )}

              {periods24h.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-3 font-medium">Period</th>
                        <th className="py-2 px-2 font-medium">Central</th>
                        <th className="py-2 px-2 font-medium">North</th>
                        <th className="py-2 px-2 font-medium">South</th>
                        <th className="py-2 px-2 font-medium">East</th>
                        <th className="py-2 px-2 font-medium">West</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {periods24h.map((period, idx) => (
                        <tr key={idx}>
                          <td className="py-2 pr-3 font-mono text-slate-600 whitespace-nowrap">
                            {formatTimeRange(period.time?.start, period.time?.end)}
                          </td>
                          <td className="py-2 px-2">{period.regions?.central || '—'}</td>
                          <td className="py-2 px-2">{period.regions?.north || '—'}</td>
                          <td className="py-2 px-2">{period.regions?.south || '—'}</td>
                          <td className="py-2 px-2">{period.regions?.east || '—'}</td>
                          <td className="py-2 px-2">{period.regions?.west || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {days4d.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-3">4-Day Outlook</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {days4d.map((day, idx) => (
                      <div key={idx} className="border border-slate-200 p-3">
                        <div className="font-mono font-semibold text-slate-900">{day.date}</div>
                        <div className="mt-1 text-slate-700">{day.forecast}</div>
                        <div className="mt-2 font-mono text-slate-500">
                          {day.temperature?.low}–{day.temperature?.high}°C · RH{' '}
                          {day.relative_humidity?.low}–{day.relative_humidity?.high}% ·{' '}
                          {day.wind?.direction} {day.wind?.speed?.low}–{day.wind?.speed?.high} km/h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && !errorReason && activeTab === 'ASEAN' && (
          <section aria-labelledby="heading-asean" className="bg-white border border-slate-200 p-4 sm:p-6">
            <div className="pb-4 border-b border-slate-200">
              <h2 id="heading-asean" className="text-base font-semibold text-slate-900">
                ASEAN Member States Climate Information
              </h2>
            </div>

            <div className="divide-y divide-slate-200">
              {aseanCountries.map((c, idx) => (
                <div key={c.country_code || c.country || `asean-${idx}`} className="py-4 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {c.country} <span className="font-mono text-xs text-slate-500">({c.country_code})</span>
                    </div>
                    {c.capital && (
                      <div className="text-slate-500 mt-0.5">Capital: {c.capital}</div>
                    )}
                  </div>
                  <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block">Average Temperatures</span>
                      <span className="font-mono text-slate-900">{c.average_temperature}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Annual Rainfall</span>
                      <span className="font-mono text-slate-900">{c.annual_rainfall}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Monsoon Seasons</span>
                      <span className="text-slate-800">{c.monsoon_seasons}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Natural Hazards</span>
                      <span className="text-slate-800">{c.natural_hazards}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
