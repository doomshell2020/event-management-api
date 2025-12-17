const apiResponse = require('../../../common/utils/apiResponse');
const { convertUTCToLocal } = require('../../../common/utils/timezone');
const { Cart, TicketType, TicketPricing, AddonTypes, Package, Event, EventSlots, Wellness, WellnessSlots, Company, Currency } = require('../../../models');
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
            // console.log("--------req.body", req.body)
            // return false
            const user_id = req.user.id;
            // 1️⃣ CHECK EVENT EXISTS
            const eventExists = await Event.findByPk(event_id);
            if (!eventExists)
                return apiResponse.error(res, "Event not found", 404);


            // 2️⃣ CHECK IF CART HAS ITEMS FROM ANOTHER EVENT
            const eventsInCart = await Cart.findAll({
                where: { user_id },
                attributes: ['event_id'],
                group: ['event_id']
            });

            // Array of event IDs already in cart
            const uniqueEvents = eventsInCart.map(e => e.event_id);
            // console.log('uniqueEvents :', uniqueEvents);

            // 🟥 If cart contains items from multiple events → conflict
            if (uniqueEvents.length > 1) {
                return apiResponse.error(
                    res,
                    "Your cart contains items from multiple events. Please clear the cart before adding new items.",
                    409
                );
            }

            // 🟨 If cart contains exactly 1 event → it must match new event_id
            if (uniqueEvents.length == 1 && !uniqueEvents.includes(event_id)) {
                return apiResponse.error(
                    res,
                    "Your cart contains items from another event. Confirm to clear the old cart.",
                    409,
                    { cartEventId: uniqueEvents[0] }
                );
            }

            // 2️⃣ MAP MODEL BASED ON item_type
            const modelMap = {
                ticket: { id: ticket_id, model: TicketType },
                addon: { id: addons_id, model: AddonTypes },
                package: { id: package_id, model: Package },
                ticket_price: { id: ticket_price_id, model: TicketPricing },
                appointment: { id: appointment_id, model: WellnessSlots },

                // Special types
                // committesale: { id: ticket_id || addons_id, model: null },
                // opensale: { id: ticket_id || addons_id, model: null },
            };

            const selected = modelMap[item_type];
            if (!selected)
                return apiResponse.error(res, "Invalid item type", 400);

            // ⭐ 3️⃣ ENSURE AT LEAST ONE ID EXISTS
            const incomingId =
                ticket_id ||
                addons_id ||
                package_id ||
                appointment_id ||
                ticket_price_id ||
                null;

            if (!incomingId)
                return apiResponse.error(res, "No valid item ID provided", 400);

            // ⭐ 4️⃣ VALIDATE PROVIDED ID EXISTS IN DB
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

            // 3️⃣ Validate item exists (except special)
            if (!["committesale", "opensale"].includes(item_type)) {
                if (!selected.id)
                    return apiResponse.error(res, `${item_type}_id is required`, 400);

                const itemExists = await selected.model.findByPk(selected.id);
                if (!itemExists)
                    return apiResponse.error(res, `${item_type} not found`, 404);
            }
            // 4️⃣ CHECK IF SAME ITEM ALREADY IN CART
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

            // 5️⃣ CREATE NEW CART ENTRY
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

            let where = {
                user_id,
                ticket_type: { [Op.ne]: "appointment" }
            };

            if (event_id) where.event_id = event_id;
            if (item_type) where.ticket_type = item_type;

            const cartList = await Cart.findAll({
                where,
                order: [["id", "DESC"]],
                include: [
                    { model: TicketType, attributes: ["id", "title", "price"] },
                    { model: AddonTypes, attributes: ["id", "name", "price"] },
                    { model: Package, attributes: ["id", "name", "grandtotal"] },
                    {
                        model: TicketPricing,
                        attributes: ["id", "price", "ticket_type_id", "event_slot_id"],
                        include: [
                            {
                                model: TicketType,
                                as: 'ticket',
                                attributes: ['id', 'title', 'access_type', 'type', 'price']
                            },
                            {
                                model: EventSlots,
                                as: 'slot',
                                attributes: ['id', 'slot_name', 'slot_date', 'start_time', 'end_time']
                            }
                        ]
                    }
                ]
            });

            // -------------------------------------------------------
            // ✅ 1) Decide which event ID we must fetch
            // -------------------------------------------------------
            let ev = null;

            if (event_id) {
                ev = event_id;                     // Use event id from query
            } else if (cartList.length > 0) {
                ev = cartList[0].event_id;         // Otherwise use event id from cart
            }

            // -------------------------------------------------------
            // ✅ 2) Fetch event details ONLY when event id exists
            // -------------------------------------------------------
            let formattedEvent = null;

            if (ev) {
                const baseUrl = process.env.BASE_URL || "http://localhost:5000";
                const imagePath = "uploads/events";

                const events = await Event.findOne({
                    where: { id: ev },
                    include: [
                        { model: TicketType, as: "tickets" },
                        // { model: TicketPricing, as: "ticket_pricing", include: [{ model: TicketType, as: "ticket" }] },
                        { model: AddonTypes, as: "addons" },
                        { model: Company, as: "companyInfo", attributes: ["name"] },
                        { model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }
                    ],
                    attributes: [
                        "id",
                        "event_org_id",
                        "name",
                        "desp",
                        "location",
                        "feat_image",
                        "date_from",
                        "date_to",
                        "sale_start",
                        "sale_end",
                        "event_timezone"
                    ]
                });

                if (events) {
                    const data = events.toJSON();
                    const tz = data.event_timezone || "UTC";

                    const formatDate = (date) =>
                        date
                            ? {
                                utc: date,
                                local: convertUTCToLocal(date, tz),
                                timezone: tz
                            }
                            : null;

                    formattedEvent = {
                        ...data,
                        feat_image: data.feat_image
                            ? `${baseUrl}${imagePath}/${data.feat_image}`
                            : `${baseUrl}${imagePath}/default.jpg`,
                        date_from: formatDate(data.date_from),
                        date_to: formatDate(data.date_to),
                        sale_start: formatDate(data.sale_start),
                        sale_end: formatDate(data.sale_end)
                    };
                }
            }

            // -------------------------------------------------------
            // ✅ 3) Format Cart Items
            // -------------------------------------------------------
            const formatted = cartList.map((item) => {
                let displayName = "";
                let ticketPrice = 0;
                let uniqueId = null;

                switch (item.ticket_type) {
                    case "ticket":
                        displayName = item.TicketType?.title || "";
                        ticketPrice = item.TicketType?.price || 0;
                        uniqueId = item.TicketType?.id || null;
                        break;

                    case "addon":
                        displayName = item.AddonType?.name || "";
                        ticketPrice = item.AddonType?.price || 0;
                        uniqueId = item.AddonType?.id || null;
                        break;

                    case "package":
                        displayName = item.Package?.name || "";
                        ticketPrice = item.Package?.grandtotal || 0;
                        uniqueId = item.Package?.id || null;
                        break;

                    case "ticket_price":
                        displayName =
                            item.TicketPricing?.slot?.slot_name ||
                            item.TicketPricing?.ticket?.title ||
                            "Ticket Price";
                        ticketPrice = item.TicketPricing?.price || 0;
                        uniqueId = item.TicketPricing?.id || null;
                        break;

                    default:
                        displayName = "Unknown Item";
                        ticketPrice = 0;
                }

                return {
                    id: item.id,
                    uniqueId,
                    event_id: item.event_id,
                    item_type: item.ticket_type,
                    display_name: displayName,
                    count: item.no_tickets,
                    ticket_price: ticketPrice
                };
            });

            // -------------------------------------------------------
            // ✅ 4) FINAL response
            // -------------------------------------------------------
            return apiResponse.success(res, "Cart fetched", {
                event: formattedEvent,   // may be null if no event id found
                cart: formatted
            });

        } catch (error) {
            console.log(error);
            return apiResponse.error(res, "Error fetching cart", 500);
        }
    },

    // GET USER CART LIST - APPOINTMENT - KAMAL
    getAppointmentCart: async (req, res) => {
        try {
            const user_id = req.user.id;
            const { event_id } = req.query;
            const item_type = "appointment"

            let where = { user_id };
            if (event_id) where.event_id = event_id;
            if (item_type) where.ticket_type = item_type;
            const cartList = await Cart.findAll({
                where,
                order: [["id", "DESC"]],
                include: [
                    {
                        model: WellnessSlots,
                        as: 'appointments',
                        // attributes: ["id", "title", "price"]
                        include: [{
                            model: Wellness, as: 'wellnessList',
                            include: {
                                model: Currency,
                                as: 'currencyName',
                                attributes: ['Currency_symbol', 'Currency']
                            }
                        }]
                    }
                ]
            });

            // console.log("-----------appointment----------cartList", cartList)
            // ---------------------------------------------
            // FORMAT FINAL RESPONSE (Ticket / Slot Logic)
            // ---------------------------------------------
            const formatted = cartList.map((item) => {
                let displayName = "";
                let currencySymbol = '';
                let currencyName = '';
                // console.log("item.ticket_type",item.appointments?.price)
                switch (item.ticket_type) {
                    case "appointment":
                        displayName = item.appointments?.wellnessList?.name || "";
                        currencySymbol = item.appointments?.wellnessList?.currencyName?.Currency_symbol || "";
                        currencyName = item.appointments?.wellnessList?.currencyName?.Currency || "";
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
                    currency_symbol: currencySymbol,
                    currencyName: currencyName,
                    ticket_price: item.appointments?.price || null,
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
            const user_id = req.user.id;

            const item = await Cart.findByPk(cart_id);
            if (!item)
                return apiResponse.error(res, "Cart item not found", 404);

            // ==========================Cart Clear===========================
            const eventsInCart = await Cart.findAll({
                where: { user_id },
                attributes: ['event_id'],
                group: ['event_id']
            });
            const uniqueEvents = eventsInCart.map(e => e.event_id);
            if (uniqueEvents.length > 1) {
                return apiResponse.error(
                    res,
                    "Your cart contains items from multiple events. Please clear the cart before adding new items.",
                    409
                );
            }
            if (uniqueEvents.length == 1 && uniqueEvents[0] != item.event_id) {
                return apiResponse.error(
                    res,
                    "Your cart contains items from another event. Confirm to clear the old cart.",
                    409,
                    { cartEventId: uniqueEvents[0] }
                );
            }
            // =====================================================

            // NO CONFLICT → increase quantity
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
            const user_id = req.user.id;

            const item = await Cart.findByPk(cart_id);

            if (!item)
                return apiResponse.error(res, "Cart item not found", 404);

            // =====================================================
            // CHECK EVENT CONFLICT
            const eventsInCart = await Cart.findAll({
                where: { user_id },
                attributes: ['event_id'],
                group: ['event_id']
            });

            const uniqueEvents = eventsInCart.map(e => e.event_id);

            // 1️⃣ MULTIPLE EVENTS FOUND
            if (uniqueEvents.length > 1) {
                return apiResponse.error(
                    res,
                    "Your cart contains items from multiple events. Please clear the cart before modifying items.",
                    409
                );
            }

            // 2️⃣ ONE EVENT — CHECK MATCH
            if (uniqueEvents.length == 1 && uniqueEvents[0] != item.event_id) {
                return apiResponse.error(
                    res,
                    "Your cart contains items from another event. Confirm to clear the old cart.",
                    409,
                    { cartEventId: uniqueEvents[0] }
                );
            }
            // =====================================================

            // DECREASE LOGIC
            item.no_tickets -= 1;

            // Auto-remove if reach zero
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
