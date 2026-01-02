const staticService = require('./static.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getStaticList = async (req, res) => {
    try {
        const result = await staticService.getStaticList(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,
            result.message || 'Static fetched successfully.',
            { static: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getStaticList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching static.' + error.message, 500);
    }
};


module.exports.createStaticPage = async (req, res) => {
    try {
        const result = await staticService.createStaticPage(req);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE_ERROR':
                    return apiResponse.error(res, result.message, 409);
                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(res, result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(res, result.message, result.data);
    } catch (error) {
        return apiResponse.error(res, 'Internal server error', 500);
    }
};

// controller
module.exports.updateStaticPage = async (req, res) => {
    try {
        const pageId = req.params.id;

        // 🔍 Basic validation
        if (!pageId) {
            return apiResponse.validation(
                res,
                [],
                'Static Page ID is required'
            );
        }

        // 🔁 Call service
        const result = await staticService.updateStaticPage(pageId, req.body);

        // ❌ Handle service-level errors
        if (!result.success) {
            switch (result.code) {
                case 'PAGE_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);

                case 'DUPLICATE_TITLE':
                    return apiResponse.validation(res, [], result.message);

                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);

                case 'DB_ERROR':
                    return apiResponse.error(
                        res,
                        result.message || 'Database error occurred'
                    );

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'An unknown error occurred',
                        400
                    );
            }
        }

        // ✅ Success response
        return apiResponse.success(
            res,
            'Static page updated successfully',
            result.data
        );

    } catch (error) {
        console.error('❌ Error in updateStaticPage:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};


// delete static page controller
module.exports.deleteStaticPage = async (req, res) => {
    try {
        const pageId = req.params.id;

        // 🔍 Validate ID
        if (!pageId) {
            return apiResponse.validation(
                res,
                [],
                'Static Page ID is required'
            );
        }

        // 🔁 Call service
        const result = await staticService.deleteStaticPage(pageId);

        // ❌ Handle service-level errors
        if (!result.success) {
            switch (result.code) {
                case 'PAGE_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);

                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);

                case 'DB_ERROR':
                    return apiResponse.error(
                        res,
                        result.message || 'Database error occurred'
                    );

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'An unknown error occurred',
                        400
                    );
            }
        }

        // ✅ Success response
        return apiResponse.success(
            res,
            'Static page deleted successfully'
        );

    } catch (error) {
        console.error('❌ Error in deleteStaticPage:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};


// controller
module.exports.getStaticPageById = async (req, res) => {
    try {
        const pageId = req.params.id;

        if (!pageId) {
            return apiResponse.validation(
                res,
                [],
                'Static Page ID is required'
            );
        }

        const result = await staticService.getStaticPageById(pageId);

        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);

                case 'PAGE_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);

                case 'DB_ERROR':
                    return apiResponse.error(res, result.message);

                default:
                    return apiResponse.error(res, result.message, 400);
            }
        }

        return apiResponse.success(
            res,
            result.message,
            result.data
        );

    } catch (error) {
        console.error('❌ Error in getStaticPageById controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};
