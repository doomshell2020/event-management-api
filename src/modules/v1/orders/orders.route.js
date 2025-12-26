const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// CREATE ORDER
router.post('/create',
    authenticate,
    [
        body('event_id').notEmpty().withMessage('event_id is required'),
        body('total_amount').notEmpty().withMessage('total_amount is required'),
        body('payment_method').notEmpty().withMessage('payment_method is required').isIn(['Online', 'Cash']).withMessage('Invalid payment method'),
        body('discount_code')
            .optional()
            .isString()
            .withMessage('discount_code must be string'),
    ],
    validate,
    ordersController.createOrder
);

// // GET ORDER DETAILS
router.get('/details/:order_id',
    authenticate,
    [
        param('order_id')
            .notEmpty()
            .withMessage('order_id is required')
            .isInt()
            .withMessage('order_id must be a number'),
    ],
    validate,
    ordersController.getOrderDetails
);

// // LIST ALL ORDERS FOR LOGGED-IN USER
router.get('/',
    authenticate,
    [
        query('page').optional().isInt().withMessage('page must be number'),
        query('limit').optional().isInt().withMessage('limit must be number'),
    ],
    validate,
    ordersController.listOrders
);

// // LIST ALL ORDERS FOR EVENT ORGANIZER
router.get('/organizer',
    authenticate,
    [
        query('page').optional().isInt().withMessage('page must be number'),
        query('limit').optional().isInt().withMessage('limit must be number'),
    ],
    validate,
    ordersController.organizerOrderList
);

router.get('/organizer/ticket-exports',
    authenticate,
    [
        query('eventId').notEmpty().withMessage('eventId is required'),
        query('page').optional().isInt().withMessage('page must be number'),
        query('limit').optional().isInt().withMessage('limit must be number'),
    ],
    validate,
    ordersController.organizerTicketExports
);

// create appointment order.. new kamal
router.post('/create-appointment',
    authenticate,
    [
        body('event_id').notEmpty().withMessage('event_id is required'),
        body('total_amount').notEmpty().withMessage('total_amount is required'),
        body('payment_method').notEmpty().withMessage('payment_method is required').isIn(['Online', 'Cash']).withMessage('Invalid payment method'),
        body('discount_code')
            .optional()
            .isString()
            .withMessage('discount_code must be string'),
    ],
    validate,
    ordersController.createAppointmentOrder
);

// ... appointment cancel
router.put(
    '/cancel-appointment/:id',
    // authenticate,
    // [
    //     body('order_id')
    //         .notEmpty().withMessage('Wellness ID is required')
    //         .isInt().withMessage('Wellness ID must be a valid number'),
    // ],
    // validate,
    ordersController.cancelAppointment
);

// routes/sales.routes.js
router.get('/event-sales-summary',
    authenticate,
    [
        query('event_id').notEmpty().withMessage('event_id is required'),
    ],
    validate,
    ordersController.eventSalesAnalytics
);

router.get("/event-dashboard-analytics",
    authenticate,
    [
        query("event_id").notEmpty().withMessage("event_id is required")
    ],
    validate,
    ordersController.eventDashboardAnalytics
);



module.exports = router;
