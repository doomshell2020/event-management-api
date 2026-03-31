const express = require('express');
const router = express.Router();
const scanTicketsController = require('./scan-tickets.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// CREATE ORDER
router.post('/',
    // authenticate,
    // [
    //     body('event_id').notEmpty().withMessage('event_id is required'),
    //     body('total_amount').notEmpty().withMessage('total_amount is required'),
    //     body('payment_method').notEmpty().withMessage('payment_method is required').isIn(['Online', 'Cash']).withMessage('Invalid payment method'),
    //     body('discount_code')
    //         .optional()
    //         .isString()
    //         .withMessage('discount_code must be string'),
    // ],
    // validate,
    scanTicketsController.scanTickets
);


module.exports = router;
