const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');

// ------------------- CREATE PAYMENT INTENT -------------------
router.post(
    "/create-payment-intent",
    [
        // REQUIRED
        body("user_id")
            .notEmpty()
            .withMessage("User ID is required"),

        body("event_id")
            .notEmpty()
            .withMessage("Event ID is required"),

        body("sub_total")
            .notEmpty()
            .isFloat({ min: 0 })
            .withMessage("Sub total must be a valid number"),

        body("grand_total")
            .notEmpty()
            .isFloat({ min: 0 })
            .withMessage("Grand total must be a valid number"),

        body("cartData")
            .isArray({ min: 1 })
            .withMessage("Cart data must be a non-empty array"),

        body("currency")
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 3 })
            .withMessage("Currency must be a valid 3-letter code (e.g. usd)"),

        // OPTIONAL
        body("tax_total")
            .optional()
            .isFloat({ min: 0 })
            .withMessage("Tax total must be a positive number"),

        body("discount_amount")
            .optional()
            .isFloat({ min: 0 })
            .withMessage("Discount amount must be a positive number"),

        body("discount_code")
            .optional()
            .isString()
            .trim()
            .isLength({ min: 1 })
            .withMessage("Discount code must be a valid string"),
    ],
    validate,
    paymentController.createPaymentIntent
);


// ------------------- STRIPE WEBHOOK -------------------
router.post(
    "/webhook",
    paymentController.stripeWebhook
);


module.exports = router;
