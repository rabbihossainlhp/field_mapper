const turf = require('@turf/turf');

function calculateMetrics(geojson) {
  const areaSqMeters = turf.area(geojson);
  const coords =
    geojson.type === 'Feature' ? geojson.geometry.coordinates : geojson.coordinates;
  const perimeterMeters = Math.round(
    turf.length(turf.lineString(coords[0]), { units: 'meters' })
  );

  return {
    areaSqMeters: Math.round(areaSqMeters),
    acres: Number((areaSqMeters * 0.0002471053814671653).toFixed(2)),
    hectares: Number((areaSqMeters / 10000).toFixed(2)),
    perimeterMeters,
  };
}

// Converts a pixel [x, y] on a tile/crop of size (width x height) centered at (centerLat, centerLng) to [lng, lat]
function pixelToLngLat(x, y, centerLat, centerLng, zoom, width = 256, height = 256) {
  const scale = 256 * Math.pow(2, zoom);
  const worldX = ((centerLng + 180) / 360) * scale;
  const sinLat = Math.sin((centerLat * Math.PI) / 180);
  const worldY =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  const targetWorldX = worldX - width / 2 + x;
  const targetWorldY = worldY - height / 2 + y;

  const lng = (targetWorldX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * targetWorldY) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return [lng, lat];
}

// Generates an initial multi-point field outline around (lat, lng).
// Swap this with SAM / vision segmentation output + pixelToLngLat() for full vision outlining.
function buildStarterFieldPolygon(lat, lng, zoom = 17) {
  const scaleFactor = Math.pow(2, 17 - zoom);
  const dLat = 0.00065 * scaleFactor;
  const dLng = 0.00085 * scaleFactor;

  const poly = turf.polygon([[
    [lng - dLng, lat - dLat],
    [lng + dLng * 0.85, lat - dLat * 0.9],
    [lng + dLng, lat + dLat * 0.3],
    [lng + dLng * 0.65, lat + dLat],
    [lng - dLng * 0.8, lat + dLat * 0.95],
    [lng - dLng, lat - dLat],
  ]]);

  return turf.simplify(poly, { tolerance: 0.000015, highQuality: true });
}

module.exports = {
  calculateMetrics,
  pixelToLngLat,
  buildStarterFieldPolygon,
};