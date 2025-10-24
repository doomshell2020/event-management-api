// routes/common.routes.js
const express = require('express');
const router = express.Router();
const commonController = require('../../v1/common/common.controller');

// Public route, no authentication
router.get('/list', commonController.getList);

module.exports = router;
