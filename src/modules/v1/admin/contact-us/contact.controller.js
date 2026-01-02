const contactUsService = require('./contact.service');
const apiResponse = require('../../../../common/utils/apiResponse');



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


