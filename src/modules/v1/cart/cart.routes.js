const express = require('express');
const router = express.Router();
const cartController = require('./cart.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// 🎟️ Add to cart appointment Route
router.post(
    '/appointment/add',
    // authenticate,
    [
        // ✅ Required fields
        body('appointment_id')
            .notEmpty().withMessage('Appointment ID is required')
            .isInt().withMessage('Appointment ID must be a valid number'),
        // ✅ Required fields
        body('user_id')
            .notEmpty().withMessage('User ID is required')
            .isInt().withMessage('User ID must be a valid number'),
        // ✅ Required fields
        body('event_id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a valid number'),
    ],
    validate,
    cartController.addToCartAppointment
);
router.delete('/delete/:id',
    // authenticate, // ✅ Require authentication
    [param('id')
        .isInt({ min: 1 })
        .withMessage('Valid Cart ID is required'),
    ],
    validate,
    cartController.deleteCart // 👈 You’ll implement this in your controller
);

// get cart details
router.get('/:user_id',
    //  authenticate,
     cartController.getCartById);


// /cart/:user_id
// router.get('/wellness-list',
//     //  authenticate,
//       wellnessController.wellnessList);


// 🎟️ Update Ticket Route
// router.put(
//     '/update/:id',
//     authenticate,
//     uploadFiles({ folder: 'uploads/wellness', type: 'single', fieldName: 'wellnessImage' }),
//     [
//         param('id').isInt({ min: 1 }).withMessage('Valid Ticket ID is required'),
//         body('event_id')
//             .notEmpty().withMessage('Event ID is required')
//             .isInt().withMessage('Event ID must be a number'),
//         body('name')
//             .notEmpty().withMessage('wellness title is required')
//             .isLength({ min: 3 }).withMessage('wellness title must be at least 3 characters long'),
//         // 🟡 Optional fields (validate only if present)
//         body('description')
//             .optional()
//             .isLength({ min: 3 }).withMessage('wellness description must be at least 3 characters long'),
//         body('location')
//             .optional(),
//         body('currency')
//             .notEmpty().withMessage('currency is required')
//     ],
//     validate,
//     wellnessController.updateWellness
// );

// // 🎟️ Delete Wellness Route
// router.delete('/delete/:id',
//     // authenticate, // ✅ Require authentication
//     [
//         // ✅ Validate Ticket ID
//         param('id')
//             .isInt({ min: 1 })
//             .withMessage('Valid Wellness ID is required'),
//     ],
//     validate,
//     wellnessController.deleteWellness // 👈 You’ll implement this in your controller
// );

// // ...wellness slots Api Routes..


// router.get('/slot-list', 
//     // authenticate,
//      wellnessController.wellnessSlotsList);
// router.get('/slot-list/:id',
//     //  authenticate,
//       wellnessController.getWellnessSlotById);
// router.put(
//     '/update/wellness-slots/:id',
//     authenticate,
//     [
//         // ✅ Required fields
//         body('wellness_id')
//             .notEmpty().withMessage('Wellness ID is required')
//             .isInt().withMessage('Wellness ID must be a valid number'),

//         // ✅ date should be a date (YYYY-MM-DD)
//         body('date')
//             .notEmpty().withMessage('Date is required')
//             .isISO8601().withMessage('Date must be in valid YYYY-MM-DD format'),
//     ],
//     validate,
//     wellnessController.updateWellnessSlots
// );
// router.delete('/delete/wellness-slots/:id',
//     authenticate, // ✅ Require authentication
//     [
//         // ✅ Validate Ticket ID
//         param('id')
//             .isInt({ min: 1 })
//             .withMessage('Valid Wellness Slot ID is required'),
//     ],
//     validate,
//     wellnessController.deleteWellnessSlots // 👈 You’ll implement this in your controller
// );
// // ...
// router.post(
//     '/create-slots',
//     // authenticate,
//     uploadFiles({ folder: 'uploads/wellness', type: 'single', fieldName: 'wellnessImage' }),
//     [
//         // ✅ Required fields
//         body('event_id')
//             .notEmpty().withMessage('Event ID is required')
//             .isInt().withMessage('Event ID must be a number'),

//         body('name')
//             .notEmpty().withMessage('wellness title is required')
//             .isLength({ min: 3 }).withMessage('wellness title must be at least 3 characters long'),

//         // 🟡 Optional fields (validate only if present)
//         body('description')
//             .optional()
//             .isLength({ min: 3 }).withMessage('wellness description must be at least 3 characters long'),
//         body('location')
//             .optional(),

//         body('currency')
//             .notEmpty().withMessage('currency is required')
//     ],
//     validate,
//     wellnessController.createWellnessWithSlots
// );

// // ...new update wellness and wellness slot
// router.put(
//     '/update-wellness/:id',
//     // authenticate,
//     uploadFiles({ folder: 'uploads/wellness', type: 'single', fieldName: 'wellnessImage' }),
//     [
//         param('id').isInt({ min: 1 }).withMessage('Valid Ticket ID is required'),
//         body('event_id')
//             .notEmpty().withMessage('Event ID is required')
//             .isInt().withMessage('Event ID must be a number'),
//         body('name')
//             .notEmpty().withMessage('wellness title is required')
//             .isLength({ min: 3 }).withMessage('wellness title must be at least 3 characters long'),
//         // 🟡 Optional fields (validate only if present)
//         body('description')
//             .optional()
//             .isLength({ min: 3 }).withMessage('wellness description must be at least 3 characters long'),
//         body('location')
//             .optional(),
//         body('currency')
//             .notEmpty().withMessage('currency is required')
//     ],
//     validate,
//     wellnessController.updateWellnessWithSlots
// );



// router.post('/event-list',
//     // authenticate,
//     [
//         body('search')
//             .optional()
//             .isLength({ min: 2 }).withMessage('Event name must be at least 2 characters long'),
//         body('status')
//             .optional()
//             .isIn(['Y', 'N'])
//             .withMessage('Status must be either Y or N'),
//     ],
//     validate,
//     wellnessController.eventList
// )


module.exports = router;

