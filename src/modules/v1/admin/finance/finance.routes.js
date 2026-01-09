const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');



// ✅ Get Event Organizer Route
router.get('/event-details', financeController.getEventDetails)

router.get(
  '/sales/monthly/:eventId',
  [
    param('eventId').isInt({ min: 1 }).withMessage('Valid Event ID required'),
  ],
  validate,
  financeController.eventSalesMonthlyReport
);


router.get('/sales-ticket-types/:event_id', financeController.getEventSalesTypes)


// // event Organizer Status
// router.put(
//     '/update-status/:id',
//     [
//         param('id')
//             .isInt({ min: 1 })
//             .withMessage('Valid Wellness ID is required'),
//         body('status')
//             .notEmpty()
//             .withMessage('Status is required')
//             .isIn(['Y', 'N'])
//             .withMessage('Status must be Y or N'),
//     ],
//     validate,
//     financeController.updateStatusEvent
// );


// // Update event featured status
// router.put(
//     '/:id/featured',
//     [
//         param('id')
//             .isInt({ min: 1 })
//             .withMessage('Valid Event ID is required'),
//         body('featured')
//             .notEmpty()
//             .withMessage('Featured status is required')
//             .isIn(['Y', 'N'])
//             .withMessage('Featured status must be Y or N'),
//     ],
//     validate,
//     financeController.updateEventFeatured
// );


// // 🎟️ Delete Event Route
// router.delete(
//     '/:id',
//     [
//         // Validate Event ID
//         param('id')
//             .isInt({ min: 1 })
//             .withMessage('Valid Event ID is required'),
//     ],
//     validate,
//     financeController.deleteEvent
// );




// // search event details
// router.get(
//     '/search',
//     // authenticate, // optional
//     [
//         param('eventName').optional().isString(),
//         param('organizer').optional().isString(),
//         param('fromDate').optional().isDate(),
//         param('toDate').optional().isDate(),
//     ],
//     validate,
//     financeController.searchEventList
// );

// // get staff in event
// router.get(
//     '/:eventId/staff',
//     // authenticate,
//     [
//         param('eventId')
//             .isInt({ min: 1 })
//             .withMessage('Valid Event ID is required'),
//     ],
//     validate,
//     financeController.getEventStaff
// );


// // get Event Organizer..
// router.get('/:id',financeController.getEventOrganizerById);

// // event details with order details
// router.get(
//     "/:id/details",
//     financeController.getEventDetailsWithOrderDetails
// );

// router.get(
//     '/search/search',
//     financeController.getEventByName
// );


module.exports = router;