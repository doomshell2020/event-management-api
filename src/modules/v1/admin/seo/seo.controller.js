const seoService = require('./seo.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getSeoList = async (req, res) => {
    try {
        const result = await seoService.getSeoList(req, res);
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
            result.message || 'Seo fetched successfully.',
            { seo: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getSeoList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching seo.' + error.message, 500);
    }
};


module.exports.createSeoPage = async (req, res) => {
    try {
        const result = await seoService.createSeoPage(req);
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

// // controller
module.exports.updateSeoPage = async (req, res) => {
    try {
        const pageId = req.params.id;

        // 🔍 Basic validation
        if (!pageId) {
            return apiResponse.validation(
                res,
                [],
                'Seo Page ID is required'
            );
        }

        // 🔁 Call service
        const result = await seoService.updateSeoPage(pageId, req.body);

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


// // controller
module.exports.getSeoPageById = async (req, res) => {
    try {
        const pageId = req.params.id;

        if (!pageId) {
            return apiResponse.validation(
                res,
                [],
                'Seo Page ID is required'
            );
        }
        const result = await seoService.getSeoPageById(pageId);
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
        console.error('❌ Error in getSeoPageById controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};



module.exports.updateStatusSeo = async (req, res) => {
    try {
        const result = await seoService.updateStatusSeo(req);
        if (!result.success) {
            switch (result.code) {
                case 'SEO_NOT_FOUND':
                    return apiResponse.notFound(res, 'Seo not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,'Seo Status updated successfully',
            result.data
        );
    } catch (error) {
        console.error('Error updating seo:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};