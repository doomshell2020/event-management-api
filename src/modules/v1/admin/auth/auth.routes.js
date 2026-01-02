const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { body } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');
const authenticate = require('../../../../middlewares/auth.middleware');
// Login user
router.post('/login',
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

router.get('/me', authenticate, authController.getAdminInfo);

router.patch(
  "/:id/update-profile",
  authenticate,
  [
    body("first_name")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("First name must be at least 2 characters long"),

    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email address"),

    body("mobile")
      .optional()
      .isLength({ min: 10, max: 15 })
      .withMessage("Mobile number must be between 10 to 15 digits"),

    body("fburl")
      .optional()
      .isURL()
      .withMessage("Facebook URL must be a valid URL"),
    body("Twitterurl")
      .optional()
      .isURL()
      .withMessage("Twitter URL must be a valid URL"),

    body("linkdinurl")
      .optional()
      .isURL()
      .withMessage("LinkedIn URL must be a valid URL"),

    body("googleplusurl")
      .optional()
      .isURL()
      .withMessage("Google Plus URL must be a valid URL"),

    body("googleplaystore")
      .optional()
      .isURL()
      .withMessage("Google Play Store URL must be a valid URL"),

    body("applestore")
      .optional()
      .isURL()
      .withMessage("Apple Store URL must be a valid URL"),
  ],
  validate,
  authController.updateProfile
);

router.patch(
  "/:id/update-password",
  authenticate,
  [
    body("password")
      .trim()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  validate,
  authController.changeAdminPassword
);









module.exports = router;
