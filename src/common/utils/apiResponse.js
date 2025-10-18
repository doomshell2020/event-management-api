// src/utils/apiResponse.js

/**
 * Standardized API response helper
 * This ensures every API returns consistent structure.
 */
const apiResponse = {
    success(res, message = 'Success', data = {}, code = 200) {
        return res.status(code).json({
            success: true,
            message,
            data,
            code,
            timestamp: new Date().toISOString(),
        });
    },

    error(res, message = 'Something went wrong', code = 500, errors = []) {
        return res.status(code).json({
            success: false,
            message,
            errors,
            code,
            timestamp: new Date().toISOString(),
        });
    },

    validation(res, errors = [], message = 'Validation Error') {
        return res.status(422).json({
            success: false,
            message,
            errors,
            code: 422,
            timestamp: new Date().toISOString(),
        });
    },

    unauthorized(res, message = 'Unauthorized') {
        return res.status(401).json({
            success: false,
            message,
            code: 401,
            timestamp: new Date().toISOString(),
        });
    },

    notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            success: false,
            message,
            code: 404,
            timestamp: new Date().toISOString(),
        });
    },
};

module.exports = apiResponse;
