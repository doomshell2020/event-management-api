const express = require('express');
const router = express.Router();
const payoutsController = require('./payouts.controller');
const { body, query } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


/* ==============   CREATE PAYOUT (Admin → Organizer)   =================== */
router.post('/create',
    authenticate,
    [
        body('user_id')
            .notEmpty()
            .isInt()
            .withMessage('User ID is required'),

        body('event_id')
            .notEmpty()
            .isInt()
            .withMessage('Event ID is required'),

        body('paid_amount')
            .notEmpty()
            .isFloat({ gt: 0 })
            .withMessage('Paid amount must be greater than 0'),

        body('txn_ref')
            .notEmpty()
            .trim()
            .withMessage('Transaction reference is required'),

        body('remarks')
            .optional()
            .trim(),

        body('created_by')
            .notEmpty()
            .withMessage('Created by is required')
    ],
    validate,
    payoutsController.createPayout
);

/* ==========   LIST PAYOUTS (Admin)   ================ */
router.get('/list',authenticate,
    [
        query('event_id').optional().isInt(),
        query('user_id').optional().isInt(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601()
    ],
    validate,
    payoutsController.listPayouts
);

module.exports = router;