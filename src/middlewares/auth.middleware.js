const jwt = require('jsonwebtoken');
const config = require('../config/app'); // contains jwtSecret
const apiResponse = require('../common/utils/apiResponse');

const authenticate = (req, res, next) => {
  try {
    let token = null;

    // 1️⃣ Check Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        token = parts[1];
      } else {
        token = authHeader; // Token directly sent without "Bearer"
      }
    }

    // 2️⃣ Check x-access-token header
    if (!token && (req.headers['x-access-token'] || req.headers['X-Access-Token'])) {
      token = req.headers['x-access-token'] || req.headers['X-Access-Token'];
    }

    // 3️⃣ Check cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If still no token found
    if (!token) {
      return apiResponse.unauthorized(res, 'Unauthorized: Token not provided');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Attach decoded data to req
    req.token = token; // Optional: keep raw token if needed

    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return apiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = authenticate;
