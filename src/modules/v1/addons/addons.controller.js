const addonService = require('./addons.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');


module.exports.createAddons = async (req, res) => {
    try {
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/addons');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        const result = await addonService.createAddons(req);

        if (!result.success) {
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }

            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, result.message);
                case 'DUPLICATE_TICKET':
                    return apiResponse.conflict(res, result.message);
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(res, result.message, result.data);

    } catch (error) {
        console.error('Error in createAddons:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};

module.exports.updateAddons = async (req, res) => {
    try {
        const addonId = req.params.id;
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/addons');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        const result = await addonService.updateAddons(req);

        if (!result.success) {
            // 🧹 Remove uploaded file if DB operation failed
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to failure:', fullFilePath);
            }

            switch (result.code) {
                case 'NOT_FOUND':
                    return apiResponse.notFound(res, result.message);
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DB_ERROR':
                    return apiResponse.error(res, result.message);
                default:
                    return apiResponse.error(res, result.message || 'Unknown error');
            }
        }

        return apiResponse.success(res, result.message, result.data);

    } catch (error) {
        console.error('Error in updateAddons:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};

module.exports.listAddonsByEvent = async (req, res) => {
    try {
        const { event_id } = req.params;

        // ✅ Validate event_id
        if (!event_id) {
            return apiResponse.validation(res, [], 'Event ID is required');
        }

        // ✅ Call service to fetch tickets
        const result = await addonService.listAddonsByEvent(event_id);

        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while fetching addons');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Addons fetched successfully', result.data);

    } catch (error) {
        console.error('Error in listAddonsByEvent:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};