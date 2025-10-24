const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');
const uploadFiles = require('../../../middlewares/upload.middleware');

// Register a new user
router.post(
  '/register',
  [
    body('firstName')
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName')
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    body('dob')
      .optional()
      .isDate({ format: 'YYYY-MM-DD' }).withMessage('DOB must be in YYYY-MM-DD format')
  ],
  validate,
  authController.register
);

// Login user
router.post(
  '/login',
  [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

router.get('/me', authenticate, authController.getUserInfo);
router.get('/verify-email', authController.verifyEmail);
router.patch(
  '/update-profile',
  authenticate,
  [
    body('first_name')
      .optional()
      .isLength({ min: 2 }).withMessage('First name must be at least 2 characters long'),
    body('last_name')
      .optional()
      .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters long'),
    body('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    body('dob')
      .optional()
      .isDate({ format: 'YYYY-MM-DD' }).withMessage('DOB must be a valid date in YYYY-MM-DD format'),
    body('password')
      .optional()
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'), // ✅ COMMA ADDED
    body('emailRelatedEvents')
      .optional()
      .isIn(['Y', 'N']).withMessage('emailRelatedEvents must be Y or N'),
    body('emailNewsLetter')
      .optional()
      .isIn(['Y', 'N']).withMessage('emailNewsLetter must be Y or N')
  ],
  validate,
  authController.updateProfile
);

// 🖼️ PATCH /update-profile-image
router.patch(
  '/update-profile-image',
  authenticate,
  uploadFiles({ folder: 'uploads/profile', type: 'single', fieldName: 'profile_image' }),
  authController.updateProfileImage
);

// Forgot password
router.post(
  '/forgot-password',
  [body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email')],
  validate,
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  validate,
  authController.resetPassword
);

module.exports = router;
