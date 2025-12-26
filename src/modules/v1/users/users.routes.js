const express = require('express');
const router = express.Router();
const userController = require('./users.controller');
const authenticate = require('../../../middlewares/auth.middleware');

/**
 * 🔍 Search Users (name / email / mobile)
 * GET /api/users/search?q=rahul
 */
router.get(
    '/search',
    authenticate,
    userController.searchUsers
);

module.exports = router;
