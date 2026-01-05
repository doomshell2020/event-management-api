const express = require('express');
const router = express.Router();
const customerController = require('./customer.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, customerController.getCustomersList)

// event Organizer Status
router.put(
    '/update-status/:id',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Wellness ID is required'),
        body('status')
            .notEmpty()
            .withMessage('Status is required')
            .isIn(['Y', 'N'])
            .withMessage('Status must be Y or N'),
    ],
    validate,
    customerController.updateStatusCustomer
);

router.post(
  "/resend-verification-email",
  customerController.resendVerificationEmail
);




module.exports = router;