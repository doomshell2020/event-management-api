const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');


// // GET ORDER DETAILS
router.get('/event/:event_id',
    // authenticate,
    [
        param('event_id')
            .notEmpty()
            .withMessage('event_id is required')
            .isInt()
            .withMessage('event_id must be a number'),
    ],
    validate,
    dashboardController.getEventDetails
);

router.get('/organizer/event/:event_id',
    authenticate,
    [
        param('event_id')
            .notEmpty()
            .withMessage('event_id is required')
            .isInt()
            .withMessage('event_id must be a number'),
    ],
    validate,
    dashboardController.getOrganizerEventDashboardByEventId
);

router.get('/organizer',
    authenticate,
    dashboardController.getOrganizersEvent
);


router.get('/organizer/all-events',
    authenticate,
    dashboardController.OrganizersAllEvents
);



module.exports = router;
