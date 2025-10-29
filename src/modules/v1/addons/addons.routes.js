const express = require('express');
const router = express.Router();
const addonController = require('./addons.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const uploadFiles = require('../../../middlewares/upload.middleware');

// 🎟️ Create Addon Route
router.post(
    '/create',
    authenticate,
    uploadFiles({ folder: 'uploads/addons', type: 'single', fieldName: 'addon_image' }),
    [
        body('event_id').notEmpty().withMessage('Event ID is required').isInt(),
        body('name').notEmpty().withMessage('Addon name is required').isLength({ min: 3 }),
        body('price').notEmpty().withMessage('Price is required').isFloat({ min: 0 }),
        body('count').optional().isInt({ min: 1 }),
        body('description').optional().isLength({ min: 3 }),
    ],
    validate,
    addonController.createAddons
);


// ✏️ Update Addon Route
router.put(
    '/update/:id',
    authenticate,
    uploadFiles({ folder: 'uploads/addons', type: 'single', fieldName: 'addon_image' }),
    [
        param('id').isInt({ min: 1 }).withMessage('Valid Addon ID is required'),

        body('name')
            .optional()
            .isLength({ min: 3 }).withMessage('Addon name must be at least 3 characters long'),

        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be a valid number'),

        body('count')
            .optional()
            .isInt({ min: 0 }).withMessage('Count must be a non-negative integer'),

        body('description')
            .optional()
            .isLength({ min: 3 }).withMessage('Description must be at least 3 characters long'),

        body('hidden')
            .optional()
            .isIn(['Y', 'N']).withMessage('Hidden must be either Y or N'),
    ],
    validate,
    addonController.updateAddons
);




module.exports = router;

