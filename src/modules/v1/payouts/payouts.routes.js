const express = require('express');
const router = express.Router();
const payoutsController = require('./payouts.controller');
const { body, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');


/* ==========   LIST PAYOUTS (Admin)   ================ */
router.get('/list', authenticate,
    [
        query('event_id').optional().isInt(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601()
    ],
    validate,
    payoutsController.listPayouts
);

module.exports = router;