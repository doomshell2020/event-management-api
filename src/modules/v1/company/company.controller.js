const companyService = require('./company.service');
const apiResponse = require('../../../common/utils/apiResponse');



module.exports.companyDetail = async (req, res) => {
    try {
        const result = await companyService.companyDetail(req, res);

        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);

                case 'NOT_FOUND':
                    return apiResponse.error(res, result.message, 404);

                case 'INTERNAL_ERROR':
                default:
                    return apiResponse.error(res, result.message, 500);
            }
        }

        return apiResponse.success(
            res,
            result.message || 'Event details fetched successfully',
            { company: result.data } // renamed to event (single)
        );

    } catch (error) {
        console.log('Error in companyDetail controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};

module.exports.updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return apiResponse.validation(res, [], 'Company ID is required');
        }

        // Call service
        const result = await companyService.updateCompany(id, updateData);

        if (!result.success) {
            switch (result.code) {
                case 'NOT_FOUND':
                    return apiResponse.notFound(res, result.message); // 404

                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message); // 422

                case 'DB_ERROR':
                default:
                    return apiResponse.error(res, result.message); // 500
            }
        }

        return apiResponse.success(
            res,
            result.message,
            { company: result.data }
        );
    } catch (error) {
        console.error('Error in updateCompany controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
};


module.exports.companyList = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return apiResponse.validation(res, [], 'User not authenticated');
        }
        const result = await companyService.companyList(req, res);
        if (!result.success) {
            return apiResponse.error(res, result.message); // 500
        }
        return apiResponse.success(
            res,
            result.message || 'Company list fetched successfully!',
            { companies: result.companies }
        );
    } catch (error) {
        console.error('Error in companyList controller:', error);
        return apiResponse.error(res, 'Internal server error', 500);
    }
}

module.exports.deleteCompany = async (req, res) => {
    try {
        const companyId = req.params.id;

        if (!companyId) {
            return apiResponse.validation(res, [], "Event ID is required");
        }

        // ✅ Call service layer
        const result = await companyService.deleteCompany(companyId);

        // ✅ Handle service-level results
        if (!result.success) {
            switch (result.code) {
                case "NOT_FOUND":
                    return apiResponse.notFound(res, "Event not found");
                case "DB_ERROR":
                    return apiResponse.error(res, "Database error occurred while deleting event");
                case "VALIDATION_FAILED":
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message || "Unknown error occurred");
            }
        }

        // ✅ Success Response
        return apiResponse.success(res, "Event deleted successfully", result.data);

    } catch (error) {
        console.error("Error in deleteEvent:", error);
        return apiResponse.error(res, "Internal Server Error", 500);
    }
};
