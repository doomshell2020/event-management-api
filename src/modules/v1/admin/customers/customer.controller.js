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
            res,'Customer Status updated successfully',
            result.data
        );
    } catch (error) {
        console.error('Error updating customer status:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};