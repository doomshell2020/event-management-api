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
        // COMMITTEE MEMBER ID (required for committesale)

        // COMMITTE SALE → ticket OR addon
        body().custom((value) => {
            if (value.item_type === "committesale") {
                if (!value.ticket_id && !value.addons_id) {
                    throw new Error("ticket_id or addons_id required for committesale");
                }
            }
            return true;
        }),

        // 🔥 COMMITTEE MEMBER ID REQUIRED
        body("committee_member_id")
            .if(body("item_type").equals("committesale"))
            .notEmpty().withMessage("committee_member_id is required for committesale")
            .isInt().withMessage("committee_member_id must be an integer"),


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

// GET APPOINTMENT CART LIST
router.get("/appointment-list",
    authenticate,
    [
        query("event_id").optional().isInt().withMessage("Event ID must be valid"),
        query("item_type")
            .optional()
            .isIn(["ticket", "addon", "package"])
            .withMessage("Invalid item type"),
    ],
    validate,
    cartController.getAppointmentCart
);

// CLEAR CART
router.delete("/clear", authenticate, validate, cartController.clearCart);

// ⭐ OPTIONAL → GET CART COUNT
router.get("/count", authenticate, cartController.getCartCount);

module.exports = router;
