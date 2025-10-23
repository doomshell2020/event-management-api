const jwt = require('jsonwebtoken');
const config = require('../../config/app');

const generateVerificationToken = (email) => {
  return jwt.sign({ email }, config.jwtSecret, { expiresIn: config.tokenExpiresIn });
};

const verifyVerificationToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
};

module.exports = { generateVerificationToken, verifyVerificationToken };
