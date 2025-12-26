const express = require('express');
const router = express.Router();
const ticketController = require('./tickets.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const uploadFiles = require('../../../middlewares/upload.middleware');


// 🎟️ Create Ticket Route
router.post('/create',
    authenticate,
    uploadFiles({ folder: 'uploads/tickets', type: 'single', fieldName: 'ticketImage' }),
    [
        // ✅ Required fields
        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),

        body('title')
            .notEmpty().withMessage('Ticket title is required')
            .isLength({ min: 3 }).withMessage('Ticket title must be at least 3 characters long'),

        // 🟡 Optional fields (validate only if present)
        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Ticket price must be a valid number'),

        body('count')
            .optional()
            .isInt({ min: 1 }).withMessage('Ticket count must be at least 1'),

        body('access_type')
            .notEmpty().withMessage('Ticket access_type is required')
            .isIn(['event', 'day', 'slot'])
            .withMessage('Invalid ticket access_type event, day, slot'),

        body('type')
            .optional()
            .isIn(['open_sales', 'comps','committee_sales'])
            .withMessage('Invalid ticket type open_sales is paid and the comps is for free'),

        body('hidden')
            .optional()
            .isIn(['Y', 'N'])
            .withMessage('Invalid hidden type Y,N'),
    ],
    validate,
    ticketController.createTicket
);

// 🎟️ Update Ticket Route
router.put('/update/:id',
    authenticate,
    uploadFiles({ folder: 'uploads/tickets', type: 'single', fieldName: 'ticketImage' }),
    [
        param('id').isInt({ min: 1 }).withMessage('Valid Ticket ID is required'),

        body('title')
            .optional()
            .isLength({ min: 3 }).withMessage('Ticket title must be at least 3 characters long'),

        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Ticket price must be a valid number'),

        body('count')
            .optional()
            .isInt({ min: 1 }).withMessage('Ticket count must be at least 1'),

        body('hidden')
            .optional()
            .isIn(['Y', 'N'])
            .withMessage('Invalid hidden type Y,N'),

        body('type')
            .optional()
            .isIn(['open_sales', 'comps','committee_sales'])
            .withMessage('Invalid ticket type open_sales is paid and the comps is for free'),

    ],
    validate,
    ticketController.updateTicket
);

// 🎟️ Delete Ticket Route
router.delete('/delete/:id',
    authenticate,
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Ticket ID is required'),
    ],
    validate,
    ticketController.deleteTicket // 👈 You’ll implement this in your controller
);

// 🎟️ Set Ticket Pricing Route
router.post('/ticket-pricing/set',
    authenticate,
    [
        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt({ min: 1 }).withMessage('Event ID must be a valid number'),

        body('ticket_type_id')
            .notEmpty().withMessage('Ticket Type ID is required')
            .isInt({ min: 1 }).withMessage('Ticket Type ID must be a valid number'),

        body('event_slot_id')
            .optional()
            .isInt({ min: 1 }).withMessage('Event Slot ID must be a valid number'),

        body('price')
            .notEmpty().withMessage('Price is required')
            .isFloat({ min: 0 }).withMessage('Price must be a valid number'),

        body('date')
            .optional()
            .isISO8601().withMessage('Date must be a valid date format (YYYY-MM-DD)')
    ],
    validate,
    ticketController.setTicketPricing
);

router.get('/ticket-pricing/:event_id',
    authenticate,
    [
        param('event_id')
            .isInt({ min: 1 })
            .withMessage('Valid Event ID is required'),
    ],
    validate,
    ticketController.getTicketPricing
);

module.exports = router;

