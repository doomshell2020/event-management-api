const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');

// ------------------- CREATE PAYMENT INTENT -------------------
router.post(
    "/create-payment-intent",
    [
        body("user_id").notEmpty().withMessage("User ID required"),
        body("event_id").notEmpty().withMessage("Event ID required"),
        body("total_amount").notEmpty().withMessage("Amount required"),
        body("currency").notEmpty().withMessage("Currency required"),
    ],
    validate,
    paymentController.createPaymentIntent
);

// ------------------- STRIPE WEBHOOK -------------------
router.post(
    "/webhook",
    express.raw({ type: "application/json" }), 
    paymentController.stripeWebhook
);

module.exports = router;
