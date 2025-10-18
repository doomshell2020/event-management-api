const { validationResult } = require('express-validator');
const apiResponse = require('../common/utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.validation(res, errors.array(), 'Validation failed');
  }
  next();
};

module.exports = validate;
