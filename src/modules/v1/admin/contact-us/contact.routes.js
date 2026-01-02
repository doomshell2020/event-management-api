const express = require('express');
const router = express.Router();
const contactUsController = require('./contact.controller');

// company list api 
router.get('/',
    // authenticate,
    contactUsController.contactUsList
);

module.exports = router;