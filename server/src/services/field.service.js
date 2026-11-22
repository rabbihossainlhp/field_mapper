const parcelModel = require('../models/parcel.model');
const { buildStarterFieldPolygon, calculateMetrics } = require('../utils/geoUtils');

const fieldService = {
  async detectBoundary({ lat, lng, zoom = 17 }) {
    // Replace this starter box with satellite image + edge/segmentation integration.
    const geojson = buildStarterFieldPolygon(lat, lng, zoom);
    return { geojson, metrics: calculateMetrics(geojson) };
  },

  async listParcels() {
    return parcelModel.findAll();
  },

  async createParcel({ name, category = 'Fallow', geojson }) {
    return parcelModel.create({
      name: name.trim(),
      category,
      geojson,
      metrics: calculateMetrics(geojson),
    });
  },

  async updateParcel(id, { name, category, geojson }) {
    const existing = await parcelModel.findById(id);
    if (!existing) return null;

    const nextGeojson = geojson || existing.geojson;
    return parcelModel.update(id, {
      name: name ? name.trim() : existing.name,
      category: category || existing.category,
      geojson: nextGeojson,
      metrics: calculateMetrics(nextGeojson),
    });
  },

  async deleteParcel(id) {
    return parcelModel.remove(id);
  },
};

module.exports = fieldService;
