<<<<<<< HEAD
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

=======
const express = require("express");
const router = express.Router();
const cartController = require("./cart.controller");
const { body, param, query } = require("express-validator");
const authenticate = require("../../../middlewares/auth.middleware");
const validate = require("../../../middlewares/validation.middleware");

// ADD ITEM TO CART
router.post("/add",
    authenticate,
    [
        body("event_id")
            .notEmpty().withMessage("Event ID is required")
            .isInt().withMessage("Event ID must be an integer"),

        // UNIVERSAL CHECK
        body("item_type")
            .notEmpty().withMessage("Item type is required")
            .isIn([
                "ticket",
                "addon",
                "package",
                "appointment",
                "committesale",
                "opensale",
                "ticket_price"
            ])
            .withMessage("Invalid item type"),

        body("count")
            .notEmpty().withMessage("Count is required")
            .isInt({ min: 1 }).withMessage("Count must be minimum 1"),

        // --------------------------
        // CONDITIONAL VALIDATIONS
        // --------------------------

        // TICKET
        body("ticket_id")
            .if(body("item_type").equals("ticket"))
            .notEmpty().withMessage("ticket_id is required for ticket type")
            .isInt().withMessage("ticket_id must be an integer"),

        // ADDON
        body("addons_id")
            .if(body("item_type").equals("addon"))
            .notEmpty().withMessage("addons_id is required for addon type")
            .isInt().withMessage("addons_id must be an integer"),

        // PACKAGE
        body("package_id")
            .if(body("item_type").equals("package"))
            .notEmpty().withMessage("package_id is required for package type")
            .isInt().withMessage("package_id must be an integer"),

        // APPOINTMENT
        body("appointment_id")
            .if(body("item_type").equals("appointment"))
            .notEmpty().withMessage("appointment_id is required for appointment type")
            .isInt().withMessage("appointment_id must be an integer"),

        // COMMITTE SALE → ticket OR addon
        body().custom((value) => {
            if (value.item_type == "committesale") {
                if (!value.ticket_id && !value.addons_id) {
                    throw new Error("ticket_id or addons_id required for committesale");
                }
            }
            return true;
        }),

        // OPEN SALE → ticket OR addon
        body().custom((value) => {
            if (value.item_type == "opensale") {
                if (!value.ticket_id && !value.addons_id) {
                    throw new Error("ticket_id or addons_id required for opensale");
                }
            }
            return true;
        }),

        // ⭐ TICKET PRICE AS SEPARATE TYPE
        body("ticket_price_id")
            .if(body("item_type").equals("ticket_price"))
            .notEmpty().withMessage("ticket_price_id is required for ticket_price type")
            .isInt().withMessage("ticket_price_id must be an integer"),
    ],
    validate,
    cartController.addToCart
);

// INCREASE ITEM COUNT
router.put("/increase/:cart_id",
    authenticate,
    [
        param("cart_id")
            .notEmpty()
            .isInt()
            .withMessage("Valid Cart ID is required"),
    ],
    validate,
    cartController.increaseItem
);

// DECREASE ITEM COUNT
router.put("/decrease/:cart_id",
    authenticate,
    [
        param("cart_id")
            .notEmpty()
            .isInt()
            .withMessage("Valid Cart ID is required"),
    ],
    validate,
    cartController.decreaseItem
);

// REMOVE ITEM
router.delete("/remove/:cart_id",
    authenticate,
    [
        param("cart_id")
            .notEmpty()
            .isInt()
            .withMessage("Valid Cart ID is required"),
    ],
    validate,
    cartController.removeItem
);

// GET CART LIST
router.get("/list",
    authenticate,
    [
        query("event_id").optional().isInt().withMessage("Event ID must be valid"),
        query("item_type")
            .optional()
            .isIn(["ticket", "addon", "package"])
            .withMessage("Invalid item type"),
    ],
    validate,
    cartController.getCart
);

// CLEAR CART
router.delete("/clear", authenticate, validate, cartController.clearCart);

// ⭐ OPTIONAL → GET CART COUNT
router.get("/count", authenticate, cartController.getCartCount);

module.exports = router;
>>>>>>> d752298c8b012986d29f1b11791218ddc1c9c5b2
