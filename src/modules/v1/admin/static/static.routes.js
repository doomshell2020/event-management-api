const express = require('express');
const router = express.Router();
const staticController = require('./static.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');


// ✅ Get Event Organizer Route
router.get('/', authenticate, staticController.getStaticList)

// CREATE STATIC PAGES
router.post(
    '/',
    authenticate,
    [
        body('title')
            .trim()
            .notEmpty().withMessage('Title is required')
            .isLength({ min: 2 }).withMessage('Title must be at least 2 characters long'),

        body('descr')
            .trim()
            .notEmpty().withMessage('Description is required')
            .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    staticController.createStaticPage
);

router.put(
    '/:id',
    authenticate,
    [
        body('title')
            .trim()
            .notEmpty().withMessage('Title is required')
            .isLength({ min: 2 }).withMessage('Title must be at least 2 characters long'),

        body('descr')
            .trim()
            .notEmpty().withMessage('Description is required')
            .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
    ],
    validate,
    staticController.updateStaticPage
);

// 🎟️ Delete Static page Routes
router.delete(
    '/:id',
    [
        // Validate Event ID
        param('id')
            .isInt({ min: 1 })
            .withMessage('Valid Event ID is required'),
    ],
    validate,
    staticController.deleteStaticPage
);


router.get(
    '/:id/details',
    // authenticate,        // optional but recommended
    staticController.getStaticPageById
);



module.exports = router;