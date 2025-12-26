const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { body } = require('express-validator');
const validate = require('../../../../middlewares/validation.middleware');

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

module.exports = router;
