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
            .isLength({ min: 8, max: 15 }).withMessage('Mobile number must be valid')
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
            .isLength({ min: 8, max: 15 }).withMessage('Mobile number must be valid')
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
    ],
    validate,
    eventOrganizerController.searchEventOrganizer
);
// get Event Organizer..
router.get('/:id',eventOrganizerController.getEventOrganizerById);

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