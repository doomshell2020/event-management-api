const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// ----------------------
// Register a new user
// ----------------------
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

// ----------------------
// Login user
// ----------------------
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

module.exports = router;
