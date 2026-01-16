const express = require('express');
const router = express.Router();
const eventController = require('./event.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');
const uploadFiles = require('../../../../middlewares/upload.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, eventController.getEventList)

// event Organizer Status
router.put('/update-status/:id',
    authenticate,
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Wellness ID is required'),
        body('status')
            .notEmpty()
            .withMessage('Status is required')
            .isIn(['Y', 'N'])
            .withMessage('Status must be Y or N'),
        body('activation_date')
            .optional()
            .isISO8601()
            .withMessage('Activation date must be a valid date'),
        body('activation_amount')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Activation amount must be a valid number'),
        body('activation_remarks')
            .optional()
            .isString()
            .withMessage('Activation remarks must be a string'),
    ],
    validate,
    eventController.updateStatusEvent
);

// Update event featured status
router.put('/:id/featured',
    authenticate,
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Event ID is required'),
        body('featured')
            .notEmpty()
            .withMessage('Featured status is required')
            .isIn(['Y', 'N'])
            .withMessage('Featured status must be Y or N'),
    ],
    validate,
    eventController.updateEventFeatured
);

// 🎟️ Delete Event Route
router.delete('/:id',
    authenticate,
    [
        // Validate Event ID
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Event ID is required'),
    ],
    validate,
    eventController.deleteEvent
);

router.get('/:id/ticket-types', eventController.getTicketTypesByEvent)

// search event details
router.get('/search',
    // authenticate, // optional
    [
        param('eventName').optional().isString(),
        param('organizer').optional().isString(),
        param('fromDate').optional().isDate(),
        param('toDate').optional().isDate(),
    ],
    validate,
    eventController.searchEventList
);

router.get("/staff-search",
    [
        param("event_id").optional().isString(),
        param("first_name").optional().isString(),
        param("email").optional().isString(),
    ],
    validate,
    eventController.searchEventStaff
);

// get staff in event
router.get('/:eventId/staff',
    // authenticate,
    [
        param('eventId')
            .isInt({ min: 1 })
            .withMessage('Valid Event ID is required'),
    ],
    validate,
    eventController.getEventStaff
);

// get Event Organizer..
router.get('/:id', eventController.getEventOrganizerById);

// event details with order details
router.get("/:id/details",
    eventController.getEventDetailsWithOrderDetails
);

router.get('/event-details/:event_id',
    eventController.getEventById
);

router.get('/search/search',
    eventController.getEventByName
);

module.exports = router;