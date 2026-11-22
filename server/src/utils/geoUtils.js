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

function buildStarterFieldPolygon(lat, lng) {
  const dLat = 0.0007;
  const dLng = 0.0009;
  return turf.simplify(
    turf.polygon([[
      [lng - dLng, lat - dLat],
      [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat],
      [lng - dLng, lat - dLat],
    ]]),
    { tolerance: 0.00002, highQuality: true }
  );
}

module.exports = { calculateMetrics, buildStarterFieldPolygon };
