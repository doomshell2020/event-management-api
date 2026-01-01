const apiResponse = require('../../../common/utils/apiResponse');
const { Cart, Payment, QuestionsBook, CartQuestionsDetails, PaymentSnapshotItems, Orders, TicketType, AddonTypes, TicketPricing, Package, EventSlots, OrderItems, Event, WellnessSlots, Wellness, User, Company, Currency, Questions, QuestionItems } = require('../../../models');
const { generateQRCode } = require("../../../common/utils/qrGenerator");
const orderConfirmationTemplateWithQR = require('../../../common/utils/emailTemplates/orderConfirmationWithQR');
const appointmentConfirmationTemplateWithQR = require('../../../common/utils/emailTemplates/appointmentConfirmationTemplate');
const sendEmail = require('../../../common/utils/sendEmail');
const path = require("path");
const { generateUniqueOrderId } = require('../../../common/utils/helpers');
const { convertUTCToLocal } = require('../../../common/utils/timezone');
const { Op, fn, col, literal } = require("sequelize");
const config = require('../../../config/app');

// Convert to user-friendly readable format
const formatDateReadable = (dateStr, timezone) => {
    if (!dateStr) return "";

    const date = new Date(dateStr);

    return date.toLocaleString("en-US", {
        timeZone: timezone,
        weekday: "long",
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
};

exports.organizerTicketExports = async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";

        const qrPath = "uploads/qr_codes";
        const eventImagePath = "uploads/events";

        const organizerId = req.user.id;
        // console.log('organizerId :', organizerId);
        const { page = 1, limit = config.perPageDataLimit, eventId } = req.query;

        const pageNumber = parseInt(page);
        const pageLimit = parseInt(limit);

        if (!eventId) {
            return apiResponse.success(res, "Event ID is required", {
                qr_base_path: `${baseUrl}/${qrPath}/`,
                event_image_base_path: `${baseUrl}/${eventImagePath}/`,
                totalRecords: 0,
                totalPages: 0,
                currentPage: 1,
                limit: pageLimit,
                records: []
            });
        }

        const event = await Event.findOne({
            where: { event_org_id: organizerId, id: eventId },
            attributes: ["id"]
        });


        if (!event) {
            return apiResponse.success(res, "No event found for this organizer.", {
                qr_base_path: `${baseUrl}/${qrPath}/`,
                event_image_base_path: `${baseUrl}/${eventImagePath}/`,
                totalRecords: 0,
                totalPages: 0,
                currentPage: 1,
                limit: pageLimit,
                records: []
            });
        }

        const where = { event_id: parseInt(eventId) };
        const totalRecords = await OrderItems.count({ where });

        const items = await OrderItems.findAll({
            where,
            attributes: { exclude: ["qr_data"] },
            include: [
                {
                    model: Orders,
                    as: "order",
                    attributes: ["order_uid", "grand_total"],
                    include: [
                        {
                            model: User,
                            as: "user",
                            attributes: ["id", "first_name", "last_name", "email"]
                        }
                    ]
                },
                {
                    model: TicketType,
                    as: "ticketType",
                    attributes: ["title", "price"]
                },
                {
                    model: Package,
                    as: "package",
                    attributes: ["name", "grandtotal"]
                },
                {
                    model: AddonTypes,
                    as: "addonType",
                    attributes: ["name", "price"]
                },
                {
                    model: EventSlots,
                    as: "slot",
                    attributes: ["slot_name", "start_time", "end_time"]
                },
                {
                    model: WellnessSlots,
                    as: "appointment",
                    attributes: ["slot_location"],
                    include: [
                        {
                            model: Wellness,
                            as: "wellnessList",
                            attributes: ["name"]
                        }
                    ]
                },
                {
                    model: Event,
                    as: "event",
                    attributes: ["name", "feat_image", "date_from", "date_to"],
                    include: [
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
                },
                {
                    model: QuestionsBook,
                    as: "questionsBook",
                    attributes: [
                        "id",
                        "question_id",
                        "user_reply"
                    ],
                    required: false,
                    include: [
                        {
                            model: Questions,
                            as: "question",
                            attributes: ["id", "question", 'type', 'name'],
                            include: [
                                {
                                    model: QuestionItems,
                                    as: "questionItems",
                                    attributes: ["id", "items"]
                                }
                            ]
                        }
                    ]
                }

            ],
            order: [["createdAt", "DESC"]],
            limit: pageLimit,
            offset: (pageNumber - 1) * pageLimit
        });

        const totalPages = Math.ceil(totalRecords / pageLimit);

        return apiResponse.success(
            res,
            "Organizer event items fetched successfully",
            {
                qr_base_path: `${baseUrl}${qrPath}/`,
                event_image_base_path: `${baseUrl}${eventImagePath}/`,
                totalRecords,
                totalPages,
                currentPage: pageNumber,
                limit: pageLimit,
                records: items
            }
        );

    } catch (error) {
        console.log("Order Items Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

exports.salesAddons = async (req, res) => {
    try {
        const { event_id } = req.query;

        if (!event_id) {
            return apiResponse.error(res, "event_id is required", 400);
        }

        const event = await Event.findByPk(event_id, {
            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol"]
                }
            ]
        });

        const currency = event?.currencyName?.Currency_symbol || "€";

        const salesByAddonRaw = await OrderItems.findAll({
            where: {
                event_id,
                type: "addon"
            },
            attributes: [
                "addon_id",
                [fn("SUM", col("OrderItems.count")), "sold"],
                [fn("SUM", literal("OrderItems.count * OrderItems.price")), "revenue"]
            ],
            include: [
                {
                    model: AddonTypes,
                    as: "addonType",
                    attributes: ["name"],
                    required: false
                }
            ],
            group: ["addon_id", "addonType.id"]
        });

        const sales_by_addon = salesByAddonRaw.map(row => ({
            addon_id: row.addon_id,
            addon_name: row.addonType?.name,
            sold: Number(row.get("sold")),
            revenue: Number(row.get("revenue")),
            currency
        }));

        return apiResponse.success(res, "Addon booking sales fetched", {
            event_id,
            total_addon_types: sales_by_addon.length,
            sales_by_addon
        });

    } catch (error) {
        console.error("Addon Sales Error:", error);
        return apiResponse.error(res, "Failed to fetch addon booking sales", 500);
    }
};

exports.eventDashboardAnalytics = async (req, res) => {
    try {
        const { event_id } = req.query;

        if (!event_id) return apiResponse.error(res, "event_id is required", 400);

        // 🔹 Fetch Event Currency
        const event = await Event.findByPk(event_id, {
            include: [{ model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }]
        });
        const currency = event?.currencyName?.Currency_symbol || "€"; // fallback

        const totalOrders = await Orders.count({ where: { event_id, status: "Y" } });
        const totalRevenue = await Orders.sum("grand_total", { where: { event_id, status: "Y" } });
        const totalItemsSold = await OrderItems.sum("count", { where: { event_id } });

        const salesOverTimeRaw = await Orders.findAll({
            where: { event_id, status: "Y" },
            attributes: [
                [fn("MONTH", col("created")), "month_num"],
                [fn("SUM", col("grand_total")), "revenue"]
            ],
            group: [fn("MONTH", col("created"))],
            order: [[fn("MONTH", col("created")), "ASC"]],
            raw: true
        });

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const salesOverTime = salesOverTimeRaw.map(row => ({
            month: months[row.month_num - 1],
            revenue: Number(row.revenue),
            currency
        }));

        const salesByItemRaw = await OrderItems.findAll({
            where: { event_id },
            attributes: [
                "type",
                "ticket_id",
                "addon_id",
                "package_id",
                "appointment_id",
                [fn("SUM", col("OrderItems.count")), "sold"],
                [fn("SUM", literal("OrderItems.count * OrderItems.price")), "revenue"]
            ],
            include: [
                {
                    model: TicketType,
                    as: "ticketType",
                    attributes: ["title"],
                    required: false
                },
                {
                    model: AddonTypes,
                    as: "addonType",
                    attributes: ["name"],
                    required: false
                },
                {
                    model: Package,
                    as: "package",
                    attributes: ["name"],
                    required: false
                },
                {
                    model: WellnessSlots,
                    as: "appointment",
                    attributes: ["id"],
                    include: [
                        {
                            model: Wellness,
                            as: "wellnessList",
                            attributes: ["name"]
                        }
                    ],
                    required: false
                }
            ],
            group: [
                "type",
                "ticket_id",
                "addon_id",
                "package_id",
                "appointment_id",
                "ticketType.id",
                "addonType.id",
                "package.id",
                "appointment.id",
                "appointment->wellnessList.id"
            ]
        });

        const salesByItem = salesByItemRaw.map(row => ({
            type: row.type,
            id:
                row.type == "ticket" ? row.ticket_id :
                    row.type == "addon" ? row.addon_id :
                        row.type == "package" ? row.package_id :
                            row.type == "appointment" ? row.appointment_id :
                                null,

            name:
                row.type == "ticket" ? row.ticketType?.title :
                    row.type == "addon" ? row.addonType?.name :
                        row.type == "package" ? row.package?.name :
                            row.type == "appointment" ? row.appointment?.wellnessList?.name :
                                null,

            sold: Number(row.get("sold")),
            revenue: Number(row.get("revenue")),
            currency
        }));


        const salesByPaymentMethodRaw = await Orders.findAll({
            where: { event_id, status: "Y" },
            attributes: [
                "paymenttype",
                [fn("COUNT", col("id")), "total_orders"],
                [fn("SUM", col("grand_total")), "method_revenue"]
            ],
            group: ["paymenttype"],
            raw: true
        });

        const salesByPaymentMethod = salesByPaymentMethodRaw.map(row => ({
            paymenttype: row.paymenttype,
            total_orders: Number(row.total_orders),
            method_revenue: Number(row.method_revenue),
            currency
        }));

        /* ==========================
           ✅ FINAL RESPONSE
        ========================== */
        return apiResponse.success(res, "Event dashboard analytics fetched", {
            event_id,
            summary: {
                total_orders: totalOrders || 0,
                total_revenue: totalRevenue || 0,
                total_items_sold: totalItemsSold || 0,
                currency
            },
            sales_over_time: salesOverTime,
            sales_by_item: salesByItem,
            sales_by_payment_method: salesByPaymentMethod
        });
    } catch (error) {
        console.error("Dashboard Analytics Error:", error);
        return apiResponse.error(res, "Failed to fetch dashboard analytics", 500);
    }
};

exports.eventSalesAnalytics = async (req, res) => {
    try {
        const { event_id } = req.query;
        if (!event_id) return apiResponse.error(res, "event_id is required", 400);

        // 🔹 Fetch Event Currency
        const event = await Event.findByPk(event_id, {
            include: [{ model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }]
        });
        const currency = event?.currencyName?.Currency_symbol || "€"; // fallback

        /* ==========================
           🎟 SALES BY TICKET
        ========================== */
        const salesByTicket = await OrderItems.findAll({
            where: {
                event_id,
                type: { [Op.in]: ["ticket", "committeesale"] } // ✅ allow both types
            },
            attributes: [
                "ticket_id",
                [fn("SUM", col("OrderItems.count")), "items_sold"],
                [fn("SUM", literal("OrderItems.count * OrderItems.price")), "total_revenue"]
            ],
            include: [{ model: TicketType, as: "ticketType", attributes: ["id", "title", "price"] }],
            group: ["OrderItems.ticket_id", "ticketType.id"]
        });

        /* ==========================
           🧘 SALES BY APPOINTMENT
        ========================== */
        const salesByAppointment = await OrderItems.findAll({
            where: { event_id, type: "appointment" },
            attributes: [
                "appointment_id",
                [fn("SUM", col("OrderItems.count")), "items_sold"],
                [fn("SUM", literal("OrderItems.count * OrderItems.price")), "total_revenue"]
            ],
            include: [
                {
                    model: WellnessSlots,
                    as: "appointment",
                    attributes: ["id"],
                    include: [{ model: Wellness, as: "wellnessList", attributes: ["id", "name"] }]
                }
            ],
            group: ["OrderItems.appointment_id", "appointment.id", "appointment->wellnessList.id"]
        });

        /* ==========================
           💳 SALES BY PAYMENT METHOD
        ========================== */
        const salesByMethodRaw = await Orders.findAll({
            where: { event_id, status: "Y" },
            attributes: [
                "paymenttype",
                [fn("COUNT", col("Orders.id")), "total_orders"],
                [fn("SUM", col("Orders.grand_total")), "method_revenue"]
            ],
            group: ["paymenttype"],
            raw: true
        });

        const salesByMethod = salesByMethodRaw.map(row => ({
            paymenttype: row.paymenttype,
            total_orders: Number(row.total_orders),
            method_revenue: Number(row.method_revenue),
            currency
        }));

        /* ==========================
           📊 SUMMARY
        ========================== */
        const [totalOrders, totalRevenue, totalItemsSold] = await Promise.all([
            Orders.count({ where: { event_id, status: "Y" } }),
            Orders.sum("grand_total", { where: { event_id, status: "Y" } }),
            OrderItems.sum("count", { where: { event_id } })
        ]);

        /* ==========================
           🔁 FORMAT FOR FRONTEND
        ========================== */
        const salesByItem = [
            ...salesByTicket.map(row => ({
                type: "ticket",
                id: row.ticket_id,
                name: row.ticketType?.title,
                sold: row.get("items_sold"),
                revenue: row.get("total_revenue"),
                currency
            })),
            ...salesByAppointment.map(row => ({
                type: "appointment",
                id: row.appointment_id,
                name: row.appointment?.wellnessList?.name,
                sold: row.get("items_sold"),
                revenue: row.get("total_revenue"),
                currency
            }))
        ];

        return apiResponse.success(res, "Event sales analytics fetched", {
            event_id,
            summary: {
                total_orders: totalOrders || 0,
                total_revenue: totalRevenue || 0,
                total_items_sold: totalItemsSold || 0,
                currency
            },
            sales_by_item: salesByItem,
            sales_by_payment_method: salesByMethod
        });

    } catch (error) {
        console.error("Event Sales Analytics Error:", error);
        return apiResponse.error(res, "Failed to fetch event sales analytics", 500);
    }
};

exports.userEventSalesAnalytics = async (req, res) => {
    try {
        const { event_id, user_id } = req.query;
        if (!event_id) return apiResponse.error(res, "event_id is required", 400);
        if (!user_id) return apiResponse.error(res, "user_id is required", 400);

        // 🔹 Fetch Event Currency
        const event = await Event.findByPk(event_id, {
            include: [{ model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }]
        });
        const currency = event?.currencyName?.Currency_symbol || "€";

        /* ==========================
           🎟 SALES BY TICKET
        ========================== */
        const salesByTicket = await OrderItems.findAll({
            where: {
                event_id,
                committee_user_id: user_id
            },
            attributes: [
                "ticket_id",                
                [fn("SUM", col("OrderItems.count")), "items_sold"],
                [fn("SUM", literal("OrderItems.count * OrderItems.price")), "total_revenue"]
            ],
            include: [
                {
                    model: TicketType,
                    as: "ticketType",
                    attributes: ["id", "title", "price"]
                }
            ],
            group: ["OrderItems.ticket_id", "ticketType.id"]
        });

          // First get all order IDs belonging to this user
        const orderItemOrders = await OrderItems.findAll({
            where: { event_id, committee_user_id: user_id },
            attributes: ["order_id"],
            group: ["order_id"],
            raw: true
        });
        const orderIds = orderItemOrders.map(item => item.order_id);

        const salesByMethodRaw = await Orders.findAll({
            where: { id: orderIds },
            attributes: [
                "paymenttype",
                [fn("COUNT", col("Orders.id")), "total_orders"],
                [fn("SUM", col("Orders.grand_total")), "method_revenue"]
            ],
            group: ["paymenttype"],
            raw: true
        });

        const salesByMethod = salesByMethodRaw.map(row => ({
            paymenttype: row.paymenttype,
            total_orders: Number(row.total_orders),
            method_revenue: Number(row.method_revenue),
            currency
        }));

        const totalItemsSold = await OrderItems.sum("count", {
            where: { event_id, committee_user_id: user_id }
        });

        const totalRevenueData = await OrderItems.findAll({
            where: { event_id, committee_user_id: user_id },
            attributes: [[fn("SUM", literal("count * price")), "total_revenue"]],
            raw: true
        });
        const totalRevenue = totalRevenueData[0]?.total_revenue || 0;

        const totalOrders = orderIds.length;

        const salesByItem = [
            ...salesByTicket.map(row => ({
                type: "ticket",
                id: row.ticket_id,
                name: row.ticketType?.title,
                sold: Number(row.get("items_sold")),
                revenue: Number(row.get("total_revenue")),
                currency
            }))
        ];

        return apiResponse.success(res, "User-specific event sales analytics fetched", {
            event_id,
            summary: {
                total_orders: totalOrders || 0,
                total_revenue: totalRevenue || 0,
                total_items_sold: totalItemsSold || 0,
                currency
            },
            sales_by_item: salesByItem,
            sales_by_payment_method: salesByMethod
        });

    } catch (error) {
        console.error("User Event Sales Analytics Error:", error);
        return apiResponse.error(res, "Failed to fetch user event sales analytics", 500);
    }
};

module.exports.fulfilOrderFromSnapshot = async ({
    meta_data,
    user_id,
    event_id,
    payment,
    snapshotItems,
    payment_method = "stripe",
}) => {

    const { discount_amount, grand_total, snapshot_ids, sub_total, tax_total } = meta_data
    // IDEMPOTENCY
    // ----------------------------
    const existingOrder = await Orders.findOne({
        where: { RRN: payment.payment_intent },
    });

    // if (existingOrder) {
    //     console.log("⚠️ Order already exists for this payment intent. Skipping creation.");
    //     return { order: existingOrder, duplicated: true };
    // }

    const userInfo = await User.findOne({
        where: { id: user_id },
        raw: true,
        attributes: ['email', 'first_name', 'last_name', 'full_name', 'mobile']
    });


    // FETCH EVENT
    // ----------------------------
    const event = await Event.findOne({
        where: { id: event_id },
        include: [{
            model: Company,
            as: "companyInfo",
            attributes: ["name"]
        },
        {
            model: Currency,
            as: "currencyName",
            attributes: ["Currency_symbol", "Currency"]
        }],
        raw: true,
    });

    if (!event) throw new Error("Event not found");

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const imagePath = "uploads/events";
    const timezone = event.event_timezone || "UTC";
    const formattedEvent = {
        id: event.id,
        name: event.name,
        location: event.location,
        feat_image: event.feat_image
            ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${event.feat_image}`
            : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,

        // Correct readable dates
        date_from: formatDateReadable(event.date_from, timezone),
        date_to: formatDateReadable(event.date_to, timezone),

        // Keep timezone for email
        timezone,
        currency_symbol: event["currencyName.Currency_symbol"] || "₹",
        currency_name: event["currencyName.Currency"] || "INR"
    };
    // console.log('formattedEvent :', formattedEvent);

    // CREATE ORDER
    // ----------------------------
    const order = await Orders.create({
        order_uid: generateUniqueOrderId(),
        user_id,
        event_id,
        grand_total: grand_total || 0,
        sub_total: sub_total || 0,
        tax_total: tax_total || 0,
        discount_amount: discount_amount || 0,
        discount_code: null,
        paymenttype: payment_method,
        RRN: payment.payment_intent,
        paymentgateway: "Stripe",
        status: "Y",
        created: new Date(),
    });

    // CREATE ORDER ITEMS + QR
    // ----------------------------
    const qrResults = [];
    const attachments = [];

    for (const item of snapshotItems) {
        for (let i = 0; i < item.quantity; i++) {

            const orderItem = await OrderItems.create({
                order_id: order.id,
                user_id,
                event_id,
                type: item.item_type,
                ticket_id: item.item_type == "ticket" || item.item_type == "committesale" ? item.ticket_id : null,
                addon_id: item.item_type == "addon" ? item.ticket_id : null,
                package_id: item.item_type == "package" ? item.ticket_id : null,
                ticket_pricing_id: item.item_type == "ticket_price" ? item.ticket_id : null,
                appointment_id: item.item_type == "appointment" ? item.ticket_id : null,
                price: item.price,
                slot_id: item.slot_id || null,
            });

            // here question find in the cartQuestion modal and then insert 
            if (item.cart_id) {
                const cartQuestions = await CartQuestionsDetails.findAll({
                    where: {
                        cart_id: item.cart_id,
                        status: 'Y' // optional but recommended
                    }
                });

                if (cartQuestions.length > 0) {
                    const questionBooks = cartQuestions.map(q => ({
                        order_id: order.id,
                        ticketdetail_id: orderItem.id, // 🔗 link with order item
                        question_id: q.question_id,
                        event_id: q.event_id,
                        user_id: q.user_id,
                        user_reply: q.user_reply
                    }));

                    await QuestionsBook.bulkCreate(questionBooks);
                }
            }

            const qr = await generateQRCode(orderItem);

            if (qr) {
                await orderItem.update({
                    qr_image: qr.qrImageName,
                    qr_data: JSON.stringify(qr.qrData),
                    secure_hash: qr.secureHash,
                });

                qrResults.push({
                    order_item_id: orderItem.id,
                    qr_image: qr.qrImageName,
                    qr_data: qr.qrData
                });

                attachments.push({
                    filename: qr.qrImageName,
                    path: path.join(__dirname, "../../../uploads/qr_codes/", qr.qrImageName)
                });

            }
        }
    }

    // CLEANUP
    // ----------------------------
    await Cart.destroy({ where: { user_id, event_id } });
    console.log("⚠️ Order already exists for this payment intent. Skipping creation.", qrResults.length);

    // SEND EMAIL
    try {
        await sendEmail(
            userInfo.email,
            `Your Ticket Order – ${event.name}`,
            orderConfirmationTemplateWithQR(userInfo, order, qrResults, formattedEvent),
            attachments
        );
    } catch (emailError) {
        console.log("Email sending failed:", emailError);
    }

    return {
        order,
        qrResults,
        grand_total,
    };
};

exports.createOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = req.user;
        const { event_id, payment_method, discount_code } = req.body;

        if (!event_id)
            return apiResponse.error(res, "Event ID is required", 400);

        // Base URL for images
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/events";

        // Fetch Event Details
        const event = await Event.findOne({
            raw: true,
            nest: true,
            where: { id: event_id },
            attributes: [
                "id",
                "name",
                "date_from",
                "date_to",
                "feat_image",
                "location",
                "event_timezone"
            ]
        });

        if (!event)
            return apiResponse.error(res, "Event not found", 404);

        const timezone = event.event_timezone || "UTC";
        // Prepare formatted event for email
        const formattedEvent = {
            id: event.id,
            name: event.name,
            location: event.location,

            // Correct image URL
            feat_image: event.feat_image
                ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${event.feat_image}`
                : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,

            // Correct readable dates
            date_from: formatDateReadable(event.date_from, timezone),
            date_to: formatDateReadable(event.date_to, timezone),

            // Keep timezone for email
            timezone
        };
        // console.log('formattedEvent :', formattedEvent); return

        // FETCH CART
        let where = { user_id, event_id };
        const cartList = await Cart.findAll({
            where,
            raw: true,
            nest: true,
            order: [["id", "DESC"]],
            include: [
                { model: TicketType, attributes: ["id", "title", "price"] },
                { model: AddonTypes, attributes: ["id", "name"] },
                { model: Package, attributes: ["id", "name"] },
                {
                    model: TicketPricing,
                    attributes: ["id", "price", "ticket_type_id", "event_slot_id"],
                    include: [
                        { model: TicketType, as: 'ticket', attributes: ['id', 'title', 'access_type', 'type', 'price'] },
                        { model: EventSlots, as: 'slot', attributes: ['id', 'slot_name', 'slot_date', 'start_time', 'end_time'] }
                    ]
                }
            ]
        });

        if (!cartList.length) {
            return apiResponse.error(res, "Your cart is empty!", 400);
        }

        // CALCULATE TOTAL

        let totalAmount = 0;

        cartList.forEach(item => {
            if (item.ticket_type == 'ticket')
                totalAmount += Number(item.TicketType.price || 0);

            if (item.ticket_type == 'ticket_price')
                totalAmount += Number(item.TicketPricing.price || 0);

            if (item.ticket_type == "committesale")
                totalAmount += Number(item.TicketType.price || 0);
        });

        // CREATE ORDER

        const order_uid = generateUniqueOrderId();

        const order = await Orders.create({
            order_uid,
            user_id,
            event_id,
            grand_total: totalAmount,
            paymenttype: payment_method,
            discount_code: discount_code || null,
            created: new Date(),
            status: 'Y'
        });

        let qrResults = [];
        let attachments = [];

        // CREATE ORDER ITEMS + QR
        for (const item of cartList) {
            let price = 0;

            if (item.ticket_type == "ticket")
                price = item.TicketType?.price || 0;

            if (item.ticket_type == "ticket_price")
                price = item.TicketPricing?.price || 0;

            if (item.ticket_type == "committesale")
                price = item.TicketType?.price || 0;


            // CREATE ORDER ITEM
            const orderItem = await OrderItems.create({
                order_id: order.id,
                user_id,
                event_id: item.event_id,
                type: item.ticket_type,
                ticket_id: item.ticket_id || null,
                addon_id: item.addons_id || null,
                package_id: item.package_id || null,
                ticket_pricing_id: item.ticket_price_id || null,
                appointment_id: item.appointment_id || null,
                count: item.no_tickets || 1,
                price,
                slot_id: item.TicketPricing?.event_slot_id || null
            });

            // GENERATE QR
            const qr = await generateQRCode(orderItem);

            if (qr) {
                await orderItem.update({
                    qr_image: qr.qrImageName,
                    qr_data: JSON.stringify(qr.qrData),
                    secure_hash: qr.secureHash
                });

                qrResults.push({
                    order_item_id: orderItem.id,
                    qr_image: qr.qrImageName,
                    qr_data: qr.qrData
                });

                attachments.push({
                    filename: qr.qrImageName,
                    path: path.join(__dirname, "../../../uploads/qr_codes/", qr.qrImageName)
                });
            }
        }

        // CLEAR CART
        await Cart.destroy({ where });

        // SEND EMAIL
        try {
            await sendEmail(
                user.email,
                `Your Ticket Order – ${event.name}`,
                orderConfirmationTemplateWithQR(user, order, qrResults, formattedEvent),
                attachments
            );
        } catch (emailError) {
            console.log("Email sending failed:", emailError);
        }

        return apiResponse.success(res, "Order created successfully", {
            order_uid,
            order_id: order.id,
            event: formattedEvent,
            grand_total: totalAmount,
            items: cartList.length,
            qr_codes: qrResults
        });

    } catch (error) {
        console.log(error);
        return apiResponse.error(res, "Error creating order", 500);
    }
};

// create appointment order.....
exports.createAppointmentOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = req.user;
        const { event_id, payment_method, discount_code } = req.body;

        if (!event_id)
            return apiResponse.error(res, "Event ID is required", 400);

        // Base URL for images
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const imagePath = "uploads/events";

        // Fetch Event Details
        const event = await Event.findOne({
            raw: true,
            nest: true,
            where: { id: event_id },
            attributes: [
                "id",
                "name",
                "date_from",
                "date_to",
                "feat_image",
                "location",
                "event_timezone"
            ]
        });

        if (!event)
            return apiResponse.error(res, "Event not found", 404);

        const timezone = event.event_timezone || "UTC";

        // Convert to user-friendly readable format
        const formatDateReadable = (dateStr, timezone) => {
            if (!dateStr) return "";

            const date = new Date(dateStr);

            return date.toLocaleString("en-US", {
                timeZone: timezone,
                weekday: "long",
                month: "long",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
        };

        // Prepare formatted event for email
        const formattedEvent = {
            id: event.id,
            name: event.name,
            location: event.location,

            // Correct image URL
            feat_image: event.feat_image
                ? `${baseUrl.replace(/\/$/, "")}/${imagePath}/${event.feat_image}`
                : `${baseUrl.replace(/\/$/, "")}/${imagePath}/default.jpg`,

            // Correct readable dates
            date_from: formatDateReadable(event.date_from, timezone),
            date_to: formatDateReadable(event.date_to, timezone),

            // Keep timezone for email
            timezone
        };
        // console.log('formattedEvent :', formattedEvent); return

        // FETCH CART
        let where = { user_id, event_id, ticket_type: "appointment" };
        const cartList = await Cart.findAll({
            where,
            raw: true,
            nest: true,
            order: [["id", "DESC"]],
            include: [
                {
                    model: WellnessSlots,
                    as: 'appointments',
                    // attributes: ["id", "title", "price"]
                    include: [{ model: Wellness, as: 'wellnessList' }]
                }
            ]
        });

        if (!cartList.length) {
            return apiResponse.error(res, "Your cart is empty!", 400);
        }
        // CALCULATE TOTAL
        let totalAmount = 0;
        cartList.forEach(item => {
            if (item.ticket_type == 'appointment')
                totalAmount += Number(item.appointments.price || 0);
        });
        // CREATE ORDER
        const order_uid = generateUniqueOrderId();
        const order = await Orders.create({
            order_uid,
            user_id,
            event_id,
            grand_total: totalAmount,
            paymenttype: payment_method,
            discount_code: discount_code || null,
            created: new Date(),
            status: 'Y'
        });

        let qrResults = [];
        let attachments = [];
        // CREATE ORDER ITEMS + QR
        for (const item of cartList) {
            let price = 0;
            if (item.ticket_type == 'appointment')
                price = item.appointments.price || 0;
            // CREATE ORDER ITEM
            const orderItem = await OrderItems.create({
                order_id: order.id,
                user_id,
                event_id: item.event_id,
                type: item.ticket_type,
                ticket_id: item.ticket_id || null,
                addon_id: item.addons_id || null,
                package_id: item.package_id || null,
                ticket_pricing_id: item.ticket_price_id || null,
                appointment_id: item.appointment_id || null,
                count: item.no_tickets || 1,
                price,
                slot_id: item.TicketPricing?.event_slot_id || null
            });

            // GENERATE QR
            const qr = await generateQRCode(orderItem);

            if (qr) {
                await orderItem.update({
                    qr_image: qr.qrImageName,
                    qr_data: JSON.stringify(qr.qrData),
                    secure_hash: qr.secureHash
                });

                qrResults.push({
                    order_item_id: orderItem.id,
                    qr_image: qr.qrImageName,
                    qr_data: qr.qrData
                });
                attachments.push({
                    filename: qr.qrImageName,
                    path: path.join(__dirname, "../../../uploads/qr_codes/", qr.qrImageName)
                });
            }
        }

        // CLEAR CART
        await Cart.destroy({ where });
        // SEND EMAIL
        try {
            await sendEmail(
                user.email,
                `Your Appointment Order – ${event.name}`,
                appointmentConfirmationTemplateWithQR(user, order, cartList, qrResults, formattedEvent),
                attachments
            );
        } catch (emailError) {
            console.log("Email sending failed:", emailError);
        }

        return apiResponse.success(res, "Appointment Order created successfully", {
            order_uid,
            order_id: order.id,
            event: formattedEvent,
            grand_total: totalAmount,
            items: cartList.length,
            qr_codes: qrResults
        });

    } catch (error) {
        console.log(error);
        return apiResponse.error(res, "Error creating order", 500);
    }
};

// LIST ALL USER ORDERS WITH ITEMS + QR IMAGE URL
exports.listOrders = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { event_id } = req.query;

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const qrPath = "uploads/qr_codes";
        const eventImagePath = "uploads/events";

        // 🔥 Build WHERE condition dynamically
        let whereCondition = { user_id };

        if (event_id) {
            whereCondition.event_id = event_id; // apply filter only if event_id exists
        }

        const orders = await Orders.findAll({
            where: whereCondition,
            order: [["id", "DESC"]],
            attributes: [
                "id",
                "order_uid",
                "user_id",
                "event_id",
                "package_id",
                "grand_total",
                "status",
                "createdAt"
            ],
            include: [
                {
                    model: OrderItems,
                    as: "orderItems",
                    attributes: [
                        "id",
                        "type",
                        "ticket_id",
                        "addon_id",
                        "package_id",
                        "ticket_pricing_id",
                        "appointment_id",
                        "count",
                        "price",
                        "qr_image",
                        "secure_hash"
                    ],
                    include: [
                        { model: TicketType, as: "ticketType" },
                        { model: AddonTypes, as: "addonType" },
                        { model: Package, as: "package" },
                        { model: TicketPricing, as: "ticketPricing" },
                        { model: EventSlots, as: "slot" },
                        {
                            model: WellnessSlots, as: "appointment", include: {
                                model: Wellness, as: "wellnessList",
                                include: {
                                    model: Currency,
                                    as: 'currencyName',
                                    attributes: ['Currency_symbol', 'Currency']
                                }
                            }
                        },
                    ]
                },
                { model: Event, as: "event", attributes: ['name', 'date_from', 'date_to', 'feat_image', 'location'] },
                { model: User, as: "user", attributes: ['email', 'first_name', 'last_name', 'full_name', 'mobile', "gender"] },
            ]
        });


        // console.log('orders :', orders);
        // FORMAT RESPONSE
        const formattedOrders = orders.map(order => {
            const orderData = order.toJSON();

            orderData.orderItems = orderData.orderItems.map(item => ({
                ...item,
                // RETURN FULL QR URL
                qr_image_url: item.qr_image
                    ? `${baseUrl.replace(/\/$/, "")}/${qrPath}/${item.qr_image}`
                    : null
            }));
            // 🔥 REPLACE feat_image WITH FULL URL (NO NEW KEY)
            if (orderData.event?.feat_image) {
                orderData.event.feat_image =
                    `${baseUrl}${eventImagePath}/${orderData.event.feat_image}`;
            }

            return orderData;
        });

        return apiResponse.success(res, "Orders with items", formattedOrders);

    } catch (error) {
        console.log(error);
        return apiResponse.error(res, "Error fetching orders", 500);
    }
};

