const express = require('express');
const router = express.Router();
const packageController = require('./package.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// ✅ Create Package with Ticket & Addon selections
router.post(
    '/create',
    authenticate,
    [
        body('event_id')
            .notEmpty()
            .withMessage('Event ID is required')
            .isInt()
            .withMessage('Event ID must be an integer'),

        body('name')
            .notEmpty()
            .withMessage('Package name is required')
            .isLength({ min: 1 }),

        body('package_limit')
            .notEmpty()
            .withMessage('Package limit is required')
            .isInt({ min: 1 })
            .withMessage('Package limit must be a number'),

        body('discount_percentage')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Discount must be a valid number'),

        body('total')
            .notEmpty()
            .withMessage('Total is required')
            .isFloat({ min: 0 }),

        body('discount_amt')
            .optional()
            .isFloat({ min: 0 }),

        body('grandtotal')
            .optional()
            .isFloat({ min: 0 }),

        body('hidden')
            .notEmpty()
            .isIn(['Y', 'N'])
            .withMessage('Hidden must be either Y or N'),

        // ✅ Validate ticketType array with count
        body('ticketType')
            .isArray({ min: 1 })
            .withMessage('Ticket type must be an array and cannot be empty'),

        body('ticketType.*.id')
            .notEmpty()
            .withMessage('Ticket ID is required for each ticket')
            .isInt()
            .withMessage('Ticket ID must be an integer'),

        body('ticketType.*.type')
            .notEmpty()
            .withMessage('Type (ticket/addon) is required for each entry')
            .isIn(['ticket', 'addon'])
            .withMessage('Type must be either ticket or addon'),

        body('ticketType.*.count')
            .notEmpty()
            .withMessage('Count is required for each ticket/addon')
            .isInt({ min: 1 })
            .withMessage('Count must be a positive integer'),
    ],
    validate,
    packageController.createPackage
);

// ✅ Update Package (name, hidden, limit — any or all)
router.put(
    '/update/:id',
    authenticate,
    [
        param('id')
            .notEmpty()
            .isInt()
            .withMessage('Valid Package ID is required'),

        // ✅ Only validate if 'name' is provided
        body('name')
            .optional({ nullable: true })
            .custom((value) => {
                if (value !== undefined && value.trim() === '') {
                    throw new Error('Package name cannot be empty');
                }
                return true;
            }),

        // ✅ Validate 'hidden' only if provided
        body('hidden')
            .optional({ nullable: true })
            .isIn(['Y', 'N'])
            .withMessage('Hidden must be either Y or N'),

        // ✅ Validate 'package_limit' only if provided
        body('package_limit')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Package limit must be a positive integer'),
    ],
    validate,
    packageController.updatePackage
);

module.exports = router;
