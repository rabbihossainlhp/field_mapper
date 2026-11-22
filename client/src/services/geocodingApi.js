const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const responseCache = new Map();

export async function searchLocation(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const cacheKey = `search:${normalizedQuery.toLowerCase()}`;
  if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);

  const params = new URLSearchParams({ q: normalizedQuery });
  const response = await fetch(`${API_BASE}/fields/geocode/search?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Place search failed');
  }

  responseCache.set(cacheKey, data);
  return data;
}

export async function reverseGeocode(lat, lng) {
  const cacheKey = `reverse:${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);

  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  const response = await fetch(`${API_BASE}/fields/geocode/reverse?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Location lookup failed');
  }

  const label = data.locationName || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
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