const wellnessService = require('./wellness.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');


// add wellness...
module.exports.createWellnessAppointment = async (req, res) => {
    try {
        // ✅ Handle optional file safely
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/wellness');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;
        // ✅ Validate required fields
        const { name, event_id, description, location, currency } = req.body;
        if (!event_id || !name ) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }
        if (!event_id || !name) {
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }
            return apiResponse.validation(res, [], 'Price and count are required for open_sales type');
        }
        // ✅ Call service to create ticket
        const result = await wellnessService.createWellness(req);

        // ✅ Handle service errors
        if (!result.success) {
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log('🧹 Uploaded image removed due to DB failure:', fullFilePath);
            }

            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while creating wellness');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE_WELLNESS':
                    return apiResponse.conflict(res, result.message || '');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }
        // ✅ Success response
        return apiResponse.success(res, 'wellness created successfully', result.data);
    } catch (error) {
        console.error('Error in wellness:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

// update wellness controller
module.exports.updateWellness = async (req, res) => {
    try {
        const result = await wellnessService.updateWellness(req);

        if (!result.success) {
            switch (result.code) {
                case 'WELLNESS_NOT_FOUND':
                    return apiResponse.notFound(res, 'Wellness not found');
                default:
                    return apiResponse.error(res, result.message);
            }
        }

        return apiResponse.success(
            res,
            'Status updated successfully',
            result.data
        );

    } catch (error) {
        console.error('Error updating wellness:', error);
        return apiResponse.error(res, 'Internal Server Error');
    }
};

// deleted wellness
module.exports.deleteWellness = async (req, res) => {
    try {
        const wellnessId = req.params.id;

        // ✅ Validate ID param
        if (!wellnessId) {
            return apiResponse.validation(res, [], 'Ticket ID is required');
        }

        // ✅ Call service to delete ticket
        const result = await wellnessService.deleteWellness(req);

        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'WELLNESS_NOT_FOUND':
                    return apiResponse.notFound(res, 'Wellness not found');
                case 'FORBIDDEN':
                    return apiResponse.forbidden(res, 'You are not authorized to delete this wellness');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while deleting wellness');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }
        // ✅ Success response
        return apiResponse.success(res, 'Wellness deleted successfully');
    } catch (error) {
        console.error('Error in deleteWellness:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};




// ..Wellness Lists
module.exports.wellnessList = async (req, res) => {
    try {
        const result = await wellnessService.wellnessList(req, res);

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
            result.message || 'Wellness list fetched successfully',
            { wellness: result.data }  // plural naming convention
        );
    } catch (error) {
        console.log('Error in eventList controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};


// .. Wellness findOne
module.exports.getWellnessById = async (req, res) => {
    try {
        const result = await wellnessService.getWellnessById(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        const wellnessData = result.data || {};
        return apiResponse.success(
            res,
            result.message || 'Wellness record fetched successfully',
            { wellness: wellnessData }   // singular because findOne
        );

    } catch (error) {
        console.log('Error in wellnessFindOne controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};


// ...
module.exports.createWellnessSlots = async (req, res) => {
    try {

        const { wellness_id, date } = req.body;

        if (!wellness_id || !date) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        // if (type == 'Select' && !items || Array.isArray(items) && items.length == 0) {
        //     return apiResponse.validation(res, [], 'Items is required for select options');
        // }

        // ✅ Call service to create ticket
        const result = await wellnessService.createWellnessSlots(req);
        // ✅ Handle service errors
        if (!result.success) {

            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while creating wellness slots');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE':
                    return apiResponse.conflict(res, result.message || '');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Wellness slots created successfully', result.data);

    } catch (error) {
        console.error('Error in createWe:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
}

// wellness slots lists
module.exports.wellnessSlotsList = async (req, res) => {
    try {
        const result = await wellnessService.wellnessSlotsList(req, res);
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
            result.message || 'Wellness slots list fetched successfully',
            { wellness: result.data }  // plural naming convention
        );
    } catch (error) {
        console.log('Error in wellness slots controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};

// wellness slots list..
module.exports.getWellnessSlotById = async (req, res) => {
    try {
        const result = await wellnessService.getWellnessSlotById(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        const wellnessData = result.data || {};
        return apiResponse.success(
            res,
            result.message || 'Wellness slots record fetched successfully',
            { wellness: wellnessData }   // singular because findOne
        );

    } catch (error) {
        console.log('Error in wellness slot findOne controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};


// ..../
module.exports.updateWellnessSlots = async (req, res) => {
    try {
        const slotId = req.params.id;
        // ✅ Basic validation
        if (!slotId) {
            return apiResponse.validation(res, [], 'Question ID is required');
        }
        // ✅ Call service to update the question
        const result = await wellnessService.updateWellnessSlots(slotId, req.body);

        // ✅ Handle service errors
        if (!result.success) {
            switch (result.code) {
                case 'WELLNESS_SLOT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Slot not found');
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while updating wellness slot');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }

        // ✅ Success response
        return apiResponse.success(res, 'Wellness Slot updated successfully', result.data);

    } catch (error) {
        console.error('Error in updateWellnessSlot:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

// wellness slots deleted
module.exports.deleteWellnessSlots = async (req, res) => {
    try {
        const wellnessSlotId = req.params.id;

        // ✅ Validate ID param
        if (!wellnessSlotId) {
            return apiResponse.validation(res, [], 'Wellness Slot ID is required');
        }

        // ✅ Call service to delete ticket
        const result = await wellnessService.deleteWellnessSlots(req);

        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'WELLNESS_NOT_FOUND':
                    return apiResponse.notFound(res, 'Wellness slot not found');
                case 'FORBIDDEN':
                    return apiResponse.forbidden(res, 'You are not authorized to delete this wellness');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while deleting wellness');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }
        // ✅ Success response
        return apiResponse.success(res, 'Wellness slot deleted successfully');
    } catch (error) {
        console.error('Error in deleteWellness:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};




// new api create wellness and slots..
module.exports.createWellnessWithSlots = async (req, res) => {
    try {
        // ✅ Image Handling
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), "uploads/wellness");
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        // ✅ Extract FormData fields
        const { name, event_id, description, location, currency } = req.body;
        let { slots } = req.body;
        // ✅ Validate Required Fields
        if (!event_id || !name) {
            return apiResponse.validation(res, [], "Required fields are missing");
        }

        // ✅ Parse Slots JSON (coming from form-data)
        try {
            slots = JSON.parse(slots);
        } catch (err) {
            return apiResponse.validation(res, [], "Slots must be valid JSON array");
        }

        if (!Array.isArray(slots) || slots.length === 0) {
            return apiResponse.validation(res, [], "At least 1 slot is required");
        }

        // ✅ Call SERVICE (Only ONCE)
        const wellnessResult = await wellnessService.createWellnessWithSlots(req);

        if (!wellnessResult.success) {
            // ✅ Delete uploaded image on failure
            if (fullFilePath && fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
                console.log("🧹 Uploaded image removed due to failure");
            }

            return apiResponse.error(res, wellnessResult.message);
        }

        // ✅ Response
        return apiResponse.success(
            res,
            "Wellness + Slots created successfully",
            wellnessResult.data
        );

    } catch (error) {
        console.error("❌ Error in Wellness + Slots:", error);
        return apiResponse.error(res, "Internal Server Error", 500);
    }
};

// update wellness..

module.exports.updateWellnessWithSlots = async (req, res) => {
    try {
        const wellnessId = req.params.id;

        // ✅ File Upload (Image)
        const filename = req.file?.filename || null;
        const uploadFolder = path.join(process.cwd(), 'uploads/wellness');
        const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

        // ✅ Validate ID
        if (!wellnessId) {
            if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
            return apiResponse.validation(res, [], 'Wellness ID is required');
        }

        // ✅ Validate required fields
        const { name, event_id, currency } = req.body;

        if (!event_id || !name) {
            if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        // ✅ Call service (single function handles BOTH updates)
        const result = await wellnessService.updateWellnessWithSlots(req);

        // ✅ Handle service errors
        if (!result.success) {
            if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);

            return apiResponse.error(
                res,
                result.message || "Update failed",
                result.code
            );
        }

        // ✅ Success
        return apiResponse.success(res, "Wellness & Slots updated successfully", result.data);

    } catch (error) {
        console.error("❌ Error in updateWellness:", error);
        return apiResponse.error(res, "Internal Server Error", 500);
    }
};



module.exports.eventList = async (req, res) => {
  try {
    const result = await wellnessService.eventList(req, res);

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
      result.message || 'Event list fetched successfully',
      { events: result.data }  // plural naming convention
    );

  } catch (error) {
    console.log('Error in eventList controller:', error);
    return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
  }
};



