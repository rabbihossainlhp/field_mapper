const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_INTERVAL_MS = 1100;

const responseCache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function fetchNominatim(url) {
  const request = requestQueue.then(async () => {
    const delay = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    lastRequestAt = Date.now();

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Location lookup failed (${response.status})`);
    }
    return response.json();
  });

  requestQueue = request.catch(() => {});
  return request;
}

export async function searchLocation(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const cacheKey = `search:${normalizedQuery.toLowerCase()}`;
  if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);

  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '5',
    q: normalizedQuery,
  });
  const results = await fetchNominatim(`${NOMINATIM_URL}/search?${params}`);
  responseCache.set(cacheKey, results);
  return results;
}

export async function reverseGeocode(lat, lng) {
  const cacheKey = `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);

  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '14',
    addressdetails: '1',
  });
  const result = await fetchNominatim(`${NOMINATIM_URL}/reverse?${params}`);
  const label = result.display_name || '';
  responseCache.set(cacheKey, label);
  return label;
}

export function parseCoordinates(query) {
  const match = query.trim().match(
    /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/
  );
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
