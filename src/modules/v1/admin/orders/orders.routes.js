const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, ordersController.getOrdersList)

// search event details
router.get(
    '/search',
    // authenticate, // optional
    [
        param('customer').optional().isString(),
        param('event').optional().isString(),
        param('orderFrom').optional().isDate(),
        param('orderTo').optional().isDate(),
    ],
    validate,
    ordersController.searchOrdersList
);

module.exports = router;