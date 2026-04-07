const express = require('express');
const router = express.Router();
const demoController = require('./demo.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');

/* LIST MEMBERS */
router.post('/',
[
    body('name')
        .notEmpty()
        .withMessage('Name is required'),

    body('email')
        .isEmail()
        .withMessage('Valid email is required'),

    body('mobile')
        .notEmpty()
        .withMessage('Mobile number is required'),

    body('country_code')
        .notEmpty()
        .withMessage('Country code is required'),

    body('description')
        .optional(),

    body('date')
        .optional()
        .isDate()
        .withMessage('Invalid date'),

    body('time')
        .optional()
],

validate,
demoController.addDemoRequest
);

module.exports = router;