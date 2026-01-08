const customerService = require('./customer.service');
const apiResponse = require('../../../../common/utils/apiResponse');


module.exports.getCustomersList = async (req, res) => {
    try {
        const result = await customerService.getCustomersList(req, res);
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
            result.message || 'Customers fetched successfully.',
            { customers: result.data }  // plural naming convention
        );

    } catch (error) {
        console.log('Error in getCustomersList controller:', error);
        return apiResponse.error(res, 'An unexpected error occurred while fetching Customers.' + error.message, 500);
    }
};


// update Status Customer controller
module.exports.updateStatusCustomer = async (req, res) => {
    try {
        const result = await customerService.updateStatusCustomer(req);
        if (!result.success) {
            switch (result.code) {
                case 'ORGANIZER_NOT_FOUND':
                    return apiResponse.notFound(res, 'Organizer not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        return apiResponse.success(
            res, 'Customer Status updated successfully',
            result.data
        );
    } catch (error) {
        console.error('Error updating customer status:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};

// Resend email verification..controller
module.exports.resendVerificationEmail = async (req, res) => {
    try {
        const { userId } = req.body;
        const response = await customerService.resendVerificationEmail({ userId });
        return res.status(200).json(response);
    } catch (error) {
        console.error("Resend Verification Error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to resend verification email"
        });
    }
};



// Search Customer Controller
module.exports.searchCustomers = async (req, res) => {
    try {
        const result = await customerService.searchCustomers(req);

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
                        result.message || 'Failed to fetch customers'
                    );
            }
        }

        return apiResponse.success(
            res,
            result.message || 'customer search successfully...',
            { customers: result.data }
        );

    } catch (error) {
        console.error('Error in search customer controller:', error);
        return apiResponse.error(
            res,
            'An unexpected error occurred while fetching customers',
            500
        );
    }
};


// controller
module.exports.getCustomersFirstName = async (req, res) => {
    try {
        const { search } = req.query; // 👈 ?search=ka

        const result = await customerService.getCustomersFirstName(search);

        if (!result.success) {
            switch (result.code) {
                case "VALIDATION_FAILED":
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(
            res,
            result.message,
            { customers: result.data }
        );
    } catch (error) {
        console.error("Error in getCustomersFirstName controller:", error);
        return apiResponse.error(
            res,
            "An unexpected error occurred while fetching Customers. " + error.message,
            500
        );
    }
};
