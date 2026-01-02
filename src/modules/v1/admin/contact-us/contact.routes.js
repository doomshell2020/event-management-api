const express = require('express');
const router = express.Router();
const contactUsController = require('./contact.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');
// company list api 
router.get('/',
    // authenticate,
    contactUsController.contactUsList
);

router.post(
    '/',
    // authenticate,
    [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),

        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Please provide a valid email address'),

        body('event')
            .trim()
            .notEmpty().withMessage('Event is required')
            .isLength({ min: 2 }).withMessage('Event must be at least 2 characters long'),

        body('subject')
            .trim()
            .notEmpty().withMessage('Subject is required')
            .isLength({ min: 3 }).withMessage('Subject must be at least 3 characters long'),

        body('description')
            .trim()
            .notEmpty().withMessage('Description is required')
            .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    contactUsController.createContactUs
);




module.exports = router;