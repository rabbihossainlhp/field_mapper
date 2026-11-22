const express = require('express');
const fieldController = require('../controllers/field.controller');
const {
  validateDetectRequest,
  validateParcelPayload,
} = require('../validations/field.validation');

const router = express.Router();

router.post('/detect', validateDetectRequest, fieldController.detect);
router.get('/', fieldController.getAll);
router.post('/', validateParcelPayload, fieldController.create);
router.put('/:id', validateParcelPayload, fieldController.update);
router.delete('/:id', fieldController.remove);

module.exports = router