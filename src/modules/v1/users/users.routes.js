const express = require('express');
const router = express.Router();
const userController = require('./users.controller');
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validation.middleware');
const { body,param } = require('express-validator');

/**
 * 🔍 Search Users (name / email / mobile)
 * GET /api/users/search?q=rahul
 */
router.get('/search',
    authenticate,
    userController.searchUsers
);

router.post('/add-staff',
    authenticate,
    [
        body('first_name')
            .notEmpty()
            .withMessage('First name is required'),

        body('last_name')
            .notEmpty()
            .withMessage('Last name is required'),

        body('email')
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email format'),

        body('mobile')
            .notEmpty()
            .withMessage('Mobile number is required')
            .isLength({ min: 8 })
            .withMessage('Mobile number is invalid'),

        body('event_ids')
            .isArray({ min: 1 })
            .withMessage('event_ids must be a non-empty array')
    ],
    validate,
    userController.addStaff
);

router.get('/staff',
    authenticate,
    userController.listStaff
);

router.put('/staff/:id',
    authenticate,
    [
        param('id')
            .isInt()
            .withMessage('Invalid staff id'),

        body('first_name')
            .optional()
            .notEmpty()
            .withMessage('First name cannot be empty'),

        body('last_name')
            .optional()
            .notEmpty()
            .withMessage('Last name cannot be empty'),

        body('password')
            .optional()
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),

        body('status')
            .optional()
            .isIn(['Y', 'N'])
            .withMessage('Status must be Y or N'),

        body('eventId')
            .optional()
            .isArray()
            .withMessage('eventId must be an array')
    ],
    validate,
    userController.editStaff
);

module.exports = router;
