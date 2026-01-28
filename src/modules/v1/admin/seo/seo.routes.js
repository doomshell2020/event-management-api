const express = require('express');
const router = express.Router();
const seoController = require('./seo.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, seoController.getSeoList)

// CREATE STATIC PAGES
router.post(
    '/',
    authenticate,
    [
        body('page')
            .trim()
            .notEmpty()
            .withMessage('Page name is required')
            .isLength({ min: 2 })
            .withMessage('Page name must be at least 2 characters long'),

        body('title')
            .trim()
            .notEmpty()
            .withMessage('Title is required')
            .isLength({ min: 2 })
            .withMessage('Title must be at least 2 characters long'),

        body('location')
            .trim()
            .notEmpty()
            .withMessage('Location is required'),

        body('keyword')
            .trim()
            .notEmpty()
            .withMessage('Keywords are required'),

        body('description')
            .trim()
            .notEmpty()
            .withMessage('Description is required')
            .isLength({ min: 10 })
            .withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    seoController.createSeoPage
);


router.put(
    '/:id',
    authenticate,
    [
        body('page')
            .trim()
            .notEmpty()
            .withMessage('Page name is required')
            .isLength({ min: 2 })
            .withMessage('Page name must be at least 2 characters long'),

        body('title')
            .trim()
            .notEmpty()
            .withMessage('Title is required')
            .isLength({ min: 2 })
            .withMessage('Title must be at least 2 characters long'),

        body('location')
            .trim()
            .notEmpty()
            .withMessage('Location is required'),

        body('keyword')
            .trim()
            .notEmpty()
            .withMessage('Keywords are required'),

        body('description')
            .trim()
            .notEmpty()
            .withMessage('Description is required')
            .isLength({ min: 10 })
            .withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    seoController.updateSeoPage
);


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
    seoController.updateStatusSeo
);



router.get(
    '/:id/details',
    // authenticate,        // optional but recommended
    seoController.getSeoPageById
);



module.exports = router;