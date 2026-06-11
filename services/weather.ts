export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

const CACHE_KEY = 'sporthet_weather_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 perc — ennyi időn belül nem kérdezzük újra az API-t
// Az Open-Meteo terhelt időszakban 10-12 mp alatt válaszol — a timeout legyen e fölött,
// különben degradált API mellett sosem sikerülne a lekérés. A cache miatt ez a várakozás
// legfeljebb 15 percenként egyszer, jellemzően háttérben (app-indítási prefetch) fordul elő.
const FETCH_TIMEOUT_MS = 15000;

// Marosvásárhely koordinátái
const API_URL =
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

const mapWeather = (currentWeather: { temperature: number; weathercode: number }): WeatherData => {
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

const fetchOnce = async (): Promise<WeatherData> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
    const data = await res.json();
    if (!data.current_weather) throw new Error('Weather API: missing current_weather');
    return mapWeather(data.current_weather);
  } finally {
    clearTimeout(timer);
  }
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
          data = await fetchOnce();
        } catch {
          data = await fetchOnce(); // egyetlen újrapróbálkozás
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
