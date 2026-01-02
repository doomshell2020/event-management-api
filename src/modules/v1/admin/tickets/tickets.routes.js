const express = require('express');
const router = express.Router();
const ticketController = require('./tickets.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, ticketController.getTicketList)

// search event details
router.get(
    '/search',
    // authenticate, // optional
    [
        param('customer').optional().isString(),
        param('mobile').optional().isString(),
        param('event').optional().isString(),
        param('ticketNumber').optional().isString(),
        param('purchaseFrom').optional().isDate(),
        param('purchaseTo').optional().isDate(),
    ],
    validate,
    ticketController.searchTicketList
);

module.exports = router;