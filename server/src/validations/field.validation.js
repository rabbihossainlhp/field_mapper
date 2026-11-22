function validateDetectRequest(req, res, next) {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'Valid numeric lat and lng are required' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Coordinates out of range' });
  }
  next();
}

function validateParcelPayload(req, res, next) {
  const { name, geojson } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Parcel name is required' });
  }

  const geometry = geojson?.type === 'Feature' ? geojson.geometry : geojson;
  const ring = geometry?.type === 'Polygon' ? geometry.coordinates?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 4) {
    return res.status(400).json({ error: 'Valid GeoJSON Polygon with at least 3 vertices is required' });
  }
  next();
}

module.exports = { validateDetectRequest, validateParcelPayload };
