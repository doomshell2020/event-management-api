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

router.get(
    '/search-order-details',
    [
        param('customer').optional().isString().trim(),
        param('event_id').optional().isInt(),
        param('orderFrom').optional().isISO8601(),
        param('orderTo').optional().isISO8601(),
    ],
    validate,
    ordersController.searchOrdersDetails
);

router.get('/:event_id', ordersController.getOrdersEventId);


module.exports = router;