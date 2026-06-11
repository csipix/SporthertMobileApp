export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

const CACHE_KEY = 'sporthet_weather_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 perc — ennyi időn belül nem kérdezzük újra az API-t
const FETCH_TIMEOUT_MS = 8000;

// Marosvásárhely koordinátái. Elsődleges forrás a met.no (stabil, gyors),
// tartalék az Open-Meteo (2026 júniusában rendszeresen 502-zik / 10+ mp alatt válaszol).
const METNO_URL =
  'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=46.5425&lon=24.5575';
const OPENMETEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=46.5425&longitude=24.5575&current_weather=true';

interface CacheEntry {
  data: WeatherData;
  fetchedAt: number;
}

const readCache = (): CacheEntry | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (typeof entry?.data?.temp !== 'number') return null;
    return entry;
  } catch {
    return null;
  }
};

/** Az utolsó sikeres lekérés eredménye (akár lejárt is) — azonnali megjelenítéshez. */
export const getCachedWeather = (): WeatherData | null => readCache()?.data ?? null;

const mapOpenMeteo = (currentWeather: { temperature: number; weathercode: number }): WeatherData => {
  const code = currentWeather.weathercode;
  let condition = 'Napos';
  let icon = 'ph-sun';

  if (code > 0 && code <= 3) { condition = 'Részben felhős'; icon = 'ph-cloud-sun'; }
  else if (code >= 45 && code <= 48) { condition = 'Ködös'; icon = 'ph-cloud-fog'; }
  else if (code >= 51 && code <= 67) { condition = 'Esős'; icon = 'ph-cloud-rain'; }
  else if (code >= 71 && code <= 77) { condition = 'Havas'; icon = 'ph-cloud-snow'; }
  else if (code >= 80 && code <= 82) { condition = 'Zápor'; icon = 'ph-cloud-rain'; }
  else if (code >= 95) { condition = 'Viharos'; icon = 'ph-cloud-lightning'; }

  return { temp: Math.round(currentWeather.temperature), condition, icon };
};

// met.no symbol_code (pl. "rainshowers_day", "partlycloudy_night") -> felirat + ikon
const mapMetNoSymbol = (symbol: string): { condition: string; icon: string } => {
  if (symbol.includes('thunder')) return { condition: 'Viharos', icon: 'ph-cloud-lightning' };
  if (symbol.includes('snow') || symbol.includes('sleet')) return { condition: 'Havas', icon: 'ph-cloud-snow' };
  if (symbol.includes('showers')) return { condition: 'Zápor', icon: 'ph-cloud-rain' };
  if (symbol.includes('rain') || symbol.includes('drizzle')) return { condition: 'Esős', icon: 'ph-cloud-rain' };
  if (symbol.includes('fog')) return { condition: 'Ködös', icon: 'ph-cloud-fog' };
  if (symbol.includes('cloudy') || symbol.includes('fair')) return { condition: 'Részben felhős', icon: 'ph-cloud-sun' };
  return { condition: 'Napos', icon: 'ph-sun' };
};

const fetchWithTimeout = async (url: string): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const fetchFromMetNo = async (): Promise<WeatherData> => {
  const data = await fetchWithTimeout(METNO_URL);
  const now = data?.properties?.timeseries?.[0]?.data;
  const temp = now?.instant?.details?.air_temperature;
  if (typeof temp !== 'number') throw new Error('met.no: missing temperature');
  const symbol: string =
    now?.next_1_hours?.summary?.symbol_code || now?.next_6_hours?.summary?.symbol_code || '';
  return { temp: Math.round(temp), ...mapMetNoSymbol(symbol) };
};

const fetchFromOpenMeteo = async (): Promise<WeatherData> => {
  const data = await fetchWithTimeout(OPENMETEO_URL);
  if (!data.current_weather) throw new Error('Weather API: missing current_weather');
  return mapOpenMeteo(data.current_weather);
};

let inflight: Promise<WeatherData | null> | null = null;

/**
 * Friss időjárás 15 perces cache-sel. Friss cache esetén hálózat nélkül tér vissza,
 * különben lekéri (8 mp timeout + 1 újrapróbálkozás). Hiba esetén null —
 * a hívó addig a getCachedWeather() szerinti utolsó ismert értéket mutathatja.
 */
export const fetchWeather = (): Promise<WeatherData | null> => {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  if (!inflight) {
    inflight = (async () => {
      try {
        let data: WeatherData;
        try {
          data = await fetchFromMetNo();
        } catch {
          data = await fetchFromOpenMeteo(); // tartalék-forrás
        }
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }));
        } catch { /* tárhely-hiba nem végzetes */ }
        return data;
      } catch (error) {
        console.error('Weather fetch error:', error);
        return null;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
};
