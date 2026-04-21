const express = require('express');
const router = express.Router();
const scanTicketsController = require('./scan-tickets.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');

// CREATE ORDER
router.post('/',authenticate,scanTicketsController.scanTickets);


module.exports = router;
