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
            .isLength({ max: 100 }).withMessage('Slug must not exceed 100 characters')
            .matches(/^[a-z0-9-]+$/).withMessage(
                'Slug must contain only lowercase letters, numbers, and hyphens'
            ),

        body('event_timezone')
            .optional()
            .isLength({ min: 2 }).withMessage('Event event_timezone is required'),

        body('entry_type')
            .notEmpty()
            .isIn(['single', 'multi', 'slot', 'event'])
            .withMessage('Event type must be one of: single, multi, slot,event'),

        // ✅ Make feat_image required
        body('feat_image').custom((value, { req }) => {
            if (!req.file) {
                throw new Error('Event image (feat_image) is required');
            }
            return true;
        }),

        // ✅ Conditional validation for non-free events
        body('ticket_limit')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Ticket limit is required for paid events')
            .isInt({ min: 1 }).withMessage('Ticket limit must be at least 1'),

        body('payment_currency')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Payment currency is required for paid events'),

        body('sale_start')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Sale start date is required for paid events')
            .isISO8601({ strict: false }).withMessage('Sale start must be valid ISO date'),

        body('sale_end')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Sale end date is required for paid events')
            .isISO8601({ strict: false }).withMessage('Sale end must be valid ISO date'),

        body('approve_timer')
            .if(body('is_free').not().equals('Y'))
            .notEmpty().withMessage('Approve timer is required for paid events'),
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
            .optional()
            .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),

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

        body('approve_timer')
            .if(body('is_free').not().equals('Y'))
            .optional(),
    ],
    validate,
    eventController.updateEvent
);

router.post('/company-create',
    authenticate,
    [
        body('companyName')
            .notEmpty().withMessage('Company name is required')
            .isLength({ min: 4 }).withMessage('Company name must be at least 4 characters long'),
    ],
    validate,
    eventController.companyCreateEvent
);

// company list api 
router.get('/company-list',
    authenticate,
    eventController.companyList
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
)

// ✅ Public Event List (No Authentication)
router.post('/public-event-list',
    [
        body('search')
            .optional()
            .isLength({ min: 2 }).withMessage('Search term must be at least 2 characters long'),

        body('status')
            .optional()
            .isIn(['Y', 'N'])
            .withMessage('Status must be either Y or N'),
    ],
    validate,
    eventController.publicEventList
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

// ✅ Public Event Full Details (Cart Page Access - No Auth Required)
router.get('/public-event-detail/:id',
    [
        param('id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Invalid Event ID'),
    ],
    validate,
    eventController.publicEventDetail
);

// Search Events (For Import Committee / Dropdown Search)
router.get('/search',
    authenticate,
    [
        query('keyword')
            .optional()
            .isLength({ min: 2 })
            .withMessage('Search query must be at least 2 characters long'),
    ],
    validate,
    eventController.searchEvents
);


module.exports = router;