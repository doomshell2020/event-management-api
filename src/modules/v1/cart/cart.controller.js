<<<<<<< HEAD
const cartService = require('./cart.service');
const apiResponse = require('../../../common/utils/apiResponse');
const path = require('path');
const fs = require('fs');


// add wellness...
module.exports.addToCartAppointment = async (req, res) => {
    try {
        const { user_id,event_id,appointment_id,ticket_type } = req.body;
        if (!event_id || !user_id || !appointment_id) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }
        // ✅ Call service to create ticket
        const result = await cartService.addToCartAppointment(req);
        // ✅ Handle service errors
        if (!result.success) {
            switch (result.code) {
                case 'EVENT_NOT_FOUND':
                    return apiResponse.notFound(res, 'Associated event not found');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while adding cart');
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                case 'DUPLICATE_WELLNESS':
                    return apiResponse.conflict(res, result.message || '');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }
        // ✅ Success response
        return apiResponse.success(res, 'Appointment added to cart successfully', result.data);
    } catch (error) {
        console.error('Error in adding cart:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};


// Deleted cart data 
module.exports.deleteCart = async (req, res) => {
    try {
        const cartId = req.params.id;
        // ✅ Validate ID param
        if (!cartId) {
            return apiResponse.validation(res, [], 'Cart ID is required');
        }
        // ✅ Call service to delete ticket
        const result = await cartService.deleteCart(req);
        // ✅ Handle service-layer errors
        if (!result.success) {
            switch (result.code) {
                case 'CART_NOT_FOUND':
                    return apiResponse.notFound(res, 'cart not found');
                case 'FORBIDDEN':
                    return apiResponse.forbidden(res, 'You are not authorized to delete this cart');
                case 'DB_ERROR':
                    return apiResponse.error(res, 'Database error occurred while deleting cart');
                default:
                    return apiResponse.error(res, result.message || 'An unknown error occurred');
            }
        }
        // ✅ Success response
        return apiResponse.success(res, 'Cart deleted successfully');
    } catch (error) {
        console.error('Error in deleteCart:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};

// cart view Api
module.exports.getCartById = async (req, res) => {
    try {
        const result = await cartService.getCartById(req, res);
        if (!result.success) {
            switch (result.code) {
                case 'VALIDATION_FAILED':
                    return apiResponse.validation(res, [], result.message);
                default:
                    return apiResponse.error(res, result.message);
            }
        }
        const cartData = result.data || {};
        return apiResponse.success(
            res,
            result.message || 'Cart record fetched successfully',
            { cart: cartData }   // singular because findOne
        );
    } catch (error) {
        console.log('Error in cartFindOne controller:', error);
        return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
    }
};


// // update wellness
// module.exports.updateWellness = async (req, res) => {
//     try {
//         const ticketId = req.params.id;
//         // ✅ Handle optional file upload
//         const filename = req.file?.filename || null;
//         const uploadFolder = path.join(process.cwd(), 'uploads/wellness');
//         const fullFilePath = filename ? path.join(uploadFolder, filename) : null;
//         // ✅ Validate ID param
//         if (!ticketId) {
//             if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
//             return apiResponse.validation(res, [], 'Ticket ID is required');
//         }
//         // ✅ Validate fields
//         const { name, event_id, description, location, currency } = req.body;

//         if (!event_id || !name || !currency) {
//             if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
//             return apiResponse.validation(res, [], 'Required fields are missing');
//         }

//         // ✅ Call service to update ticket
//         const result = await wellnessService.updateWellness(req);

//         // ✅ Handle service-layer errors
//         if (!result.success) {
//             if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);

//             switch (result.code) {
//                 case 'TICKET_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Ticket not found');
//                 case 'EVENT_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Associated event not found');
//                 case 'DB_ERROR':
//                     return apiResponse.error(res, 'Database error occurred while updating ticket');
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 case 'DUPLICATE_TICKET':
//                     return apiResponse.conflict(res, result.message || '');
//                 default:
//                     return apiResponse.error(res, result.message || 'An unknown error occurred');
//             }
//         }

//         // ✅ Success response
//         return apiResponse.success(res, 'Ticket updated successfully', result.data);

//     } catch (error) {
//         console.error('Error in updateTicket:', error);
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// };

// // deleted wellness
// module.exports.deleteWellness = async (req, res) => {
//     try {
//         const wellnessId = req.params.id;

//         // ✅ Validate ID param
//         if (!wellnessId) {
//             return apiResponse.validation(res, [], 'Ticket ID is required');
//         }

//         // ✅ Call service to delete ticket
//         const result = await wellnessService.deleteWellness(req);

//         // ✅ Handle service-layer errors
//         if (!result.success) {
//             switch (result.code) {
//                 case 'WELLNESS_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Wellness not found');
//                 case 'FORBIDDEN':
//                     return apiResponse.forbidden(res, 'You are not authorized to delete this wellness');
//                 case 'DB_ERROR':
//                     return apiResponse.error(res, 'Database error occurred while deleting wellness');
//                 default:
//                     return apiResponse.error(res, result.message || 'An unknown error occurred');
//             }
//         }
//         // ✅ Success response
//         return apiResponse.success(res, 'Wellness deleted successfully');
//     } catch (error) {
//         console.error('Error in deleteWellness:', error);
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// };




// // ..Wellness Lists
// module.exports.wellnessList = async (req, res) => {
//     try {
//         const result = await wellnessService.wellnessList(req, res);

//         if (!result.success) {
//             switch (result.code) {
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 default:
//                     return apiResponse.error(res, result.message);
//             }
//         }
//         return apiResponse.success(
//             res,
//             result.message || 'Wellness list fetched successfully',
//             { wellness: result.data }  // plural naming convention
//         );
//     } catch (error) {
//         console.log('Error in eventList controller:', error);
//         return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
//     }
// };


// // .. Wellness findOne
// module.exports.getWellnessById = async (req, res) => {
//     try {
//         const result = await wellnessService.getWellnessById(req, res);
//         if (!result.success) {
//             switch (result.code) {
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 default:
//                     return apiResponse.error(res, result.message);
//             }
//         }
//         const wellnessData = result.data || {};
//         return apiResponse.success(
//             res,
//             result.message || 'Wellness record fetched successfully',
//             { wellness: wellnessData }   // singular because findOne
//         );

//     } catch (error) {
//         console.log('Error in wellnessFindOne controller:', error);
//         return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
//     }
// };


// // ...
// module.exports.createWellnessSlots = async (req, res) => {
//     try {

//         const { wellness_id, date } = req.body;

//         if (!wellness_id || !date) {
//             return apiResponse.validation(res, [], 'Required fields are missing');
//         }

//         // if (type == 'Select' && !items || Array.isArray(items) && items.length == 0) {
//         //     return apiResponse.validation(res, [], 'Items is required for select options');
//         // }

//         // ✅ Call service to create ticket
//         const result = await wellnessService.createWellnessSlots(req);
//         // ✅ Handle service errors
//         if (!result.success) {

//             switch (result.code) {
//                 case 'EVENT_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Associated event not found');
//                 case 'DB_ERROR':
//                     return apiResponse.error(res, 'Database error occurred while creating wellness slots');
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 case 'DUPLICATE':
//                     return apiResponse.conflict(res, result.message || '');
//                 default:
//                     return apiResponse.error(res, result.message || 'An unknown error occurred');
//             }
//         }

//         // ✅ Success response
//         return apiResponse.success(res, 'Wellness slots created successfully', result.data);

//     } catch (error) {
//         console.error('Error in createWe:', error);
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// }

// // wellness slots lists
// module.exports.wellnessSlotsList = async (req, res) => {
//     try {
//         const result = await wellnessService.wellnessSlotsList(req, res);
//         if (!result.success) {
//             switch (result.code) {
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 default:
//                     return apiResponse.error(res, result.message);
//             }
//         }
//         return apiResponse.success(
//             res,
//             result.message || 'Wellness slots list fetched successfully',
//             { wellness: result.data }  // plural naming convention
//         );
//     } catch (error) {
//         console.log('Error in wellness slots controller:', error);
//         return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
//     }
// };

// // wellness slots list..
// module.exports.getWellnessSlotById = async (req, res) => {
//     try {
//         const result = await wellnessService.getWellnessSlotById(req, res);
//         if (!result.success) {
//             switch (result.code) {
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 default:
//                     return apiResponse.error(res, result.message);
//             }
//         }
//         const wellnessData = result.data || {};
//         return apiResponse.success(
//             res,
//             result.message || 'Wellness slots record fetched successfully',
//             { wellness: wellnessData }   // singular because findOne
//         );

//     } catch (error) {
//         console.log('Error in wellness slot findOne controller:', error);
//         return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
//     }
// };


// // ..../
// module.exports.updateWellnessSlots = async (req, res) => {
//     try {
//         const slotId = req.params.id;
//         // ✅ Basic validation
//         if (!slotId) {
//             return apiResponse.validation(res, [], 'Question ID is required');
//         }
//         // ✅ Call service to update the question
//         const result = await wellnessService.updateWellnessSlots(slotId, req.body);

//         // ✅ Handle service errors
//         if (!result.success) {
//             switch (result.code) {
//                 case 'WELLNESS_SLOT_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Slot not found');
//                 case 'EVENT_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Associated event not found');
//                 case 'DB_ERROR':
//                     return apiResponse.error(res, 'Database error occurred while updating wellness slot');
//                 case 'VALIDATION_FAILED':
//                     return apiResponse.validation(res, [], result.message);
//                 default:
//                     return apiResponse.error(res, result.message || 'An unknown error occurred');
//             }
//         }

//         // ✅ Success response
//         return apiResponse.success(res, 'Wellness Slot updated successfully', result.data);

//     } catch (error) {
//         console.error('Error in updateWellnessSlot:', error);
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// };

// // wellness slots deleted
// module.exports.deleteWellnessSlots = async (req, res) => {
//     try {
//         const wellnessSlotId = req.params.id;

//         // ✅ Validate ID param
//         if (!wellnessSlotId) {
//             return apiResponse.validation(res, [], 'Wellness Slot ID is required');
//         }

//         // ✅ Call service to delete ticket
//         const result = await wellnessService.deleteWellnessSlots(req);

//         // ✅ Handle service-layer errors
//         if (!result.success) {
//             switch (result.code) {
//                 case 'WELLNESS_NOT_FOUND':
//                     return apiResponse.notFound(res, 'Wellness slot not found');
//                 case 'FORBIDDEN':
//                     return apiResponse.forbidden(res, 'You are not authorized to delete this wellness');
//                 case 'DB_ERROR':
//                     return apiResponse.error(res, 'Database error occurred while deleting wellness');
//                 default:
//                     return apiResponse.error(res, result.message || 'An unknown error occurred');
//             }
//         }
//         // ✅ Success response
//         return apiResponse.success(res, 'Wellness slot deleted successfully');
//     } catch (error) {
//         console.error('Error in deleteWellness:', error);
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// };




// // new api create wellness and slots..
// module.exports.createWellnessWithSlots = async (req, res) => {
//     try {
//         // ✅ Image Handling
//         const filename = req.file?.filename || null;
//         const uploadFolder = path.join(process.cwd(), "uploads/wellness");
//         const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

//         // ✅ Extract FormData fields
//         const { name, event_id, description, location, currency } = req.body;
//         let { slots } = req.body;
//         // ✅ Validate Required Fields
//         if (!event_id || !name || !currency) {
//             return apiResponse.validation(res, [], "Required fields are missing");
//         }

//         // ✅ Parse Slots JSON (coming from form-data)
//         try {
//             slots = JSON.parse(slots);
//         } catch (err) {
//             return apiResponse.validation(res, [], "Slots must be valid JSON array");
//         }

//         if (!Array.isArray(slots) || slots.length === 0) {
//             return apiResponse.validation(res, [], "At least 1 slot is required");
//         }

//         // ✅ Call SERVICE (Only ONCE)
//         const wellnessResult = await wellnessService.createWellnessWithSlots(req);

//         if (!wellnessResult.success) {
//             // ✅ Delete uploaded image on failure
//             if (fullFilePath && fs.existsSync(fullFilePath)) {
//                 fs.unlinkSync(fullFilePath);
//                 console.log("🧹 Uploaded image removed due to failure");
//             }

//             return apiResponse.error(res, wellnessResult.message);
//         }

//         // ✅ Response
//         return apiResponse.success(
//             res,
//             "Wellness + Slots created successfully",
//             wellnessResult.data
//         );

//     } catch (error) {
//         console.error("❌ Error in Wellness + Slots:", error);
//         return apiResponse.error(res, "Internal Server Error", 500);
//     }
// };

// // update wellness..

// module.exports.updateWellnessWithSlots = async (req, res) => {
//     try {
//         const wellnessId = req.params.id;

//         // ✅ File Upload (Image)
//         const filename = req.file?.filename || null;
//         const uploadFolder = path.join(process.cwd(), 'uploads/wellness');
//         const fullFilePath = filename ? path.join(uploadFolder, filename) : null;

//         // ✅ Validate ID
//         if (!wellnessId) {
//             if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
//             return apiResponse.validation(res, [], 'Wellness ID is required');
//         }

//         // ✅ Validate required fields
//         const { name, event_id, currency } = req.body;

//         if (!event_id || !name || !currency) {
//             if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
//             return apiResponse.validation(res, [], 'Required fields are missing');
//         }

//         // ✅ Call service (single function handles BOTH updates)
//         const result = await wellnessService.updateWellnessWithSlots(req);

//         // ✅ Handle service errors
//         if (!result.success) {
//             if (fullFilePath && fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);

//             return apiResponse.error(
//                 res,
//                 result.message || "Update failed",
//                 result.code
//             );
//         }

//         // ✅ Success
//         return apiResponse.success(res, "Wellness & Slots updated successfully", result.data);

//     } catch (error) {
//         console.error("❌ Error in updateWellness:", error);
//         return apiResponse.error(res, "Internal Server Error", 500);
//     }
// };



// module.exports.eventList = async (req, res) => {
//   try {
//     const result = await wellnessService.eventList(req, res);

//     if (!result.success) {
//       switch (result.code) {
//         case 'VALIDATION_FAILED':
//           return apiResponse.validation(res, [], result.message);
//         default:
//           return apiResponse.error(res, result.message);
//       }
//     }
//     return apiResponse.success(
//       res,
//       result.message || 'Event list fetched successfully',
//       { events: result.data }  // plural naming convention
//     );

//   } catch (error) {
//     console.log('Error in eventList controller:', error);
//     return apiResponse.error(res, 'Internal server error: ' + error.message, 500);
//   }
// };



=======
const apiResponse = require('../../../common/utils/apiResponse');
const { Cart, TicketType, TicketPricing, AddonTypes, Package, Event,EventSlots } = require('../../../models');
const { Op } = require('sequelize');

module.exports = {

    // ADD ITEM TO CART
    addToCart: async (req, res) => {
        try {
            const {
                event_id,
                ticket_id,
                addons_id,
                package_id,
                appointment_id,
                ticket_price_id,
                item_type,
                count
            } = req.body;

            const user_id = req.user.id;

            // --------------------------------------------------
            // 1️⃣ CHECK EVENT EXISTS
            // --------------------------------------------------
            const eventExists = await Event.findByPk(event_id);
            if (!eventExists)
                return apiResponse.error(res, "Event not found", 404);

            // --------------------------------------------------
            // 2️⃣ MAP MODEL BASED ON item_type
            // --------------------------------------------------
            const modelMap = {
                ticket: { id: ticket_id, model: TicketType },
                addon: { id: addons_id, model: AddonTypes },
                package: { id: package_id, model: Package },
                ticket_price: { id: ticket_price_id, model: TicketPricing }
                // appointment: { id: appointment_id, model: Appointment },

                // Special types
                // committesale: { id: ticket_id || addons_id, model: null },
                // opensale: { id: ticket_id || addons_id, model: null },
            };

            const selected = modelMap[item_type];
            if (!selected)
                return apiResponse.error(res, "Invalid item type", 400);

            // --------------------------------------------------
            // ⭐ 3️⃣ ENSURE AT LEAST ONE ID EXISTS
            // --------------------------------------------------
            const incomingId =
                ticket_id ||
                addons_id ||
                package_id ||
                appointment_id ||
                ticket_price_id ||
                null;

            if (!incomingId)
                return apiResponse.error(res, "No valid item ID provided", 400);

            // --------------------------------------------------
            // ⭐ 4️⃣ VALIDATE PROVIDED ID EXISTS IN DB
            // (Only for valid item types)
            // --------------------------------------------------
            if (selected.model) {
                const itemExists = await selected.model.findByPk(selected.id);

                if (!itemExists) {
                    return apiResponse.error(
                        res,
                        `${item_type} with provided ID not found`,
                        404
                    );
                }
            }

            // --------------------------------------------------
            // 3️⃣ Validate item exists (except special)
            // --------------------------------------------------
            if (!["committesale", "opensale"].includes(item_type)) {
                if (!selected.id)
                    return apiResponse.error(res, `${item_type}_id is required`, 400);

                const itemExists = await selected.model.findByPk(selected.id);
                if (!itemExists)
                    return apiResponse.error(res, `${item_type} not found`, 404);
            }
            // --------------------------------------------------
            // 4️⃣ CHECK IF SAME ITEM ALREADY IN CART
            // --------------------------------------------------
            const existing = await Cart.findOne({
                where: {
                    user_id,
                    event_id,
                    ticket_type: item_type,
                    ticket_id: item_type == "ticket" ? ticket_id : null,
                    addons_id: item_type == "addon" ? addons_id : null,
                    package_id: item_type == "package" ? package_id : null,
                    appointment_id: item_type == "appointment" ? appointment_id : null,
                    ticket_price_id: item_type == "ticket_price" ? ticket_price_id : null
                }
            });

            if (existing) {
                existing.no_tickets += count;
                await existing.save();
                return apiResponse.success(res, "Item quantity updated", existing);
            }

            // --------------------------------------------------
            // 5️⃣ CREATE NEW CART ENTRY
            // --------------------------------------------------
            const createData = {
                user_id,
                event_id,
                no_tickets: count,
                ticket_type: item_type,
                ticket_price_id: ticket_price_id || null
            };

            if (ticket_id) createData.ticket_id = ticket_id;
            if (addons_id) createData.addons_id = addons_id;
            if (package_id) createData.package_id = package_id;
            if (appointment_id) createData.appointment_id = appointment_id;

            // console.log('>>>>>>>>>>>>>>', createData); return
            const newItem = await Cart.create(createData);
            return apiResponse.success(res, "Item added to cart", newItem);

        } catch (error) {
            console.log(error);
            return apiResponse.error(res, "Something went wrong", 500);
        }
    },

    // GET USER CART LIST
    getCart: async (req, res) => {
        try {
            const user_id = req.user.id;
            const { event_id, item_type } = req.query;

            let where = { user_id };
            if (event_id) where.event_id = event_id;
            if (item_type) where.ticket_type = item_type;
            // console.log('where :', where);

            const cartList = await Cart.findAll({
                where,
                order: [["id", "DESC"]],
                include: [
                    {
                        model: TicketType,
                        attributes: ["id", "title","price"]
                    },
                    {
                        model: AddonTypes,
                        attributes: ["id", "name"]
                    },
                    {
                        model: Package,
                        attributes: ["id", "name"]
                    },
                    {
                        model: TicketPricing,
                        attributes: ["id", "price", "ticket_type_id", "event_slot_id"],
                        include: [
                            {
                                model: TicketType,
                                as: 'ticket', // ✔ MATCHES association
                                attributes: ['id', 'title', 'access_type', 'type','price']
                            },
                            {
                                model: EventSlots,
                                as: 'slot', // ✔ MATCHES association
                                attributes: ['id', 'slot_name', 'slot_date', 'start_time', 'end_time']
                            }
                        ]
                    }
                ]
            });

            // ---------------------------------------------
            // FORMAT FINAL RESPONSE (Ticket / Slot Logic)
            // ---------------------------------------------
            const formatted = cartList.map((item) => {
                let displayName = "";

                switch (item.ticket_type) {

                    case "ticket":
                        displayName = item.TicketType?.title || "";
                        break;

                    case "addon":
                        displayName = item.AddonType?.name || "";
                        break;

                    case "package":
                        displayName = item.Package?.name || "";
                        break;

                    case "ticket_price":
                        // slot name > ticket name fallback
                        displayName =
                            item.TicketPricing?.slot_name ||
                            item.TicketPricing?.ticket_name ||
                            "";
                        break;

                    default:
                        displayName = "Unknown Item";
                }

                return {
                    id: item.id,
                    event_id: item.event_id,
                    item_type: item.ticket_type,
                    display_name: displayName,
                    count: item.no_tickets,
                    ticket_price: item.TicketPricing?.price || null,
                    raw: item
                };
            });

            return apiResponse.success(res, "Cart fetched", formatted);

        } catch (error) {
            console.log(error);
            return apiResponse.error(res, "Error fetching cart", 500);
        }
    },

    // INCREASE ITEM COUNT
    increaseItem: async (req, res) => {
        try {
            const { cart_id } = req.params;

            const item = await Cart.findByPk(cart_id);

            if (!item)
                return apiResponse.error(res, "Cart item not found", 404);

            item.no_tickets += 1;
            await item.save();

            return apiResponse.success(res, "Item quantity increased", item);

        } catch (error) {
            return apiResponse.error(res, "Error increasing item", 500);
        }
    },

    // DECREASE ITEM COUNT
    decreaseItem: async (req, res) => {
        try {
            const { cart_id } = req.params;

            const item = await Cart.findByPk(cart_id);

            if (!item)
                return apiResponse.error(res, "Cart item not found", 404);

            item.no_tickets -= 1;

            // Auto remove if hits zero
            if (item.no_tickets <= 0) {
                await item.destroy();
                return apiResponse.success(res, "Item removed from cart", null);
            }

            await item.save();

            return apiResponse.success(res, "Item quantity decreased", item);

        } catch (error) {
            return apiResponse.error(res, "Error decreasing item", 500);
        }
    },

    // REMOVE ITEM FROM CART
    removeItem: async (req, res) => {
        try {
            const { cart_id } = req.params;

            const item = await Cart.findByPk(cart_id);

            if (!item)
                return apiResponse.error(res, "Cart item not found", 404);

            await item.destroy();

            return apiResponse.success(res, "Item removed", null);

        } catch (error) {
            return apiResponse.error(res, "Error removing item", 500);
        }
    },

    // CLEAR CART
    clearCart: async (req, res) => {
        try {
            const user_id = req.user.id;

            await Cart.destroy({ where: { user_id } });

            return apiResponse.success(res, "Cart cleared", null);

        } catch (error) {
            return apiResponse.error(res, "Error clearing cart", 500);
        }
    },

    // GET CART COUNT
    getCartCount: async (req, res) => {
        try {
            const user_id = req.user.id;

            const count = await Cart.count({ where: { user_id } });

            return apiResponse.success(res, "Cart count fetched", { count });

        } catch (error) {
            return apiResponse.error(res, "Error fetching cart count", 500);
        }
    },

};
>>>>>>> d752298c8b012986d29f1b11791218ddc1c9c5b2
