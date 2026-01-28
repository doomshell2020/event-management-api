const express = require('express');
const router = express.Router();
const ticketController = require('./tickets.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, ticketController.getTicketList)


// routes/admin/ticket.routes.js
router.get(
    '/:type/:event_id',
    authenticate,
    ticketController.getTicketsWithEventIdAndType
);


// search event details
router.get(
    '/search',
    // authenticate, // optional
    [
        param('customer').optional().isString(),
        param('mobile').optional().isString(),
        param('event').optional().isString(),
        param('email').optional().isString(),
        param('ticketNumber').optional().isString(),
        param('purchaseFrom').optional().isDate(),
        param('purchaseTo').optional().isDate(),
    ],
    validate,
    ticketController.searchTicketList
);


router.post('/items/details',ticketController.getOrderItemsByItem);

module.exports = router;