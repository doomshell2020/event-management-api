const express = require('express');
const router = express.Router();
const ticketController = require('./tickets.controller');
const { body, param, check } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const uploadFiles = require('../../../middlewares/upload.middleware');

router.post('/generate',
    authenticate,
    [
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

        body('ticket_id')
            .notEmpty().withMessage('Ticket ID is required')
            .isInt().withMessage('Ticket ID must be a number'),

        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),
    ],
    validate,
    ticketController.generateTicket
);

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
            .isInt({ min: 1 }).withMessage('Ticket count must be at least 1')
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
router.get("/list/:event_id", authenticate, ticketController.listTicketsByEvent);

/* ✅ 2. Print / fetch generated complimentary tickets (by ticket + event) */
router.get("/print/:ticket_id",
    authenticate,
    ticketController.printCompsTickets
);

router.post("/import-comps",
    authenticate,
    uploadFiles({
        folder: 'uploads/temp',
        type: 'single',
        fieldName: 'uploadFiles'
    }),
    [
        check('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number')
            .toInt()
    ],
    validate,
    ticketController.importCompsTickets
);

router.get("/generated-users/:event_id",
    authenticate,
    [
        check('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number')
            .toInt()
    ],
    validate,
    ticketController.getGeneratedUsers
);

router.post("/generate-single-comps",
    authenticate,
    [
        check("event_id").isInt(),
        check("user_id").isInt()
    ],
    validate,
    ticketController.generateSingleCompsTicket
);

router.delete("/delete-generated-comps/:order_item_id",
    authenticate,
    [
        check("order_item_id")
            .notEmpty().withMessage("Order item ID is required")
            .isInt().withMessage("Order item ID must be a number")
            .toInt()
    ],
    validate,
    ticketController.deleteGeneratedCompsTicket
);

//Get single ticket detail by ID
router.get("/detail/:ticket_id", authenticate, ticketController.getTicketDetail);

module.exports = router;

