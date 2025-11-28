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

        body('type')
            .notEmpty().withMessage('Ticket type is required')
            .isIn(['open_sales', 'committee_sales', 'comps'])
            .withMessage('Invalid ticket type'),

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

        // body('sale_start')
        //     .optional()
        //     .isISO8601().withMessage('Sale start date must be a valid ISO date'),

        // body('sale_end')
        //     .optional()
        //     .isISO8601().withMessage('Sale end date must be a valid ISO date')
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

        body('type')
            .optional()
            .isIn(['open_sales', 'committee_sales', 'comps'])
            .withMessage('Invalid ticket type'),

        body('title')
            .optional()
            .isLength({ min: 3 }).withMessage('Ticket title must be at least 3 characters long'),

        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Ticket price must be a valid number'),

        body('count')
            .optional()
            .isInt({ min: 1 }).withMessage('Ticket count must be at least 1'),

        // body('sale_start')
        //     .optional()
        //     .isISO8601().withMessage('Sale start date must be a valid ISO date'),

        // body('sale_end')
        //     .optional()
        //     .isISO8601().withMessage('Sale end date must be a valid ISO date'),
    ],
    validate,
    ticketController.updateTicket
);

// 🎟️ Delete Ticket Route
router.delete('/delete/:id',
    authenticate, // ✅ Require authentication
    [
        // ✅ Validate Ticket ID
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Ticket ID is required'),
    ],
    validate,
    ticketController.deleteTicket // 👈 You’ll implement this in your controller
);

// ✅ 1. List all tickets for a given event
router.get("/list/:event_id", ticketController.listTicketsByEvent);

// ✅ 2. Get single ticket detail by ID
router.get("/detail/:ticket_id", ticketController.getTicketDetail);

module.exports = router;