exports.organizerOrderList = async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const qrPath = "uploads/qr_codes";
        const eventImagePath = "uploads/events";

        const organizerId = req.user.id;
        const { page = 1, limit = config.perPageDataLimit, eventId } = req.query;

        const pageNumber = parseInt(page);
        const pageLimit = parseInt(limit);

        // Get all events created by this organizer
        const events = await Event.findAll({
            where: { event_org_id: organizerId },
            attributes: ["id"]
        });

        const organizerEventIds = events.map(e => e.id);

        if (!organizerEventIds.length) {
            return apiResponse.success(res, "No events found for this organizer.", {
                totalRecords: 0,
                totalPages: 0,
                currentPage: 1,
                limit: pageLimit,
                records: []
            });
        }

        // Filter orders
        let where = {
            event_id: { [Op.in]: organizerEventIds }
        };

        if (eventId) {
            const numericEventId = parseInt(eventId);
            if (!organizerEventIds.includes(numericEventId)) {
                return apiResponse.success(res, "Invalid event for this organizer.", {
                    totalRecords: 0,
                    totalPages: 0,
                    currentPage: 1,
                    limit: pageLimit,
                    records: []
                });
            }
            where.event_id = numericEventId;
        }

        // 🔥 Count total rows (for pagination)
        const totalRecords = await Orders.count({ where });

        // Fetch paginated orders
        const orders = await Orders.findAll({
            where,
            include: [
                { model: User, as: "user", attributes: ["id", "first_name", "last_name", "email"] },
                {
                    model: Event, as: "event", attributes: ["name", "feat_image", "date_from", "date_to"],
                    include: [
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
                },
                { model: OrderItems, as: "orderItems" }
            ],
            order: [["createdAt", "DESC"]],
            limit: pageLimit,
            offset: (pageNumber - 1) * pageLimit
        });

        // Format data
        const formattedOrders = orders.map(order => {
            const data = order.toJSON();

            // QR image handling
            data.orderItems = data.orderItems.map(item => {
                let obj = { ...item };
                obj.qr_image_url = item.qr_image
                    ? `${baseUrl.replace(/\/$/, "")}/${qrPath}/${item.qr_image}`
                    : null;

                delete obj.qr_data;
                return obj;
            });

            // Event image full URL
            if (data.event?.feat_image) {
                data.event.feat_image =
                    `${baseUrl.replace(/\/$/, "")}/${eventImagePath}/${data.event.feat_image}`;
            }

            return data;
        });

        const totalPages = Math.ceil(totalRecords / pageLimit);

        return apiResponse.success(
            res,
            "Organizer orders fetched successfully",
            {
                totalRecords,
                totalPages,
                currentPage: pageNumber,
                limit: pageLimit,
                records: formattedOrders
            }
        );

    } catch (error) {
        console.log("Order List Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

// 📌 Get Single Order Details
exports.getOrderDetails = async (req, res) => {
    try {
        const { order_id } = req.params;

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const qrPath = "uploads/qr_codes";
        const eventImagePath = "uploads/events";

        const order = await Orders.findOne({
            where: { id: order_id },
            attributes: [
                "id",
                "order_uid",
                "user_id",
                "event_id",
                "package_id",
                "grand_total",
                "sub_total",
                "tax_total",
                "discount_amount",
                "discount_code",
                "status",
                "createdAt"
            ],
            include: [
                {
                    model: OrderItems,
                    as: "orderItems",
                    attributes: [
                        "id",
                        "type",
                        "ticket_id",
                        "addon_id",
                        "package_id",
                        "ticket_pricing_id",
                        "appointment_id",
                        "count",
                        "price",
                        "qr_image",
                        "qr_data",
                        "secure_hash",
                        "cancel_status",
                        "cancel_date"
                    ],
                    include: [
                        {
                            model: TicketType,
                            as: "ticketType",
                            attributes: ["id", "type"]
                        },
                        {
                            model: AddonTypes,
                            as: "addonType",
                            attributes: ["id", "name"]
                        },
                        {
                            model: Package,
                            as: "package",
                            attributes: ["id", "name"]
                        },
                        {
                            model: TicketPricing,
                            as: "ticketPricing",
                            attributes: ["id", "price"]
                        },
                        {
                            model: EventSlots,
                            as: "slot",
                            attributes: ["id", "slot_date", "slot_name", "start_time", "end_time"]
                        },
                        {
                            model: WellnessSlots, as: "appointment", include: {
                                model: Wellness, as: "wellnessList",
                                include: {
                                    model: Currency,
                                    as: 'currencyName',
                                    attributes: ['Currency_symbol', 'Currency']
                                }
                            }
                        },
                    ]
                },
                {
                    model: Event, as: "event", attributes: ['name', 'date_from', 'date_to', 'feat_image', 'location', 'event_org_id'],
                    include: [
                        { model: Company, as: "companyInfo", attributes: ['name'] },
                        { model: Currency, as: 'currencyName', attributes: ['Currency_symbol', 'Currency'] }
                    ]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const orderJSON = order.toJSON();

        // ---- FORMAT ORDER ITEMS ----
        orderJSON.orderItems = orderJSON.orderItems.map(item => {
            const newItem = {
                ...item,
                qr_image_url: item.qr_image
                    ? `${baseUrl.replace(/\/$/, "")}/${qrPath}/${item.qr_image}`
                    : null
            };
            delete newItem.qr_data;
            return newItem;
        });


        // ---- FORMAT EVENT OBJECT ----
        if (orderJSON.event) {
            const event = { ...orderJSON.event };
            event.feat_image_url = event.feat_image
                ? `${baseUrl.replace(/\/$/, "")}/uploads/events/${event.feat_image}`
                : null;
            delete event.feat_image; // remove old key
            orderJSON.event = event;
        }


        return res.json({
            success: true,
            message: "Order details fetched",
            data: orderJSON
        });

    } catch (error) {
        console.log("Order Details Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

//..cancel appointment..kamal
exports.cancelAppointment = async (req, res) => {
    try {
        const { id: orderId } = req.params;

        if (!orderId) {
            return res.json({
                success: false,
                message: "Order ID is required",
                code: "ORDER_ID_MISSING"
            });
        }

        // Find order by ID
        const order = await OrderItems.findByPk(orderId);

        if (!order) {
            return res.json({
                success: false,
                message: "Order not found",
                code: "ORDER_NOT_FOUND"
            });
        }

        // Already cancelled check
        if (order.cancel_status == "cancel") {
            return res.json({
                success: false,
                message: "This appointment is already cancelled",
                code: "ALREADY_CANCELLED"
            });
        }

        // Update cancel status & date
        await order.update({
            cancel_status: "cancel",
            cancel_date: new Date()
        });

        return res.json({
            success: true,
            message: "Your appointment has been cancelled successfully",
            // data: order
        });

    } catch (error) {
        return res.json({
            success: false,
            message: "Something went wrong",
            error: error.message,
            code: "DB_ERROR"
        });
    }
};
