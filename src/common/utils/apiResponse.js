/**
 * ✅ Standardized API response helper
 * Compatible with existing logic, but with improved structure & standard error codes
 */

const apiResponse = {
  /**
   * ✅ Success Response
   */
  success(res, message = 'Success', data = {}, code = 200) {
    return res.status(code).json({
      success: true,
      code,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * ❌ Generic Error Response
   */
  error(res, message = 'Something went wrong', code = 500, errors = [], errorCode = 'SERVER_ERROR') {
    return res.status(code).json({
      success: false,
      error: {
        code, // HTTP status code
        error_code: errorCode, // Developer-friendly code (like STRIPE style)
        message,
        details: errors, // optional array of details
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * ⚠️ Validation Error Response
   */
  validation(res, errors = [], message = 'Validation Error') {
    return res.status(422).json({
      success: false,
      error: {
        code: 422,
        error_code: 'VALIDATION_ERROR',
        message,
        details: errors,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 🔐 Unauthorized
   */
  unauthorized(res, message = 'Unauthorized', errorCode = 'AUTH_UNAUTHORIZED') {
    return res.status(401).json({
      success: false,
      error: {
        code: 401,
        error_code: errorCode,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 🚫 Not Found
   */
  notFound(res, message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: {
        code: 404,
        error_code: errorCode,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * ⚔️ Conflict (e.g., Already Verified, Duplicate Email)
   */
  conflict(res, message = 'Conflict: Resource already exists', errorCode = 'RESOURCE_CONFLICT') {
    return res.status(409).json({
      success: false,
      error: {
        code: 409,
        error_code: errorCode,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = apiResponse;
