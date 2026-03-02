const express = require('express');
const router = express.Router();
const companyController = require('./company.controller');
const { body, param, query } = require('express-validator');
const validate = require('../../../middlewares/validation.middleware');
const authenticate = require('../../../middlewares/auth.middleware');


// company list api 
router.get('/list',
    authenticate,
    companyController.companyList
);

router.get('/detail/:id',
    [
        param('id')
            .notEmpty().withMessage('Company ID is required')
            .isInt().withMessage('Invalid Company ID'),
    ],
    validate,
    companyController.companyDetail
);


router.put('/update/:id',
    authenticate,
    [
        body('name')
            .optional()
            .isLength({ min: 8 }).withMessage('Event name must be at least 8 characters long'),
    ],
    validate,
    companyController.updateCompany
);

router.delete('/delete/:id', authenticate,
    [
        param('id')
            .notEmpty().withMessage('Event ID is required')
            .isInt().withMessage('Event ID must be a number'),

    ],
    validate,
    companyController.deleteCompany
)


module.exports = router;