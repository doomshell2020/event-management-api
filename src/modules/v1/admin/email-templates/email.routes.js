const express = require('express');
const router = express.Router();
const templateController = require('./email.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, templateController.getTemplatesList)

// CREATE STATIC PAGES
router.post(
    '/',
    authenticate,
    [
        body('title')
            .trim()
            .notEmpty()
            .withMessage('Title is required')
            .isLength({ min: 2 })
            .withMessage('Title must be at least 2 characters long'),

        body('subject')
            .trim()
            .notEmpty()
            .withMessage('Subject is required'),
        body('description')
            .trim()
            .notEmpty()
            .withMessage('Description is required')
            .isLength({ min: 10 })
            .withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    templateController.createTemplatesPage
);


router.put(
    '/:id',
    authenticate,
    [
        body('title')
            .trim()
            .notEmpty()
            .withMessage('Title is required')
            .isLength({ min: 2 })
            .withMessage('Title must be at least 2 characters long'),

        body('subject')
            .trim()
            .notEmpty()
            .withMessage('Subject is required'),

        body('description')
            .trim()
            .notEmpty()
            .withMessage('Description is required')
            .isLength({ min: 10 })
            .withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    templateController.updateTemplatesPage
);


router.get(
    '/:id/details',
    // authenticate,        // optional but recommended
    templateController.getTemplatesPageById
);



module.exports = router;