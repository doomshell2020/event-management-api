const express = require('express');
const router = express.Router();
const eventOrganizerController = require('./eventOrganizer.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');
const uploadFiles = require('../../../../middlewares/upload.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, eventOrganizerController.getEventOrganizerList)

// CREATE EVENT ORGANIZER
router.post(
    '/',
    authenticate,
    [
        body('first_name')
            .notEmpty().withMessage('First name is required')
            .isLength({ min: 2 }).withMessage('First name must be at least 2 characters long'),

        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please enter a valid email address'),

        body('mobile')
            .notEmpty().withMessage('Mobile number is required')
            .isLength({ min: 10, max: 15 }).withMessage('Mobile number must be between 10 and 15 digits')
    ],
    validate,
    eventOrganizerController.createEventOrganizer
);

// Update 
router.put(
    '/:id',
    authenticate,
    [
        body('first_name')
            .notEmpty().withMessage('First name is required')
            .isLength({ min: 2 }).withMessage('First name must be at least 2 characters long'),

        body('email')
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please enter a valid email address'),

        body('mobile')
            .notEmpty().withMessage('Mobile number is required')
            .isLength({ min: 10, max: 15 }).withMessage('Mobile number must be between 10 and 15 digits'),

        body('auto_approve_events')
            .notEmpty().withMessage('Auto Approve Events field is required')
            .isIn(['Y', 'N']).withMessage('Auto Approve Events must be Y or N'),

        body('platform_fee')
            .notEmpty().withMessage('Platform Fee is required')
            .isFloat({ min: 0 }).withMessage('Platform Fee must be a positive number')
    ],
    validate,
    eventOrganizerController.updateEventOrganizer
);

// event Organizer Status
router.put(
    '/update-status/:id',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Wellness ID is required'),
        body('status')
            .notEmpty()
            .withMessage('Status is required')
            .isIn(['Y', 'N'])
            .withMessage('Status must be Y or N'),
    ],
    validate,
    eventOrganizerController.updateStatusEventOrganizer
);


router.get(
    '/search',
    [
        param('first_name').optional().isString(),
        param('email').optional().isString(),
        param('mobile').optional().isString(),
        param('status').optional().isIn(['Y', 'N']),
    ],
    validate,
    eventOrganizerController.searchEventOrganizer
);
// get Event Organizer..
router.get('/:id', eventOrganizerController.getEventOrganizerById);

// router.get(
//     '/search',
//     [
//         param('first_name').optional().isString(),
//         param('email').optional().isString(),
//     ],
//     validate,
//     eventOrganizerController.searchEventOrganizer
// );

module.exports = router;