const fieldService = require('../services/field.service');
const geocodeService = require('../services/geocode.service');

const fieldController = {
  async detect(req, res, next) {
    try {
      res.status(200).json(await fieldService.detectBoundary(req.body));
    } catch (error) {
      next(error);
    }
  },

  async searchLocation(req, res, next) {
    try {
      const q = req.query.q || '';
      const results = await geocodeService.search(q);
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  },

  async reverseLocation(req, res, next) {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'Valid numeric lat and lng query params required' });
      }
      const result = await geocodeService.reverse(lat, lng);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      res.status(200).json(await fieldService.listParcels());
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await fieldService.createParcel(req.body));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const updated = await fieldService.updateParcel(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Parcel not found' });
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await fieldService.deleteParcel(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Parcel not found' });
      res.status(200).json({ success: true, id: req.params.id });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = fieldController;