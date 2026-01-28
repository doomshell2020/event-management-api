const templateService = require('./email.service');
const apiResponse = require('../../../../common/utils/apiResponse');

module.exports.getTemplatesList = async (req, res) => {
    try {
        const result = await templateService.getTemplatesList(req, res);
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
            { templates: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getTemplatesList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching seo.' + error.message, 500);
    }
};


module.exports.createTemplatesPage = async (req, res) => {
    try {
        const result = await templateService.createTemplatesPage(req);
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
module.exports.updateTemplatesPage = async (req, res) => {
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
        const result = await templateService.updateTemplatesPage(pageId, req.body);

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
            'Templates page updated successfully',
            result.data
        );

    } catch (error) {
        console.error('❌ Error in updateTemplatesPage:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};


// // controller
module.exports.getTemplatesPageById = async (req, res) => {
    try {
        const pageId = req.params.id;

        if (!pageId) {
            return apiResponse.validation(
                res,
                [],
                'Templates Page ID is required'
            );
        }
        const result = await templateService.getTemplatesPageById(pageId);
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
        console.error('❌ Error in getTemplatesPageById controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};


module.exports.updateStatusTemplates = async (req, res) => {
    try {
        const result = await templateService.updateStatusTemplates(req);
        if (!result.success) {
            switch (result.code) {
                case 'SEO_NOT_FOUND':
                    return apiResponse.notFound(res, 'Seo not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res,'template status updated successfully!',
            result.data
        );
    } catch (error) {
        console.error('Error updating seo:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};


module.exports.getEventList = async (req, res) => {
    try {
        const result = await templateService.getEventList(req, res);
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
            result.message || 'Events fetched successfully.',
            { events: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getTemplatesList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching seo.' + error.message, 500);
    }
};



// Search Static Controller
module.exports.searchTemplate = async (req, res) => {
    try {
        const result = await templateService.searchTemplate(req);

        if (!result.success) {
            switch (result.code) {
                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(
                        res,
                        result.message || 'Unauthorized access'
                    );

                case 'VALIDATION_ERROR':
                    return apiResponse.validation(
                        res,
                        [],
                        result.message
                    );

                case 'INTERNAL_SERVER_ERROR':
                    return apiResponse.error(
                        res,
                        result.message || 'Internal server error'
                    );

                default:
                    return apiResponse.error(
                        res,
                        result.message || 'Failed to fetch static pages'
                    );
            }
        }

        return apiResponse.success(
            res,
            result.message || 'Static pages fetched successfully',
            { templates: result.data }
        );

    } catch (error) {
        console.error('Error in search static controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching static pages',
            500
        );
    }
};



module.exports.sendTestEmail = async (req, res) => {
    try {
        const { template_id, email } = req.body;

        if (!template_id || !email) {
            return res.status(400).json({
                success: false,
                message: "Template ID and email are required",
            });
        }

        const result = await templateService.sendTestEmail(
            template_id,
            email
        );

        return res.status(200).json({
            success: true,
            message: "Test email sent successfully.",
            data: result,
        });
    } catch (error) {
        console.error("Send test email error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send test email",
        });
    }
};