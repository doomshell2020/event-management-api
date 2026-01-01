const express = require('express');
const router = express.Router();
const eventController = require('./events.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const uploadFiles = require('../../../middlewares/upload.middleware');
// const Event = require('../../../models/event.model');
const { Event } = require('../../../models');

// ✅ Create Event Route
router.post('/create',
    authenticate,
    uploadFiles({ folder: 'uploads/events', type: 'single', fieldName: 'feat_image' }),
    [
        body('name')
            .notEmpty().withMessage('Event name is required')
            .isLength({ min: 8 }).withMessage('Event name must be at least 8 characters long'),

        body('desp')
            .notEmpty().withMessage('Description is required'),

        body('date_from')
            .notEmpty().withMessage('Start date & time is required')
            .isISO8601({ strict: false }).withMessage('Start date must be valid ISO date'),

        body('date_to')
            .notEmpty().withMessage('End date & time is required')
            .isISO8601({ strict: false }).withMessage('End date must be valid ISO date'),

        body('location')
            .notEmpty().withMessage('Location is required'),

        body('company_id')
            .notEmpty().withMessage('Company ID is required')
            .isInt().withMessage('Company ID must be a number'),

        body('country_id')
            .notEmpty().withMessage('Country ID is required')
            .isInt().withMessage('Country ID must be a number'),

        body('slug')
            .notEmpty().withMessage('Slug is required')
            .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),

        body('event_timezone')
            .notEmpty()
            .isLength({ min: 2 })
            .withMessage('Event event_timezone is required'),

        body('entry_type')
            .notEmpty()
            .isIn(['single', 'multi', 'slot', 'event'])
            .withMessage('Event entry_type must be one of: single, multi, slot, event'),

        // ✅ Make feat_image required
        body('feat_image').custom((value, { req }) => {
            if (!req.file) {
                throw new Error('Event image (feat_image) is required');
            }
            return true;
        }),

        // ✅ Conditional validation for non-free events
        body('ticket_limit')
            .notEmpty().withMessage('Ticket limit is required for paid events')
            .isInt({ min: 1 }).withMessage('Ticket limit must be at least 1'),

        body('payment_currency')
            .notEmpty().withMessage('Payment currency is required for paid events'),

        body('sale_start')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Sale start date is required for paid events')
            .isISO8601({ strict: false }).withMessage('Sale start must be valid ISO date'),

        body('sale_end')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Sale end date is required for paid events')
            .isISO8601({ strict: false }).withMessage('Sale end must be valid ISO date')
    ],
    validate,
    eventController.createEvent
);

// ✅ Update Event Route
router.put('/update/:id',
    authenticate,
    uploadFiles({ folder: 'uploads/events', type: 'single', fieldName: 'feat_image' }),
    [
        body('name')
            .optional()
            .isLength({ min: 8 }).withMessage('Event name must be at least 8 characters long'),

        body('desp')
            .optional(),

        body('date_from')
            .optional()
            .isISO8601({ strict: false }).withMessage('Start date must be valid ISO date'),

        body('date_to')
            .optional()
            .isISO8601({ strict: false }).withMessage('End date must be valid ISO date'),

        body('location')
            .optional(),

        body('company_id')
            .optional()
            .isInt().withMessage('Company ID must be a number'),

        body('country_id')
            .optional()
            .isInt().withMessage('Country ID must be a number'),

        body('slug')
            .notEmpty().withMessage('Slug is required')
            .isLength({ max: 100 }).withMessage('Slug must not exceed 100 characters')
            .matches(/^[a-z0-9-]+$/).withMessage(
                'Slug must contain only lowercase letters, numbers, and hyphens'
            ),

        // Conditional validation for non-free events
        body('ticket_limit')
            .if(body('is_free').not().equals('Y'))
            .optional()
            .isInt({ min: 1 }).withMessage('Ticket limit must be at least 1'),

        body('payment_currency')
            .if(body('is_free').not().equals('Y'))
            .optional(),

        body('sale_start')
            .if(body('is_free').not().equals('Y'))
            .optional()
            .isISO8601({ strict: false }).withMessage('Sale start must be valid ISO date'),

        body('sale_end')
            .if(body('is_free').not().equals('Y'))
            .optional()
            .isISO8601({ strict: false }).withMessage('Sale end must be valid ISO date'),
    ],
    validate,
    eventController.updateEvent
);

router.post('/create-slot',
    authenticate,
    [
        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),
        body('slots').notEmpty().withMessage('Slot data is required'),
    ],
    validate,
    eventController.createSlot
);

// Get Slots for an Event
router.get('/:event_id/slots',
    authenticate,
    [
        param('event_id')
            .notEmpty()
            .withMessage('Event ID is required')
            .isInt()
            .withMessage('Event ID must be numeric')
    ],
    validate,
    eventController.getEventSlots
);


// ✅ 3️⃣ Delete a Single Slot by ID
router.delete('/:event_id/slots/:slot_id',
    authenticate,
    [
        param('slot_id')
            .notEmpty().withMessage('Slot ID is required')
            .isInt().withMessage('Slot ID must be numeric'),
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be numeric'),
    ],
    validate,
    eventController.deleteSlotById
);

// // ✅ 4️⃣ Delete All Slots for an Event on a Specific Date
router.delete('/:event_id/slots-by-date',
    authenticate,
    [
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be numeric'),
        query('date')
            .notEmpty().withMessage('Date (YYYY-MM-DD) is required')
            .isISO8601().withMessage('Invalid date format'),
    ],
    validate,
    eventController.deleteSlotsByDate
);


router.post('/event-list',
    authenticate,
    [
        body('search')
            .optional()
            .isLength({ min: 2 }).withMessage('Event name must be at least 2 characters long'),
        body('status')
            .optional()
            .isIn(['Y', 'N'])
            .withMessage('Status must be either Y or N'),
    ],
    validate,
    eventController.eventList
);

// ✅ 2️⃣ Get All Slots for an Event
router.get('/event-details/:event_id',
    authenticate,
    [
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be numeric'),
    ],
    validate,
    eventController.getEventDetails
);

// ✅ 2️⃣ Get All Slots for an Event
router.get('/public-event-detail/:event_id',
    [
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be numeric'),
    ],
    validate,
    eventController.getEventDetails
);

router.delete('/delete/:id', authenticate,
    [
        param('id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),

    ],
    validate,
    eventController.deleteEvent
)


// ✅ 2️⃣ Get All Appointments Slots for an Event - kamal
router.get('/:event_id/appointments',
    [
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be numeric'),
    ],
    validate,
    eventController.getEventAppointmentsDetails
);

// ...Get all Slots with appointments ids - kamal(12-12-2025)
router.post('/:event_id/wellness-appointments',
    [
        param('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be numeric'),
        body('slotIds')
            .isArray({ min: 1 }).withMessage('slotIds must be a non-empty array'),
        body('slotIds.*')
            .isInt().withMessage('Each slotId must be numeric')
    ],
    validate,
    eventController.getSelectedWellnessSlots
);






module.exports = router;