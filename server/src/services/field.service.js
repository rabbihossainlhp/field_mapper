const parcelModel = require('../models/parcel.model');
const {
  detectVisionBoundary,
  calculateMetrics,
} = require('../utils/geoUtils');

const fieldService = {
  async detectBoundary({ lat, lng, zoom = 17 }) {
    const geojson = await detectVisionBoundary(lat, lng, zoom);
    return { geojson, metrics: calculateMetrics(geojson) };
  },

  async listParcels() {
    return parcelModel.findAll();
  },

  async createParcel({ name, category = 'Fallow', geojson, locationName = '' }) {
    return parcelModel.create({
      name: name.trim(),
      category,
      locationName,
      geojson,
      metrics: calculateMetrics(geojson),
    });
  },

  async updateParcel(id, { name, category, geojson, locationName }) {
    const existing = await parcelModel.findById(id);
    if (!existing) return null;

    const nextGeojson = geojson || existing.geojson;
    return parcelModel.update(id, {
      name: name ? name.trim() : existing.name,
      category: category || existing.category,
      locationName: locationName !== undefined ? locationName : existing.locationName || '',
      geojson: nextGeojson,
      metrics: calculateMetrics(nextGeojson),
    });
  },

  async deleteParcel(id) {
    return parcelModel.remove(id);
  },
};

module.exports = fieldService;