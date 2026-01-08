const express = require('express');
const router = express.Router();
const staticController = require('./static.controller');
const { body, param } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');
const util = require('util');


const uploadFiles = require('../../../../middlewares/upload.middleware');
const imageUpload = uploadFiles({ folder: 'uploads/static',type: 'single',fieldName: 'image'});
const uploadAsync = util.promisify(imageUpload);


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
    staticController.updateStatusStatic
);


router.post('/upload-image', async (req, res) => {
    try {
        await uploadAsync(req, res);
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Image not uploaded'
            });
        }
        const filename = req.file.filename;
        const imageUrl = `/uploads/static/${filename}`;
        return res.status(200).json({
            success: true,
            filename,
            imageUrl
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Upload failed'
        });
    }
});

router.get(
    '/search',
    [
        param('title').optional().isString().trim(),
        param('status').optional().isIn(['Y', 'N']),
    ],
    validate,
    staticController.searchStatic
);




module.exports = router;