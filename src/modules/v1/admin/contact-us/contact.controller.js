const contactUsService = require('./contact.service');
const apiResponse = require('../../../../common/utils/apiResponse');




// Controller: Create Contact Us
module.exports.createContactUs = async (req, res) => {
    try {
        const result = await contactUsService.createContactUs(req);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                    
                case 'DUPLICATE_SUBMISSION':
                    return apiResponse.conflict(res, result.message);

                case 'UNAUTHORIZED':
                    return apiResponse.unauthorized(res, result.message);

                case 'CREATION_FAILED':
                    return apiResponse.error(res, result.message, 500);

                default:
                    return apiResponse.error(res, result.message, 400);
            }
        }

        return apiResponse.success(res, result.message, result.data);

    } catch (error) {
        console.error('Create Contact Us Controller Error:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};




module.exports.contactUsList = async (req, res) => {
    try {
        // ✅ Call service (only req)
        const result = await contactUsService.contactUsList(req);

        // ❌ Handle service-level failure
        if (!result?.success) {
            return apiResponse.error(
                res,
                result?.message || 'Failed to fetch contact requests',
                500
            );
        }

        // ✅ Success response
        return apiResponse.success(
            res,
            result.message || 'Contact us list fetched successfully!',
            {
                contacts: result.data || [],
            }
        );
    } catch (error) {
        console.error('❌ Error in contactUsList controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};


