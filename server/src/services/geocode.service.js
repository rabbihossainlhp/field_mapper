const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'FieldBoundaryMapper/1.0 (local-dev)';
const cache = new Map();

async function fetchNominatim(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding service returned HTTP ${response.status}`);
  }

  const data = await response.json();
  cache.set(url, data);
  return data;
}

const geocodeService = {
  async search(query) {
    const trimmed = String(query || '').trim();
    if (!trimmed) return [];

    const params = new URLSearchParams({
      format: 'jsonv2',
      limit: '5',
      addressdetails: '1',
      q: trimmed,
    });

    const results = await fetchNominatim(`${NOMINATIM_BASE}/search?${params}`);
    return Array.isArray(results) ? results : [];
  },

  async reverse(lat, lng) {
    const roundedLat = Number(lat).toFixed(5);
    const roundedLng = Number(lng).toFixed(5);

    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: roundedLat,
      lon: roundedLng,
      zoom: '15',
      addressdetails: '1',
    });

    const data = await fetchNominatim(`${NOMINATIM_BASE}/reverse?${params}`);
    const addr = data.address || {};

    // Build a concise, readable rural/local place label first, falling back to display_name
    const localParts = [
      addr.village || addr.hamlet || addr.suburb || addr.neighbourhood || addr.town || addr.city,
      addr.county || addr.state_district || addr.state,
      addr.country,
    ].filter(Boolean);

    const shortLabel = localParts.length ? localParts.join(', ') : '';
    return {
      locationName: shortLabel || data.display_name || `${roundedLat}, ${roundedLng}`,
      fullAddress: data.display_name || '',
      lat: Number(roundedLat),
      lng: Number(roundedLng),
    };
  },
};

module.exports = geocodeService;