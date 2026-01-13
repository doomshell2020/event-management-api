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

router.get(
    '/search',
    [
        param('firstName').optional().isString(),
        param('email').optional().isString(),
        param('fromDate').optional().isDate(),
        param('toDate').optional().isDate(),
    ],
    validate,
    customerController.searchCustomers
);

// search first-name
router.get(
    '/first-name/search',
    customerController.getCustomersFirstName
);

router.get(
    '/email/search',
    customerController.getCustomersEmail
);

module.exports = router;