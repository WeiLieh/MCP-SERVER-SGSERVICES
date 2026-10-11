import { FormEvent, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  MapPin,
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
  current_metrics?: {
    temperature?: number | null;
    feels_like?: number | null;
    humidity?: number | null;
    wind_speed?: number | null;
    uv_index?: number | null;
    pressure?: number | null;
  } | null;
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

interface HealthStatus {
  answered: boolean;
  ok: boolean;
  status: number;
  latencyMs: number;
  checkedAt: string;
  reason?: string;
}

const REGIONS = ['central', 'north', 'south', 'east', 'west'] as const;
type SgRegion = (typeof REGIONS)[number];

const REGION_COORDS: Record<SgRegion, { lat: number; lon: number }> = {
  central: { lat: 1.35735, lon: 103.82 },
  east: { lat: 1.35735, lon: 103.94 },
  north: { lat: 1.41803, lon: 103.82 },
  south: { lat: 1.29587, lon: 103.82 },
  west: { lat: 1.35735, lon: 103.7 },
};

const REFERENCE_LOCATIONS: Array<{
  postal: string;
  address: string;
  lat: number;
  lon: number;
  region: SgRegion;
}> = [
  { postal: '238823', address: 'ORCHARD ROAD ISTANA SINGAPORE 238823', lat: 1.3071, lon: 103.8425, region: 'central' },
  { postal: '048619', address: '8 MARINA BOULEVARD MARINA BAY FINANCIAL CENTRE SINGAPORE 048619', lat: 1.2795, lon: 103.8543, region: 'south' },
  { postal: '098585', address: '8 SENTOSA GATEWAY RESORTS WORLD SENTOSA SINGAPORE 098585', lat: 1.2568, lon: 103.8203, region: 'south' },
  { postal: '310190', address: '190 TOA PAYOH CENTRAL HDB HUB SINGAPORE 310190', lat: 1.3326, lon: 103.8482, region: 'central' },
  { postal: '529509', address: '10 TAMPINES CENTRAL 1 TAMPINES 1 SINGAPORE 529509', lat: 1.3541, lon: 103.9451, region: 'east' },
  { postal: '819663', address: '78 AIRPORT BOULEVARD JEWEL CHANGI AIRPORT SINGAPORE 819663', lat: 1.3602, lon: 103.9898, region: 'east' },
  { postal: '738099', address: '1 WOODLANDS SQUARE CAUSEWAY POINT SINGAPORE 738099', lat: 1.436, lon: 103.786, region: 'north' },
  { postal: '769098', address: '930 YISHUN AVENUE 2 NORTHPOINT CITY SINGAPORE 769098', lat: 1.4294, lon: 103.8358, region: 'north' },
  { postal: '569933', address: '53 ANG MO KIO AVENUE 3 AMK HUB SINGAPORE 569933', lat: 1.3691, lon: 103.8485, region: 'central' },
  { postal: '608532', address: '50 JURONG GATEWAY ROAD JEM SINGAPORE 608532', lat: 1.3331, lon: 103.7436, region: 'west' },
  { postal: '648886', address: '1 JURONG WEST CENTRAL 2 JURONG POINT SINGAPORE 648886', lat: 1.3396, lon: 103.7067, region: 'west' },
];

const SECTOR_FALLBACK: Record<string, { area: string; region: SgRegion; lat: number; lon: number }> = {
  '01': { area: 'Raffles Place / Marina', region: 'south', lat: 1.281, lon: 103.851 },
  '02': { area: 'Anson / Tanjong Pagar', region: 'south', lat: 1.275, lon: 103.845 },
  '03': { area: 'Queenstown / Tiong Bahru', region: 'south', lat: 1.286, lon: 103.827 },
  '04': { area: 'Telok Blangah / Harbourfront', region: 'south', lat: 1.266, lon: 103.821 },
  '05': { area: 'Pasir Panjang / Clementi', region: 'west', lat: 1.285, lon: 103.776 },
  '06': { area: 'High Street / Beach Road', region: 'central', lat: 1.292, lon: 103.85 },
  '07': { area: 'Middle Road / Golden Mile', region: 'central', lat: 1.3, lon: 103.858 },
  '08': { area: 'Little India / Farrer Park', region: 'central', lat: 1.309, lon: 103.854 },
  '09': { area: 'Harbourfront / Sentosa', region: 'south', lat: 1.265, lon: 103.82 },
  '10': { area: 'Bukit Timah / Holland', region: 'central', lat: 1.312, lon: 103.8 },
  '11': { area: 'Novena / Thomson', region: 'central', lat: 1.325, lon: 103.825 },
  '12': { area: 'Clementi / West Coast', region: 'west', lat: 1.315, lon: 103.765 },
  '13': { area: 'Macpherson / Braddell', region: 'central', lat: 1.33, lon: 103.87 },
  '14': { area: 'Geylang / Eunos', region: 'east', lat: 1.318, lon: 103.893 },
  '15': { area: 'Katong / Joo Chiat', region: 'east', lat: 1.305, lon: 103.905 },
  '16': { area: 'Bedok / Upper East Coast', region: 'east', lat: 1.315, lon: 103.94 },
  '17': { area: 'Loyang / Changi', region: 'east', lat: 1.37, lon: 103.97 },
  '18': { area: 'Tampines / Pasir Ris', region: 'east', lat: 1.355, lon: 103.945 },
  '19': { area: 'Serangoon Garden / Hougang / Punggol', region: 'north', lat: 1.375, lon: 103.895 },
  '20': { area: 'Bishan / Ang Mo Kio', region: 'central', lat: 1.355, lon: 103.845 },
  '21': { area: 'Upper Bukit Timah / Clementi Park', region: 'west', lat: 1.338, lon: 103.775 },
  '22': { area: 'Jurong / Boon Lay', region: 'west', lat: 1.335, lon: 103.72 },
  '23': { area: 'Orchard / Cairnhill / River Valley', region: 'central', lat: 1.304, lon: 103.835 },
  '24': { area: 'Tanglin / River Valley', region: 'central', lat: 1.298, lon: 103.825 },
  '25': { area: 'Ardmore / Bukit Timah', region: 'central', lat: 1.315, lon: 103.82 },
  '26': { area: 'Bukit Timah / Holland', region: 'central', lat: 1.325, lon: 103.795 },
  '27': { area: 'Holland / Ghim Moh', region: 'west', lat: 1.312, lon: 103.788 },
  '28': { area: 'Seletar / Yio Chu Kang', region: 'north', lat: 1.39, lon: 103.87 },
  '29': { area: 'Thomson / Mount Pleasant', region: 'central', lat: 1.335, lon: 103.835 },
  '30': { area: 'Novena / Thomson', region: 'central', lat: 1.32, lon: 103.842 },
  '31': { area: 'Toa Payoh / Balestier', region: 'central', lat: 1.333, lon: 103.848 },
  '32': { area: 'Balestier / Whampoa', region: 'central', lat: 1.325, lon: 103.855 },
  '33': { area: 'Bendemeer / Kallang', region: 'central', lat: 1.32, lon: 103.865 },
  '34': { area: 'Potong Pasir / Macpherson', region: 'central', lat: 1.332, lon: 103.868 },
  '35': { area: 'Woodleigh / Bidadari', region: 'central', lat: 1.339, lon: 103.872 },
  '36': { area: 'Macpherson / Tai Seng', region: 'central', lat: 1.335, lon: 103.885 },
  '37': { area: 'Circuit Road / Pipit Road', region: 'central', lat: 1.327, lon: 103.886 },
  '38': { area: 'Geylang / Aljunied', region: 'central', lat: 1.315, lon: 103.882 },
  '39': { area: 'Mountbatten / Dakota', region: 'central', lat: 1.308, lon: 103.885 },
  '40': { area: 'Paya Lebar / Eunos', region: 'east', lat: 1.32, lon: 103.898 },
  '41': { area: 'Eunos / Kembangan', region: 'east', lat: 1.324, lon: 103.912 },
  '42': { area: 'Joo Chiat / Marine Parade', region: 'east', lat: 1.31, lon: 103.906 },
  '43': { area: 'Tanjong Katong / Mountbatten', region: 'east', lat: 1.302, lon: 103.895 },
  '44': { area: 'Marine Parade / Siglap', region: 'east', lat: 1.305, lon: 103.92 },
  '45': { area: 'Siglap / Frankel', region: 'east', lat: 1.312, lon: 103.925 },
  '46': { area: 'Bedok / Chai Chee', region: 'east', lat: 1.325, lon: 103.93 },
  '47': { area: 'Bedok Reservoir / Kaki Bukit', region: 'east', lat: 1.336, lon: 103.922 },
  '48': { area: 'Simei / Expo / Changi Business Park', region: 'east', lat: 1.342, lon: 103.955 },
  '49': { area: 'Changi Village / Loyang', region: 'east', lat: 1.385, lon: 103.985 },
  '50': { area: 'Loyang / Changi', region: 'east', lat: 1.368, lon: 103.968 },
  '51': { area: 'Pasir Ris', region: 'east', lat: 1.372, lon: 103.95 },
  '52': { area: 'Tampines', region: 'east', lat: 1.353, lon: 103.945 },
  '53': { area: 'Hougang / Serangoon', region: 'north', lat: 1.362, lon: 103.888 },
  '54': { area: 'Sengkang', region: 'north', lat: 1.392, lon: 103.895 },
  '55': { area: 'Serangoon / Lorong Chuan', region: 'central', lat: 1.354, lon: 103.868 },
  '56': { area: 'Ang Mo Kio', region: 'central', lat: 1.37, lon: 103.845 },
  '57': { area: 'Bishan / Sin Ming / Upper Thomson', region: 'central', lat: 1.355, lon: 103.835 },
  '58': { area: 'Bukit Timah / Clementi Park', region: 'west', lat: 1.34, lon: 103.778 },
  '59': { area: 'King Albert Park / Sunset Way', region: 'west', lat: 1.332, lon: 103.775 },
  '60': { area: 'Jurong East', region: 'west', lat: 1.333, lon: 103.742 },
  '61': { area: 'Jurong West / Taman Jurong', region: 'west', lat: 1.335, lon: 103.722 },
  '62': { area: 'Pioneer / Tuas', region: 'west', lat: 1.32, lon: 103.68 },
  '63': { area: 'Tuas', region: 'west', lat: 1.315, lon: 103.65 },
  '64': { area: 'Jurong West / Boon Lay', region: 'west', lat: 1.342, lon: 103.705 },
  '65': { area: 'Bukit Batok', region: 'west', lat: 1.352, lon: 103.752 },
  '66': { area: 'Hillview / Dairy Farm', region: 'west', lat: 1.362, lon: 103.765 },
  '67': { area: 'Bukit Panjang', region: 'west', lat: 1.378, lon: 103.765 },
  '68': { area: 'Choa Chu Kang', region: 'west', lat: 1.385, lon: 103.745 },
  '69': { area: 'Tengah / Lim Chu Kang', region: 'west', lat: 1.375, lon: 103.71 },
  '70': { area: 'Lim Chu Kang / Sungei Gedong', region: 'west', lat: 1.41, lon: 103.7 },
  '71': { area: 'Lim Chu Kang', region: 'north', lat: 1.425, lon: 103.715 },
  '72': { area: 'Kranji / Mandai', region: 'north', lat: 1.42, lon: 103.755 },
  '73': { area: 'Woodlands / Marsiling', region: 'north', lat: 1.436, lon: 103.786 },
  '75': { area: 'Sembawang', region: 'north', lat: 1.448, lon: 103.82 },
  '76': { area: 'Yishun', region: 'north', lat: 1.428, lon: 103.835 },
  '77': { area: 'Upper Thomson / Springleaf', region: 'north', lat: 1.4, lon: 103.818 },
  '78': { area: 'Lentor / Tagore', region: 'north', lat: 1.385, lon: 103.83 },
  '79': { area: 'Seletar / Fernvale', region: 'north', lat: 1.392, lon: 103.876 },
  '80': { area: 'Seletar / Yio Chu Kang', region: 'north', lat: 1.388, lon: 103.868 },
  '81': { area: 'Changi Airport', region: 'east', lat: 1.358, lon: 103.989 },
  '82': { area: 'Punggol', region: 'north', lat: 1.404, lon: 103.902 },
};

function findNearestRegion(lat: number, lon: number): SgRegion {
  let closest: SgRegion = 'central';
  let minDistance = Infinity;
  for (const r of REGIONS) {
    const c = REGION_COORDS[r];
    const dist = Math.hypot(lat - c.lat, lon - c.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = r;
    }
  }
  return closest;
}

function findNearestReferencePostal(lat: number, lon: number) {
  let closest = REFERENCE_LOCATIONS[0];
  let minDistance = Infinity;
  for (const item of REFERENCE_LOCATIONS) {
    const dist = Math.hypot(lat - item.lat, lon - item.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
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
  const val = psi ?? 0;
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
    try {
      const res = await fetch('/api/health');
      const elapsed = Math.round(performance.now() - t0);
      const json = await res.json().catch(() => ({}));
      const nowTime = new Date().toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Singapore',
      });
      setHealthStatus({
        answered: json.answered ?? res.status < 500,
        ok: Boolean(json.ok),
        status: json.status || res.status,
        latencyMs: typeof json.latencyMs === 'number' ? json.latencyMs : elapsed,
        checkedAt: nowTime,
        reason: json.reason,
      });
    } catch {
      const elapsed = Math.round(performance.now() - t0);
      const nowTime = new Date().toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Singapore',
      });
      setHealthStatus({
        answered: false,
        ok: false,
        status: 502,
        latencyMs: elapsed,
        checkedAt: nowTime,
        reason: 'Upstream MCP server unreachable',
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

  async function lookupSixDigitPostal(code: string): Promise<{
    found: boolean;
    address: string;
    region: SgRegion;
  }> {
    try {
      const res = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
          code
        )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
      );
      if (res.ok) {
        const json = await res.json();
        const match =
          json?.results?.find((r: any) => r.POSTAL === code) || json?.results?.[0];
        if (match && match.ADDRESS) {
          const lat = parseFloat(match.LATITUDE);
          const lon = parseFloat(match.LONGITUDE);
          const region =
            !Number.isNaN(lat) && !Number.isNaN(lon)
              ? findNearestRegion(lat, lon)
              : SECTOR_FALLBACK[code.slice(0, 2)]?.region || 'central';
          return {
            found: true,
            address: match.ADDRESS,
            region,
          };
        }
      }
    } catch {
      // Fall back to sector lookup if network call fails
    }

    const sector = code.slice(0, 2);
    const sectorInfo = SECTOR_FALLBACK[sector];
    if (sectorInfo) {
      return {
        found: true,
        address: `${sectorInfo.area.toUpperCase()} SINGAPORE ${code}`,
        region: sectorInfo.region,
      };
    }

    return {
      found: false,
      address: '',
      region: 'central',
    };
  }

  async function resolveNearestPostalFromCoords(
    lat: number,
    lon: number
  ): Promise<{ postal: string; address: string; region: SgRegion }> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      if (res.ok) {
        const json = await res.json();
        const postcode = json?.address?.postcode;
        if (postcode && /^\d{6}$/.test(postcode)) {
          const oneMapRes = await lookupSixDigitPostal(postcode);
          if (oneMapRes.found) {
            return {
              postal: postcode,
              address: oneMapRes.address,
              region: oneMapRes.region,
            };
          }
          return {
            postal: postcode,
            address: (json.display_name || `SINGAPORE ${postcode}`).toUpperCase(),
            region: findNearestRegion(lat, lon),
          };
        }
      }
    } catch {
      // Fallback to nearest reference Singapore postal location
    }

    const nearest = findNearestReferencePostal(lat, lon);
    return {
      postal: nearest.postal,
      address: nearest.address,
      region: nearest.region,
    };
  }

  async function defaultToNearestPostal(withUnrecognisedNotice: boolean) {
    if (withUnrecognisedNotice) {
      setFallbackNotice('unrecognised postal code, defaulted to postal code nearest to you');
    } else {
      setFallbackNotice(null);
    }

    setLocating(true);

    const applyCoords = async (lat: number, lon: number) => {
      setUserCoords({ lat, lon });
      const resolved = await resolveNearestPostalFromCoords(lat, lon);
      setPostalInput(resolved.postal);
      setResolvedAddress(resolved.address);
      setSelectedRegion(resolved.region);
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
        async () => {
          // If permission denied or unavailable in iframe, default to central Singapore (238823)
          const def = REFERENCE_LOCATIONS[0];
          setPostalInput(def.postal);
          setResolvedAddress(def.address);
          setSelectedRegion(def.region);
          setLocating(false);
        },
        { timeout: 6000, maximumAge: 60000 }
      );
    } else {
      const def = REFERENCE_LOCATIONS[0];
      setPostalInput(def.postal);
      setResolvedAddress(def.address);
      setSelectedRegion(def.region);
      setLocating(false);
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
    }

    // Any other unrecognised format or invalid 6-digit code fails gracefully
    await defaultToNearestPostal(true);
  }

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
                  {psiItem?.timestamp && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Last updated {formatTimeRange(psiItem.timestamp)}
                    </span>
                  )}
                </div>

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
              </section>

              {/* Section 2: Weather forecast for Singapore */}
              <section aria-labelledby="heading-forecast" className="bg-white border border-slate-200 p-5 rounded-2xl">
                <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
                  <h2 id="heading-forecast" className="text-sm font-semibold text-slate-900">
                    Weather forecast for Singapore
                  </h2>
                  {forecast24hItem?.valid_period && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Last updated{' '}
                      {formatTimeRange(
                        forecast24hItem.valid_period.start,
                        forecast24hItem.valid_period.end
                      )}
                    </span>
                  )}
                </div>

                {/* Top Weather Card Layout matching screenshot */}
                <div className="pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Singapore, Singapore</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px]">1.2897°, 103.8501°</span>
                  </div>

                  <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                    Singapore
                  </div>

                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="text-5xl font-bold tracking-tight text-slate-900 leading-none tabular-nums">
                      {rawForecast?.current_metrics?.temperature ??
                        (general24h?.temperature?.low && general24h?.temperature?.high
                          ? Math.round((general24h.temperature.low + general24h.temperature.high) / 2)
                          : 28)}
                      °C
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {getHeroWeatherIcon(general24h?.forecast)}
                        <span className="text-sm font-semibold text-slate-800">
                          {(general24h?.forecast || 'Partly Cloudy').replace(/\s*\([^)]*\)/g, '')}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-xs whitespace-nowrap">
                        <span className="text-[11px] font-sans font-medium text-slate-400 mr-1.5">
                          Low / High
                        </span>
                        <span className="text-slate-400">
                          {general24h?.temperature?.low ?? 25}°
                        </span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="font-semibold text-slate-900">
                          {general24h?.temperature?.high ?? 34}°
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/70 rounded-2xl p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-hidden="true" />
                        <span>Humidity</span>
                      </div>
                      <div className="mt-1.5 text-lg font-mono font-bold text-slate-900">
                        {rawForecast?.current_metrics?.humidity ??
                          (general24h?.relative_humidity?.low && general24h?.relative_humidity?.high
                            ? `${general24h.relative_humidity.low}–${general24h.relative_humidity.high}`
                            : 81)}
                        %
                      </div>
                    </div>

                    <div className="bg-slate-50/70 rounded-2xl p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Wind className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                        <span>Wind Speed</span>
                      </div>
                      <div className="mt-1.5 text-lg font-mono font-bold text-slate-900">
                        {rawForecast?.current_metrics?.wind_speed ??
                          (general24h?.wind?.speed?.low && general24h?.wind?.speed?.high
                            ? `${general24h.wind.speed.low}–${general24h.wind.speed.high}`
                            : 6)}{' '}
                        km/h
                      </div>
                    </div>
                  </div>
                </div>

                {days4d.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-900">4-Day Forecast</h3>
                      <span className="text-[11px] font-medium text-slate-400">Low / High</span>
                    </div>
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
                  </div>
                )}
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
                    {nowPeriod && (
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

                {weatherNowOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-200 divide-y divide-slate-100 text-xs">
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
                  {healthStatus?.answered !== false ? (
                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reachable</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-medium text-rose-600 shrink-0">
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unreachable</span>
                    </div>
                  )}
                </div>

                <div className="mt-1 font-mono text-xs text-slate-500 break-all">
                  https://server.smithery.ai/vdineshk/sg-weather-data-mcp
                </div>

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
                        HTTP {healthStatus?.status ?? 200}
                      </span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-xs text-slate-600">
                        {healthStatus?.status === 200 ? 'Authenticated' : 'OAuth Protected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    {healthStatus?.answered !== false
                      ? 'Smithery MCP endpoint (vdineshk/sg-weather-data-mcp) is online and responding.'
                      : 'Smithery MCP endpoint (vdineshk/sg-weather-data-mcp) is currently unreachable.'}
                  </p>

                  <div>
                    <div className="text-slate-400 mb-0.5">Authorization Server</div>
                    <div className="font-mono text-slate-700 break-all">
                      https://auth.smithery.ai/vdineshk/sg-weather-data-mcp
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>Available MCP Weather Tools</span>
                    </div>
                    <div className="font-mono text-slate-700 leading-relaxed">
                      get_sg_psi · get_sg_weather_now · get_sg_forecast · get_asean_climate
                    </div>
                  </div>

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

              <div className="divide-y divide-slate-200">
                {aseanCountries.map((c, idx) => (
                  <div key={c.country_code || c.country || `asean-${idx}`} className="py-3.5 space-y-2 text-xs">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {c.country} <span className="font-mono text-xs text-slate-500">({c.country_code})</span>
                      </div>
                      {c.capital && (
                        <div className="text-slate-500 mt-0.5">Capital: {c.capital}</div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
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
    </div>
  );
}
