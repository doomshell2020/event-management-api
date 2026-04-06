const express = require('express');
const router = express.Router();
const cmsController = require('./cms.controller');
const { body, param } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');

/* LIST MEMBERS */
router.get('/:url',
    [
        param('url')
            .notEmpty()
            .withMessage('URL parameter is required')
    ],
    validate,
    cmsController.getStaticPage
);

module.exports = router;