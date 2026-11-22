import * as turf from '@turf/turf';

export function computePolygonMetrics(geojson) {
  const geometry = geojson?.type === 'Feature' ? geojson.geometry : geojson;
  const ring = geometry?.coordinates?.[0];

  if (!Array.isArray(ring) || ring.length < 4) {
    return { areaSqMeters: 0, acres: 0, hectares: 0, perimeterMeters: 0 };
  }

  const areaSqMeters = turf.area(geojson);
  const acres = Number((areaSqMeters * 0.0002471053814671653).toFixed(2));
  const hectares = Number((areaSqMeters / 10000).toFixed(2));
  const perimeterMeters = Math.round(
    turf.length(turf.lineString(ring), { units: 'meters' })
  );

  return {
    areaSqMeters: Math.round(areaSqMeters),
    acres,
    hectares,
    perimeterMeters,
  };
}

export function cloneGeojson(geojson) {
  return JSON.parse(JSON.stringify(geojson));
}