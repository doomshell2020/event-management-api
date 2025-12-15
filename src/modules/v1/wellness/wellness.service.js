
const { Wellness, Event, WellnessSlots,Currency } = require('../../../models/index');

const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

module.exports.createWellness = async (req) => {
    try {
        const {
            event_id,
            name,
            currency,
            location,
            description,
        } = req.body;


        const ticketImage = req.file?.filename;
        // ✅ Validate required fields
        if (!event_id || !name || !currency) {
            return {
                success: false,
                message: 'Please fill all required fields',
                code: 'VALIDATION_FAILED'
            };
        }
        // ✅ Check if associated event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: 'Associated event not found',
                code: 'EVENT_NOT_FOUND'
            };
        }

        // ✅ Check for duplicate ticket title for same event
        const existingTicket = await Wellness.findOne({
            where: {
                event_id: event_id,
                name: name.trim()
            }
        });

        if (existingTicket) {
            return {
                success: false,
                message: 'A wellness with this title already exists for the selected event',
                code: 'DUPLICATE_TICKET'
            };
        }

        // ✅ Validate image extension only if image is uploaded
        if (ticketImage) {
            const allowedExt = ['png', 'jpg', 'jpeg'];
            const ext = ticketImage.split('.').pop().toLowerCase();
            if (!allowedExt.includes(ext)) {
                return {
                    success: false,
                    message: 'Invalid image type. Only JPG, PNG, and JPEG allowed.',
                    code: 'VALIDATION_FAILED'
                };
            }
        }
        // ✅ Create wellness
        const newTicket = await Wellness.create({
            event_id: event_id,
            name: name.trim(),
            Image: ticketImage || null,
            description: description?.trim() || '',
            location,
            currency
        });
        return {
            success: true,
            message: 'Wellness created successfully',
            data: newTicket
        };

    } catch (error) {
        console.error('Error creating ticket:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

// wellness service - status update
module.exports.updateWellness = async (req) => {
    try {
        const wellnessId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingWellness = await Wellness.findByPk(wellnessId);
        if (!existingWellness) {
            return {
                success: false,
                message: 'Wellness not found',
                code: 'WELLNESS_NOT_FOUND'
            };
        }

        // Update ONLY status
        await existingWellness.update({ status });

        return {
            success: true,
            message: 'Status updated successfully',
            data: existingWellness
        };

    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};



module.exports.deleteWellness = async (req) => {
    try {
        const wellnessId = req.params.id;

        // ✅ Find existing wellness record
        const existingWellness = await Wellness.findByPk(wellnessId);
        if (!existingWellness) {
            return {
                success: false,
                message: 'Wellness not found',
                code: 'WELLNESS_NOT_FOUND'
            };
        }
        // ✅ Remove associated image if it exists
        if (existingWellness.Image) {
            const uploadFolder = path.join(process.cwd(), 'uploads/wellness');
            const imagePath = path.join(uploadFolder, existingWellness.Image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('🧹 Wellness image deleted:', imagePath);
            }
        }
        // ✅ Delete all related slots (by wellness_id)
        const deletedSlotsCount = await WellnessSlots.destroy({
            where: { wellness_id: wellnessId }
        });
        console.log(`🧹 Deleted ${deletedSlotsCount} related wellness slots.`);
        // ✅ Delete main wellness record
        await existingWellness.destroy();
        return {
            success: true,
            message: `Wellness and ${deletedSlotsCount} related slot(s) deleted successfully`
        };
    } catch (error) {
        console.error('Error deleting wellness:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};

// module.exports.deleteWellness = async (req) => {
//     try {
//         const ticketId = req.params.id;
//         // const user_id = req.user?.id || null;

//         // ✅ Find existing ticket
//         const existingWellness = await Wellness.findByPk(ticketId);
//         if (!existingWellness) {
//             return {
//                 success: false,
//                 message: 'Wellness not found',
//                 code: 'WELLNESS_NOT_FOUND'
//             };
//         }

//         // ✅ Optional: Check if the user is the ticket owner (if applicable)
//         // if (user_id && existingWellness.userid && existingWellness.userid !== user_id) {
//         //     return {
//         //         success: false,
//         //         message: 'You are not authorized to delete this ticket',
//         //         code: 'FORBIDDEN'
//         //     };
//         // }

//         // ✅ Remove associated image if exists
//         if (existingWellness.Image) {
//             const uploadFolder = path.join(process.cwd(), 'uploads/wellness');
//             const imagePath = path.join(uploadFolder, existingWellness.Image);

//             if (fs.existsSync(imagePath)) {
//                 fs.unlinkSync(imagePath);
//                 console.log('🧹 Ticket image deleted:', imagePath);
//             }
//         }

//         // ✅ Delete ticket record
//         await existingWellness.destroy();

//         return {
//             success: true,
//             message: 'Wellness deleted successfully'
//         };

//     } catch (error) {
//         console.error('Error deleting wellness:', error);
//         return {
//             success: false,
//             message: 'Internal server error: ' + error.message,
//             code: 'DB_ERROR'
//         };
//     }
// };

// wellness lists
module.exports.wellnessList = async (req, res) => {
    try {
        const { id } = req.params; 
        const wellness = await Wellness.findAll({
            where: { event_id: id },
            include: [{ model: Event, as: 'eventList' , attributes:['name'] }],
            order: [['id', 'DESC']]
        });
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/wellness";
        const formattedList = wellness.map((item) => {
            const data = item.toJSON();
            return {
                ...data,
                Image: data.Image
                    ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.Image}`
                    : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,
            };
        });
        return {
            success: true,
            message: 'Wellness list fetched successfully',
            data: formattedList
        };
    } catch (error) {
        console.error('Error fetching wellness list:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }
}



// Wellness findOne API
module.exports.getWellnessById = async (req, res) => {
    try {
        const { id } = req.params;   // get id from URL params
        const wellness = await Wellness.findOne({
            where: { id: id },
            include: [{ model: WellnessSlots, as: 'wellnessSlots' }],
        });

        const data = wellness.toJSON();

        // ✅ Base URL
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/wellness";

        // ✅ Final Image URL
        data.Image = data.Image
            ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.Image}`
            : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`;
        return {
            success: true,
            message: 'Wellness record fetched successfully!',
            data: data
        };
    } catch (error) {
        console.error('Error fetching wellness:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }
}


// create wellness slots
module.exports.createWellnessSlots = async (req) => {
    try {
        const { wellness_id, date, slot_start_time, slot_end_time, price, slot_location, count } = req.body;
        // ✅ Validate required fields
        if (!wellness_id || !date || !slot_start_time || !slot_end_time) {
            return {
                success: false,
                message: 'Please fill all required fields',
                code: 'VALIDATION_FAILED'
            };
        }

        // ✅ Check if same slot already exists
        const existingSlot = await WellnessSlots.findOne({
            where: {
                wellness_id,
                date,
                slot_start_time,
                slot_end_time
            }
        });
        if (existingSlot) {
            return {
                success: false,
                message: 'A slot with the same date and time already exists for this wellness service',
                code: 'DUPLICATE_SLOT'
            };
        }
        // ✅ Create new slot
        const newWellnessSlots = await WellnessSlots.create({
            wellness_id,
            date,
            slot_start_time,
            slot_end_time,
            price,
            slot_location,
            count
        });
        return {
            success: true,
            message: 'Wellness slot created successfully',
            data: newWellnessSlots
        };
    } catch (error) {
        console.error('❌ Error creating Wellness slot:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};



// view all wellness..
module.exports.wellnessSlotsList = async (req, res) => {
    try {
           const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/wellness";
        const wellness = await WellnessSlots.findAll({
            include: [{ model: Wellness, as: 'wellnessList', attributes: ['name', 'location','Image','currency'] }],
            attributes: ['id','wellness_id', 'date', "slot_start_time", 'slot_end_time', 'price', 'slot_location', 'count'],
            order: [['id', 'DESC']]
        });
         // ✅ Format the image URL for each record
        const formattedSlots = wellness.map((slot) => {
            const data = slot.toJSON();
            const wellness = data.wellnessList || {};

            // Properly attach full image URL
            const imageUrl = wellness.Image
                ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${wellness.Image}`
                : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`;
                    return {
                ...data,
                wellnessList: {
                    ...wellness,
                    Image: imageUrl
                }
            };
        });
        return {
            success: true,
            message: 'Wellness slots list fetched successfully',
            data: formattedSlots
        };
    } catch (error) {
        console.error('Error fetching wellness list:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }
}


// find one wellness slots list..
module.exports.getWellnessSlotById = async (req, res) => {
    try {
        const { id } = req.params;   // get id from URL params
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/wellness";

        const wellness = await WellnessSlots.findOne({
            where: { id: id },
            include: [{ model: Wellness, as: 'wellnessList', attributes: ['name', 'location','Image','currency','hidden'], include: [{ model: Event, as: 'eventList' , attributes:['name','is_sale_start','ServiceFee','MexicanVAT','AccommodationTax','OndalindaFee','strip_fee','ticket_platform_fee_percentage','ticket_stripe_fee_percentage','ticket_bank_fee_percentage','ticket_processing_fee_percentage','accommodation_stripe_fee_percentage','accommodation_bank_fee_percentage','accommodation_processing_fee_percentage'] }], }],
            attributes: ['wellness_id', 'date', "slot_start_time", 'slot_end_time', 'price', 'slot_location', 'count','hidden'],
        });
         const data = wellness.toJSON();

        // Add full image URL
        const updatedData = {
            ...data,
            wellnessList: {
                ...data.wellnessList,
                Image: data.wellnessList?.Image
                    ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${data.wellnessList.Image}`
                    : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,
            },
        };
        return {
            success: true,
            message: 'Wellness slot record fetched successfully!',
            // data: wellness
            data: updatedData
        };
    } catch (error) {
        console.error('Error fetching wellness:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }
}


// update wellness slot
module.exports.updateWellnessSlots = async (slotId, data) => {
    try {
        const {
            wellness_id,
            date,
            slot_start_time,
            slot_end_time,
            price,
            slot_location,
            count
        } = data;

        // ✅ Find slot by ID
        const existingSlot = await WellnessSlots.findByPk(slotId);

        if (!existingSlot) {
            return {
                success: false,
                message: 'Wellness slot not found',
                code: 'SLOT_NOT_FOUND'
            };
        }

        // ✅ Duplicate check (simple, same as working create API)
        if (wellness_id && date && slot_start_time && slot_end_time) {
            const duplicateSlot = await WellnessSlots.findOne({
                where: {
                    wellness_id,
                    date,
                    slot_start_time,
                    slot_end_time,
                    id: { [Op.ne]: slotId } // ✅ skip same slot ID
                }
            });

            if (duplicateSlot) {
                return {
                    success: false,
                    message: 'Another slot already exists with the same date & time',
                    code: 'DUPLICATE_SLOT'
                };
            }
        }

        // ✅ Update fields
        await existingSlot.update({
            wellness_id,
            date,
            slot_start_time,
            slot_end_time,
            price,
            slot_location,
            count,
            updatedAt: new Date()
        });

        return {
            success: true,
            message: 'Wellness slot updated successfully',
            data: existingSlot
        };

    } catch (error) {
        console.error('❌ Error updating wellness slot:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};


// deleted wellness slot ..
module.exports.deleteWellnessSlots = async (req) => {
    try {
        const ticketId = req.params.id;
        // ✅ Find existing ticket
        const existingWellness = await WellnessSlots.findByPk(ticketId);
        if (!existingWellness) {
            return {
                success: false,
                message: 'Wellness slot not found',
                code: 'WELLNESS_SLOT_NOT_FOUND'
            };
        }
        // ✅ Delete ticket record
        await existingWellness.destroy();
        return {
            success: true,
            message: 'Wellness slot deleted successfully'
        };
    } catch (error) {
        console.error('Error deleting wellness slot:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'DB_ERROR'
        };
    }
};


// new api create wellness and slots
module.exports.createWellnessWithSlots = async (req) => {
    try {
        const {
            event_id,
            name,
            currency,
            location,
            description,
            tax_applied
        } = req.body;
        const slots = req.body.slots ? JSON.parse(req.body.slots) : [];
        const ticketImage = req.file?.filename;

        // ✅ Basic validations
        if (!event_id || !name || !currency) {
            return {
                success: false,
                message: "Please fill all required fields",
                code: "VALIDATION_FAILED"
            };
        }

        // ✅ Check event exists
        const eventExists = await Event.findByPk(event_id);
        if (!eventExists) {
            return {
                success: false,
                message: "Event not found",
                code: "EVENT_NOT_FOUND"
            };
        }

        // ✅ Duplicate name check
        const exists = await Wellness.findOne({
            where: { event_id, name: name.trim() }
        });

        if (exists) {
            return {
                success: false,
                message: "A wellness already exists with this name under this event",
                code: "DUPLICATE_WELLNESS"
            };
        }

        // ✅ Create main wellness
        const newWellness = await Wellness.create({
            event_id,
            name: name.trim(),
            Image: ticketImage || null,
            description: description || "",
            location,
            currency,
            tax_applied
        });

        // ✅ Add slots if exists
        if (Array.isArray(slots) && slots.length > 0) {
            const slotData = slots.map(s => ({
                wellness_id: newWellness.id,
                date: s.date,
                slot_start_time: s.slot_start_time,
                slot_end_time: s.slot_end_time,
                price: s.price,
                slot_location: s.slot_location,
                count: s.count
            }));

            await WellnessSlots.bulkCreate(slotData);
        }

        return {
            success: true,
            message: "Wellness & Slots created successfully",
            data: newWellness
        };

    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: "Internal server error: " + error.message,
            code: "DB_ERROR"
        };
    }
};



// new Api update wellness and slots..
module.exports.updateWellnessWithSlots = async (req) => {
    try {
        const wellnessId = req.params.id;
        const {
            name,
            currency,
            location,
            description,
            tax_applied
        } = req.body;

        let { event_id, slots } = req.body;

        // ✅ Handle image
        const newImage = req.file?.filename || null;

        // ✅ Parse slots JSON
        try {
            slots = slots ? JSON.parse(slots) : [];
        } catch (err) {
            return {
                success: false,
                message: "Slots must be valid JSON",
                code: "INVALID_SLOTS"
            };
        }

        // ✅ Find wellness
        const existing = await Wellness.findByPk(wellnessId);
        if (!existing) {
            return {
                success: false,
                message: "Wellness not found",
                code: "NOT_FOUND"
            };
        }

        // ✅ Validate event
        event_id = event_id || existing.event_id;
        const eventExists = await Event.findByPk(event_id);

        if (!eventExists) {
            return {
                success: false,
                message: "Event not found",
                code: "EVENT_NOT_FOUND"
            };
        }

        // ✅ Duplicate name check
        const duplicate = await Wellness.findOne({
            where: {
                event_id,
                name: name.trim(),
                id: { [Op.ne]: wellnessId }
            }
        });

        if (duplicate) {
            return {
                success: false,
                message: "A wellness already exists with this name under this event",
                code: "DUPLICATE_WELLNESS"
            };
        }

        // ✅ Replace image if new one uploaded
        let updatedImage = existing.Image;

        if (newImage) {
            const folder = path.join(process.cwd(), "uploads/wellness");
            const oldPath = path.join(folder, existing.Image || "");

            if (existing.Image && fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }

            updatedImage = newImage;
        }

        // ✅ Update main wellness
        await existing.update({
            event_id,
            name: name.trim(),
            currency,
            location,
            description,
            tax_applied,
            Image: updatedImage
        });

        // ✅ SLOT MANAGEMENT LOGIC
        const existingSlots = await WellnessSlots.findAll({
            where: { wellness_id: wellnessId }
        });

        const existingSlotIds = existingSlots.map(s => s.id);
        const incomingSlotIds = slots.filter(s => s.id).map(s => s.id);

        // ✅ Add / Update slots
        for (const s of slots) {
            if (s.id) {
                // ✅ Update existing slot
                await WellnessSlots.update(
                    {
                        date: s.date,
                        slot_start_time: s.slot_start_time,
                        slot_end_time: s.slot_end_time,
                        price: s.price,
                        slot_location: s.slot_location,
                        count: s.count
                    },
                    { where: { id: s.id, wellness_id: wellnessId } }
                );
            } else {
                // ✅ Add new slot
                await WellnessSlots.create({
                    wellness_id: wellnessId,
                    date: s.date,
                    slot_start_time: s.slot_start_time,
                    slot_end_time: s.slot_end_time,
                    price: s.price,
                    slot_location: s.slot_location,
                    count: s.count
                });
            }
        }

        // ✅ Delete removed slots (those not sent by frontend)
        const slotsToDelete = existingSlotIds.filter(id => !incomingSlotIds.includes(id));

        if (slotsToDelete.length > 0) {
            await WellnessSlots.destroy({
                where: { id: slotsToDelete }
            });
        }

        return {
            success: true,
            message: "Wellness & slots updated successfully",
            data: existing
        };

    } catch (error) {
        console.error("❌ Update error:", error);
        return {
            success: false,
            message: "Internal server error: " + error.message,
            code: "DB_ERROR"
        };
    }
};






// view event list in wellness with event_org_id..
module.exports.eventList = async (req, res) => {
    try {
        const { search = {}, status = "" } = req.body || {};
        let whereCondition = {};

        // ✅ If search contains event_org_id (object case)
        if (typeof search === "object" && search.event_org_id) {
            whereCondition.event_org_id = search.event_org_id;
        }

        // ✅ If search is a string (search by name)
        if (typeof search === "string" && search.trim() !== "") {
            whereCondition.name = { [Op.like]: `%${search.trim()}%` };
        }

        // ✅ If search is an object and has name
        if (typeof search === "object" && search.name && search.name.trim() !== "") {
            whereCondition.name = { [Op.like]: `%${search.name.trim()}%` };
        }

        // ✅ Optional: filter by status (Y/N)
        if (status && status.trim() !== "") {
            whereCondition.status = status.trim();
        }

        // ✅ Fetch events with filters applied
        const events = await Event.findAll({
            where: whereCondition,
            attributes:['name','id'],
            order: [["date_from", "DESC"]],
        });

        return res.json({
            success: true,
            message: "Event list fetched successfully",
            data: events,
        });
    } catch (error) {
        console.error("❌ Error fetching event list:", error);

        return res.status(500).json({
            success: false,
            error: {
                code: 500,
                error_code: "SERVER_ERROR",
                message: "Internal server error: " + error.message,
                details: [],
            },
            timestamp: new Date().toISOString(),
        });
    }
};



