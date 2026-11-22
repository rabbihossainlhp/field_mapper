const fieldService = require('../services/field.service');

const fieldController = {
  async detect(req, res, next) {
    try {
      res.status(200).json(await fieldService.detectBoundary(req.body));
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
