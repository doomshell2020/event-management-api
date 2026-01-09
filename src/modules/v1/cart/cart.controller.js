const apiResponse = require('../../../common/utils/apiResponse');
const requestTicket = require('../../../common/utils/emailTemplates/requestTicket');
const sendEmail = require('../../../common/utils/sendEmail');
const { convertUTCToLocal } = require('../../../common/utils/timezone');
const { Cart, TicketType, TicketPricing, AddonTypes, Package, Event, EventSlots, Wellness, WellnessSlots, Company, Currency, User, CommitteeAssignTickets, CommitteeMembers, Questions, QuestionItems, CartQuestionsDetails, PackageDetails } = require('../../../models');
const { Op, Sequelize } = require("sequelize");
const config = require('../../../config/app');


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
                count = 1,
                committee_member_id,
                questionAnswers = []   // ✅ ADD THIS
            } = req.body;

            const user_id = req.user.id;

            /* ================= EVENT CHECK ================= */
            const eventExists = await Event.findByPk(event_id);
            if (!eventExists)
                return apiResponse.error(res, "Event not found", 404);

            /* ========== SINGLE EVENT CART RULE ========== */
            const eventsInCart = await Cart.findAll({
                where: { user_id },
                attributes: ['event_id'],
                group: ['event_id']
            });

            const uniqueEvents = eventsInCart.map(e => e.event_id);

            if (uniqueEvents.length > 1)
                return apiResponse.error(
                    res,
                    "Your cart contains items from multiple events. Please clear the cart.",
                    409
                );

            if (uniqueEvents.length == 1 && !uniqueEvents.includes(event_id))
                return apiResponse.error(
                    res,
                    "Your cart contains items from another event. Clear it first.",
                    409,
                    { cartEventId: uniqueEvents[0] }
                );

            /* ================= ITEM VALIDATION ================= */
            const modelMap = {
                ticket: { id: ticket_id, model: TicketType },
                committesale: { id: ticket_id, model: TicketType },
                addon: { id: addons_id, model: AddonTypes },
                package: { id: package_id, model: Package },
                ticket_price: { id: ticket_price_id, model: TicketPricing },
                appointment: { id: appointment_id, model: WellnessSlots }
            };

            const selected = modelMap[item_type];
            if (!selected || !selected.id)
                return apiResponse.error(res, "Invalid item type or ID", 400);

            if (selected.model) {
                const exists = await selected.model.findByPk(selected.id);
                if (!exists)
                    return apiResponse.error(res, "Item not found", 404);
            }

            /* ================= COMMITTEE LOGIC ================= */
            if (item_type == 'committesale') {

                if (count > 1)
                    return apiResponse.error(
                        res,
                        "Only 1 committee ticket can be requested",
                        400
                    );

                const pendingSameTicket = await Cart.findOne({
                    where: {
                        user_id,
                        event_id,
                        ticket_id,
                        ticket_type: 'committesale',
                        status: 'N'
                    }
                });

                if (pendingSameTicket)
                    return apiResponse.error(
                        res,
                        "You already have a pending request for this committee ticket",
                        400
                    );

                const committeeAssign = await CommitteeAssignTickets.findOne({
                    where: {
                        event_id,
                        ticket_id,
                        user_id: committee_member_id,
                        status: 'Y'
                    }
                });

                if (!committeeAssign)
                    return apiResponse.error(
                        res,
                        "No committee ticket allocation available",
                        400
                    );

                const available =
                    committeeAssign.count - (committeeAssign.usedticket || 0);

                if (available < 1)
                    return apiResponse.error(
                        res,
                        "No committee ticket available for selected member",
                        400
                    );
            }

            /* ================= EXISTING CART CHECK ================= */
            const existing = await Cart.findOne({
                where: {
                    user_id,
                    event_id,
                    ticket_type: item_type,
                    ticket_id:
                        ['ticket', 'committesale'].includes(item_type)
                            ? ticket_id
                            : null,
                    addons_id: item_type == 'addon' ? addons_id : null,
                    package_id: item_type == 'package' ? package_id : null,
                    appointment_id: item_type == 'appointment' ? appointment_id : null,
                    ticket_price_id:
                        item_type == 'ticket_price' ? ticket_price_id : null
                }
            });

            // ❌ Do NOT block different committee tickets
            if (existing && item_type != 'committesale') {
                existing.no_tickets += count;
                await existing.save();
                return apiResponse.success(res, "Cart updated", existing);
            }

            /* ================= CREATE CART ITEM ================= */
            const createData = {
                user_id,
                event_id,
                no_tickets: item_type == 'committesale' ? 1 : count,
                ticket_type: item_type,
                ticket_id: ticket_id || null,
                addons_id: addons_id || null,
                package_id: package_id || null,
                appointment_id: appointment_id || null,
                ticket_price_id: ticket_price_id || null,
                commitee_user_id: item_type == 'committesale' ? committee_member_id : null,
                status: item_type == 'committesale' ? 'N' : 'Y'
            };

            // console.log('>>>>>>>>>>>>',createData);
            // return false


            const newItem = await Cart.create(createData);

            /* ================= SAVE QUESTION ANSWERS ================= */
            if (
                Array.isArray(questionAnswers) &&
                questionAnswers.length > 0 &&
                ['ticket', 'committesale'].includes(item_type)
            ) {
                const questionRows = questionAnswers.map(q => ({
                    cart_id: newItem.id,          // ✅ LINK TO CART
                    event_id,
                    user_id,
                    ticket_id,
                    question_id: q.question_id,
                    user_reply: q.answer,
                    status: 'Y',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }));

                await CartQuestionsDetails.bulkCreate(questionRows);
            }


            /* ================= EMAIL (COMMITTEE) ================= */
            // if (item_type == 'committesale') {
            //     const committeeMember = await User.findByPk(
            //         committee_member_id,
            //         { attributes: ['first_name', 'last_name', 'email'] }
            //     );

            //     if (committeeMember?.email) {
            //         sendEmail(
            //             committeeMember.email,
            //             `Ticket Request for ${eventExists.name}`,
            //             requestTicket({
            //                 RequesterName: `${req.user.firstName} ${req.user.lastName}`,
            //                 CommitteeName: `${committeeMember.first_name} ${committeeMember.last_name}`,
            //                 EventName: eventExists.name,
            //                 URL: `${config.clientUrl}/committee/sales`,
            //                 SITE_URL: config.clientUrl
            //             })
            //         );
            //     }
            // }

            return apiResponse.success(res, "Item added to cart", newItem);

        } catch (error) {
            console.error(error);
            return apiResponse.error(res, "Something went wrong", 500);
        }
    },

    // GET USER CART LIST
    getCart: async (req, res) => {
        try {
            const user_id = req.user.id;
            const { event_id, item_type } = req.query;

            /* ------------------ COMMITTEE CHECK ------------------ */
            const isCommitteeAssigned = await CommitteeAssignTickets.findOne({
                where: { user_id: user_id },
                attributes: ["id"]
            });

            let committeePendingCount = 0;

            if (isCommitteeAssigned) {
                committeePendingCount = await Cart.count({
                    where: {
                        commitee_user_id: user_id,
                        ticket_type: "committesale",
                        status: "N" // Pending
                    }
                });
            }

            let where = {
                user_id,
                ticket_type: { [Op.ne]: "appointment" },
                status: "Y"
            };

            if (event_id) where.event_id = Number(event_id);
            if (item_type) where.ticket_type = item_type;

            // console.log('where :', where);
            const cartList = await Cart.findAll({
                order: [["id", "DESC"]],
                where: where,
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
                    attributes:
                        [
                            "id",
                            "event_org_id",
                            "name",
                            // "desp",
                            "entry_type",
                            "ticket_limit",
                            "location",
                            "feat_image",
                            "date_from",
                            "date_to",
                            "sale_start",
                            "sale_end",
                            "event_timezone"
                        ],
                    include: [
                        {
                            model: TicketPricing,
                            as: "ticketPrices",
                            required: false,
                            attributes: [ "id","price", "date"],
                            include: [
                                {
                                    model: TicketType,
                                    as: "ticket",
                                    required: false,
                                    attributes: ["id", "count", "title", "access_type"],
                                },
                                {
                                    model: EventSlots,
                                    as: "slot",
                                    required: false,
                                    attributes: ["id", "slot_name", "slot_date", "start_time", "end_time", "description"],
                                }
                            ]
                        },
                        {
                            model: TicketType,
                            as: "tickets",
                            required: false,
                            attributes: {
                                exclude: ["createdAt", "updatedAt"]
                            },
                            include: [
                                {
                                    model: CommitteeAssignTickets,
                                    as: "committeeAssignedTickets",
                                    required: false,
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt"]
                                    },
                                    where: {
                                        event_id: ev
                                    },
                                    include: [
                                        {
                                            model: CommitteeMembers,
                                            as: "committeeMember",
                                            required: false,
                                            attributes: ['status'],
                                            where: {
                                                event_id: ev
                                            },
                                            include: [
                                                {
                                                    model: User,
                                                    as: "user",
                                                    attributes: [
                                                        "id",
                                                        "first_name",
                                                        "last_name",
                                                        "email"
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: AddonTypes,
                            as: "addons",
                            attributes: {
                                exclude: ["createdAt", "updatedAt"],
                                include: [
                                    [
                                        Sequelize.literal(`(
                                        SELECT COALESCE(SUM(oi.count), 0)
                                        FROM tbl_order_items AS oi
                                        WHERE 
                                            oi.addon_id = addons.id
                                            AND oi.event_id = ${ev}
                                        )`),
                                        "sales_count"
                                    ]
                                ]
                            }
                        },
                        {
                            model: Package,
                            as: "package",
                            attributes: { exclude: ["CreatedAt", "UpdatedAt"] },
                            include: [
                                {
                                    model: PackageDetails,
                                    as: "details",
                                    attributes: { exclude: ["CreatedAt", "UpdatedAt"] },
                                    include: [
                                        { model: AddonTypes, as: "addonType", attributes: { exclude: ["createdAt", "updatedAt"] } },
                                        { model: TicketType, as: "ticketType", attributes: { exclude: ["createdAt", "updatedAt"] } }
                                    ]
                                },
                            ]
                        },
                        {
                            model: Company,
                            as: "companyInfo",
                            attributes: ["name"]
                        },
                        {
                            model: Currency,
                            as: "currencyName",
                            attributes: ["Currency_symbol", "Currency"]
                        }
                    ]
                });


                let questions = [];
                if (events) {
                    // 🔹 Collect all ticket type IDs from event tickets
                    const ticketTypeIds = (events.tickets || [])
                        .map(ticket => ticket.id)
                        .filter(Boolean);

                    // console.log('ticketTypeIds :', ticketTypeIds);

                    if (ticketTypeIds.length > 0) {
                        questions = await Questions.findAll({
                            where: {
                                status: "Y",
                                event_id: ev,
                                [Op.or]: ticketTypeIds.map(id =>
                                    Sequelize.where(
                                        Sequelize.fn("FIND_IN_SET", id, Sequelize.col("ticket_type_id")),
                                        { [Op.gt]: 0 }
                                    )
                                )
                            },
                            attributes: [
                                "id",
                                "type",
                                "name",
                                "question",
                                "ticket_type_id",
                                "status"
                            ],
                            include: [
                                {
                                    model: QuestionItems,
                                    as: "questionItems",
                                    required: false,
                                    attributes: [
                                        "id",
                                        "items"
                                    ],
                                    order: [["sort_order", "ASC"]]
                                }
                            ],
                            order: [["id", "ASC"]]
                        });
                    }

                }

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
                        sale_end: formatDate(data.sale_end),
                        questions
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
                let committee_member_id = null;

                switch (item.ticket_type) {
                    case "ticket":
                        displayName = item.TicketType?.title || "";
                        ticketPrice = item.TicketType?.price || 0;
                        uniqueId = item.TicketType?.id || null;
                        break;

                    case "committesale":
                        displayName = item.TicketType?.title || "";
                        ticketPrice = item.TicketType?.price || 0;
                        uniqueId = item.TicketType?.id || null;
                        committee_member_id = item.commitee_user_id || null;
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
                    ticket_price: ticketPrice,
                    committee_member_id
                };
            });

            // -------------------------------------------------------
            // ✅ 4) FINAL response
            // -------------------------------------------------------
            return apiResponse.success(res, "Cart fetched", {
                user_id,
                event: formattedEvent,   // may be null if no event id found
                cart: formatted,
                committee: {
                    assigned: !!isCommitteeAssigned,
                    pending_count: committeePendingCount
                },
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
            // 🔹 Fetch Event Currency
            const eventData = await Event.findOne({
                where: { id: event_id },
                attributes: ['id', 'payment_currency'],
                include: {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol", "Currency"]
                }
            });

            // 🔹 Event currency (SAFE)
            const currencySymbol = eventData?.currencyName?.Currency_symbol || "₹";
            const currencyName = eventData?.currencyName?.Currency || "INR";
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
                switch (item.ticket_type) {
                    case "appointment":
                        displayName = item.appointments?.wellnessList?.name || "";
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
                    // ✅ EVENT BASED CURRENCY
                    currency_symbol: currencySymbol,
                    currencyName: currencyName,
                    // currency_symbol: currencySymbol,
                    // currencyName: currencyName,
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
