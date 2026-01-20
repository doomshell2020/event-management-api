const express = require('express');
const router = express.Router();
const couponController = require('./coupons.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// CREATE ORDER
router.post(
    "/create",
    authenticate,
    [
        body("event_id").notEmpty().withMessage("event_id is required"),
        body("couponPrefix").notEmpty().withMessage("couponPrefix is required"),
        body("couponCount")
            .notEmpty()
            .isInt({ min: 1 })
            .withMessage("couponCount must be greater than 0"),
        body("discountType")
            .isIn(["percentage", "fixed_amount"])
            .withMessage("Invalid discount type"),
        body("discountValue")
            .notEmpty()
            .isNumeric()
            .withMessage("discountValue must be numeric"),
        body("applicableFor")
            .isIn(["ticket", "addon", "appointment", "all",'committesale','package','ticket_price'])
            .withMessage("Invalid applicableFor value"),
        body("validityPeriod")
            .isIn(["unlimited", "specified_date"])
            .withMessage("Invalid validityPeriod"),
    ],
    validate,
    couponController.CouponCodeCreation
);



router.get(
    "/event/:event_id",
    authenticate,
    couponController.getPromotionCodesByEvent
);

router.get(
    "/check-eligibility/:eventId",
    authenticate,
    couponController.isCouponAppointmentEligible
);



module.exports = router;
