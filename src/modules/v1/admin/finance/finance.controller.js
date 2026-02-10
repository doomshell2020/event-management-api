const financeService = require('./finance.service');
const apiResponse = require('../../../../common/utils/apiResponse');
const { fn, col, literal, Sequelize, Op } = require('sequelize');
const { User, Event, TicketType, Orders, Currency, OrderItems, AddonTypes, Package, WellnessSlots, Wellness } = require('../../../../models');



// find all event details with event_id and without event_id
// exports.getEventDetails = async (req, res) => {
//     try {

//         /* ============================
//            0. Get event_id from query
//            /event-details?event_id=5
//         ============================ */
//         const { event_id } = req.query;

//         /* ============================
//            1. Fetch Events
//         ============================ */
//         const eventWhere = {};
//         if (event_id) {
//             eventWhere.id = event_id;
//         }

//         const events = await Event.findAll({
//             where: eventWhere,
//             attributes: ["id", "name", "date_from", "date_to"],
//             include: [
//                 {
//                     model: Currency,
//                     as: "currencyName",
//                     attributes: ["Currency_symbol"],
//                 },
//             ],
//             order: [["id", "DESC"]],
//         });

//         if (!events.length) {
//             return apiResponse.success(res, "No events found.", { events: [] });
//         }

//         const eventIds = events.map(e => e.id);

//         /* ============================
//            2. Orders Summary
//         ============================ */
//         const ordersSummary = await Orders.findAll({
//             attributes: [
//                 "event_id",
//                 [fn("COUNT", col("id")), "total_orders"],
//                 [fn("SUM", col("sub_total")), "sub_total_sum"],
//                 [fn("SUM", col("tax_total")), "tax_total_sum"],
//                 [fn("SUM", col("grand_total")), "grand_total_sum"],
//             ],
//             where: { event_id: eventIds },
//             group: ["event_id"],
//             raw: true,
//         });

//         /* ============================
//            3. OrderItems Type Wise Count
//         ============================ */
//         const orderItemsSummary = await OrderItems.findAll({
//             attributes: [
//                 "event_id",
//                 // [fn("SUM", literal(`CASE WHEN type='ticket' THEN 1 ELSE 0 END`)), "ticket_count"],
//                 [fn("SUM",literal(`CASE  WHEN type IN ('ticket', 'ticket_price', 'comps', 'committesale')  THEN 1 ELSE 0 END`)), "ticket_count"],
//                 [fn("SUM", literal(`CASE WHEN type='addon' THEN 1 ELSE 0 END`)), "addon_count"],
//                 [fn("SUM", literal(`CASE WHEN type='appointment' THEN 1 ELSE 0 END`)), "appointment_count"],
//                 [fn("SUM", literal(`CASE WHEN type='package' THEN 1 ELSE 0 END`)), "package_count"],
//                 // [fn("SUM", literal(`CASE WHEN type='comps' THEN 1 ELSE 0 END`)), "comps_count"],
//                 // [fn("SUM", literal(`CASE WHEN type='committesale' THEN 1 ELSE 0 END`)), "committee_count"],
//             ],
//             where: { event_id: eventIds },
//             group: ["event_id"],
//             raw: true,
//         });

//         /* ============================
//            4. Cancelled Items Count
//         ============================ */
//         const cancelledItemsSummary = await OrderItems.findAll({
//             attributes: [
//                 "event_id",
//                 // [fn("SUM", literal(`CASE WHEN type='ticket' THEN 1 ELSE 0 END`)), "cancel_ticket_count"],
//                 [fn("SUM",literal(`CASE  WHEN type IN ('ticket', 'ticket_price', 'comps', 'committesale')  THEN 1 ELSE 0 END`)), "ticket_count"],
//                 [fn("SUM", literal(`CASE WHEN type='addon' THEN 1 ELSE 0 END`)), "cancel_addon_count"],
//                 [fn("SUM", literal(`CASE WHEN type='appointment' THEN 1 ELSE 0 END`)), "cancel_appointment_count"],
//                 [fn("SUM", literal(`CASE WHEN type='package' THEN 1 ELSE 0 END`)), "cancel_package_count"],
//                 [fn("SUM", literal(`CASE WHEN type='comps' THEN 1 ELSE 0 END`)), "cancel_comps_count"],
//                 [fn("SUM", literal(`CASE WHEN type='committesale' THEN 1 ELSE 0 END`)), "cancel_committesale_count"],
//             ],
//             where: {
//                 event_id: eventIds,
//                 cancel_status: "cancel",
//             },
//             group: ["event_id"],
//             raw: true,
//         });

//         /* ============================
//            5. Cancelled Amount Summary
//            price WITHOUT tax → add 8%
//         ============================ */
//         const cancelledAmountSummary = await OrderItems.findAll({
//             attributes: [
//                 "event_id",
//                 [fn("SUM", col("price")), "cancel_sub_total"],
//                 [fn("SUM", literal("price * 0.08")), "cancel_tax_amount"],
//                 [fn("SUM", literal("price * 1.08")), "cancel_grand_total"],
//             ],
//             where: {
//                 event_id: eventIds,
//                 cancel_status: "cancel",
//             },
//             group: ["event_id"],
//             raw: true,
//         });

//         /* ============================
//            6. STAFF COUNT (EVENT WISE)
//            user.eventId = "1,3,5"
//         ============================ */
//         const staffRaw = await User.findAll({
//             attributes: ["id", "eventId"],
//             where: {
//                 [Op.or]: eventIds.map(eventId =>
//                     Sequelize.where(
//                         fn("FIND_IN_SET", eventId, col("eventId")),
//                         { [Op.gt]: 0 }
//                     )
//                 )
//             },
//             raw: true,
//         });

//         // const staffSummary = await User.findAll({
//         //     attributes: [
//         //         [col("eventId"), "event_id"],
//         //         [fn("COUNT", col("id")), "staff_count"],
//         //     ],
//         //     where: Sequelize.where(
//         //         fn("FIND_IN_SET", col("eventId"), literal(`'${eventIds.join(",")}'`)),
//         //         { [Op.gt]: 0 }
//         //     ),
//         //     group: ["eventId"],
//         //     raw: true,
//         // });

//         /* ============================
//            7. Create Maps
//         ============================ */
//         const ordersMap = {};
//         ordersSummary.forEach(o => ordersMap[o.event_id] = o);

//         const itemsMap = {};
//         orderItemsSummary.forEach(i => itemsMap[i.event_id] = i);

//         const cancelMap = {};
//         cancelledItemsSummary.forEach(c => cancelMap[c.event_id] = c);

//         const cancelAmountMap = {};
//         cancelledAmountSummary.forEach(c => cancelAmountMap[c.event_id] = c);

//         // const staffMap = {};
//         // staffSummary.forEach(s => staffMap[s.event_id] = s.staff_count);
//         const staffMap = {};

//         eventIds.forEach(id => staffMap[id] = 0);

//         staffRaw.forEach(user => {
//             const userEvents = user.eventId.split(",").map(Number);
//             userEvents.forEach(eid => {
//                 if (staffMap[eid] !== undefined) {
//                     staffMap[eid] += 1;
//                 }
//             });
//         });



//         /* ============================
//            8. Merge Final Response
//         ============================ */
//         const responseData = events.map(event => {
//             const orderData = ordersMap[event.id] || {};
//             const itemData = itemsMap[event.id] || {};
//             const cancelData = cancelMap[event.id] || {};
//             const cancelAmountData = cancelAmountMap[event.id] || {};

//             return {
//                 event_id: event.id,
//                 event_name: event.name,
//                 date_from: event.date_from,
//                 date_to: event.date_to,

//                 currency_symbol: event.currencyName?.Currency_symbol || "",

//                 total_orders: Number(orderData.total_orders || 0),
//                 sub_total_sum: Number(orderData.sub_total_sum || 0),
//                 tax_total_sum: Number(orderData.tax_total_sum || 0),
//                 grand_total_sum: Number(orderData.grand_total_sum || 0),

//                 ticket_count: Number(itemData.ticket_count || 0),
//                 addon_count: Number(itemData.addon_count || 0),
//                 appointment_count: Number(itemData.appointment_count || 0),
//                 package_count: Number(itemData.package_count || 0),
//                 comps_count: Number(itemData.comps_count || 0),
//                 committee_count: Number(itemData.committee_count || 0),

//                 cancel_ticket_count: Number(cancelData.cancel_ticket_count || 0),
//                 cancel_addon_count: Number(cancelData.cancel_addon_count || 0),
//                 cancel_appointment_count: Number(cancelData.cancel_appointment_count || 0),
//                 cancel_package_count: Number(cancelData.cancel_package_count || 0),
//                 cancel_comps_count: Number(cancelData.cancel_comps_count || 0),
//                 cancel_committesale_count: Number(cancelData.cancel_committesale_count || 0),

//                 // 💰 CANCEL AMOUNTS (8% TAX)
//                 cancel_sub_total: Number(cancelAmountData.cancel_sub_total || 0),
//                 cancel_tax_amount: Number(cancelAmountData.cancel_tax_amount || 0),
//                 cancel_grand_total: Number(cancelAmountData.cancel_grand_total || 0),

//                 // 👤 STAFF
//                 staff_count: Number(staffMap[event.id] || 0),

//             };
//         });

//         /* ============================
//            9. Send Response
//         ============================ */
//         return apiResponse.success(res, "Events fetched successfully.", {
//             events: responseData,
//         });

//     } catch (error) {
//         console.error("Error fetching event details:", error);
//         return apiResponse.error(res, "Internal Server Error");
//     }
// };


exports.getEventDetails = async (req, res) => {
    try {
        /* ============================
           0. Get event_id from query
        ============================ */
        const { event_id } = req.query;

        /* ============================
           1. Fetch Events
        ============================ */
        const eventWhere = {};
        if (event_id) eventWhere.id = event_id;

        const events = await Event.findAll({
            where: eventWhere,
            attributes: ["id", "name", "date_from", "date_to"],
            include: [
                {
                    model: Currency,
                    as: "currencyName",
                    attributes: ["Currency_symbol"],
                },
            ],
            order: [["id", "DESC"]],
        });

        if (!events.length) {
            return apiResponse.success(res, "No events found.", { events: [] });
        }

        const eventIds = events.map(e => e.id);

        /* ============================
           2. Orders Summary
        ============================ */
        const ordersSummary = await Orders.findAll({
            attributes: [
                "event_id",
                [fn("COUNT", col("id")), "total_orders"],
                [fn("SUM", col("sub_total")), "sub_total_sum"],
                [fn("SUM", col("tax_total")), "tax_total_sum"],
                [fn("SUM", col("grand_total")), "grand_total_sum"],
            ],
            where: { event_id: eventIds },
            group: ["event_id"],
            raw: true,
        });

        /* ============================
           3. OrderItems Type Wise Count
        ============================ */
        const orderItemsSummary = await OrderItems.findAll({
            attributes: [
                "event_id",
                [
                    fn(
                        "SUM",
                        literal(`CASE WHEN type IN ('ticket','ticket_price','comps','committesale') THEN 1 ELSE 0 END`)
                    ),
                    "ticket_count",
                ],
                [fn("SUM", literal(`CASE WHEN type='addon' THEN 1 ELSE 0 END`)), "addon_count"],
                [fn("SUM", literal(`CASE WHEN type='appointment' THEN 1 ELSE 0 END`)), "appointment_count"],
                [fn("SUM", literal(`CASE WHEN type='package' THEN 1 ELSE 0 END`)), "package_count"],
            ],
            where: { event_id: eventIds },
            group: ["event_id"],
            raw: true,
        });

        /* ============================
           4. Cancelled Items Count
        ============================ */
        const cancelledItemsSummary = await OrderItems.findAll({
            attributes: [
                "event_id",
                [
                    fn(
                        "SUM",
                        literal(`CASE WHEN type IN ('ticket','ticket_price','comps','committesale') THEN 1 ELSE 0 END`)
                    ),
                    "cancel_ticket_count",
                ],
                [fn("SUM", literal(`CASE WHEN type='addon' THEN 1 ELSE 0 END`)), "cancel_addon_count"],
                [fn("SUM", literal(`CASE WHEN type='appointment' THEN 1 ELSE 0 END`)), "cancel_appointment_count"],
                [fn("SUM", literal(`CASE WHEN type='package' THEN 1 ELSE 0 END`)), "cancel_package_count"],
                [fn("SUM", literal(`CASE WHEN type='comps' THEN 1 ELSE 0 END`)), "cancel_comps_count"],
                [fn("SUM", literal(`CASE WHEN type='committesale' THEN 1 ELSE 0 END`)), "cancel_committesale_count"],
            ],
            where: {
                event_id: eventIds,
                cancel_status: "cancel",
            },
            group: ["event_id"],
            raw: true,
        });

        /* ============================
           5. ✅ CORRECT CANCELLED AMOUNT
           Uses actual tax from Orders table
        ============================ */
        // const cancelledAmountSummary = await OrderItems.findAll({
        //     attributes: [
        //         "event_id",

        //         // Base price
        //         [fn("SUM", col("OrderItems.price")), "cancel_sub_total"],

        //         // Actual tax applied at purchase time
        //         [
        //             fn(
        //                 "SUM",
        //                 literal(`
        //                     OrderItems.price *
        //                     ((order.platform_fee_percent + order.payment_gateway_percent) / 100)
        //                 `)
        //             ),
        //             "cancel_tax_amount",
        //         ],

        //         // Grand total = price + actual tax
        //         [
        //             fn(
        //                 "SUM",
        //                 literal(`
        //                     OrderItems.price +
        //                     (OrderItems.price *
        //                     ((order.platform_fee_percent + order.payment_gateway_percent) / 100))
        //                 `)
        //             ),
        //             "cancel_grand_total",
        //         ],
        //     ],
        //     include: [
        //         {
        //             model: Orders,
        //             // attributes: ['platform_fee_percent','payment_gateway_percent'],
        //             attributes: [],
        //             as:"order"
        //         },
        //     ],
        //     where: {
        //         event_id: eventIds,
        //         cancel_status: "cancel",
        //     },
        //     group: ["event_id"],
        //     raw: true,
        // });

        const cancelledAmountSummary = await OrderItems.findAll({
            attributes: [
                "event_id",

                // Base price
                [fn("SUM", col("OrderItems.price")), "cancel_sub_total"],

                // ✅ Tax = platform fee + payment gateway fee (applied on price + platform fee)
                [
                    fn(
                        "SUM",
                        literal(`
                    (
                        (OrderItems.price * (order.platform_fee_percent / 100))
                        +
                        (
                            (OrderItems.price + (OrderItems.price * (order.platform_fee_percent / 100)))
                            * (order.payment_gateway_percent / 100)
                        )
                    )
                `)
                    ),
                    "cancel_tax_amount",
                ],

                // ✅ Grand total = price + total tax
                [
                    fn(
                        "SUM",
                        literal(`
                    OrderItems.price +
                    (
                        (OrderItems.price * (order.platform_fee_percent / 100))
                        +
                        (
                            (OrderItems.price + (OrderItems.price * (order.platform_fee_percent / 100)))
                            * (order.payment_gateway_percent / 100)
                        )
                    )
                `)
                    ),
                    "cancel_grand_total",
                ],
            ],
            include: [
                {
                    model: Orders,
                    as: "order",
                    attributes: [],
                },
            ],
            where: {
                event_id: eventIds,
                cancel_status: "cancel",
            },
            group: ["event_id"],
            raw: true,
        });


        /* ============================
           6. STAFF COUNT
        ============================ */
        const staffRaw = await User.findAll({
            attributes: ["id", "eventId"],
            where: {
                [Op.or]: eventIds.map(eventId =>
                    Sequelize.where(
                        fn("FIND_IN_SET", eventId, col("eventId")),
                        { [Op.gt]: 0 }
                    )
                ),
            },
            raw: true,
        });

        const staffMap = {};
        eventIds.forEach(id => (staffMap[id] = 0));

        staffRaw.forEach(user => {
            const userEvents = user.eventId.split(",").map(Number);
            userEvents.forEach(eid => {
                if (staffMap[eid] !== undefined) staffMap[eid] += 1;
            });
        });

        /* ============================
           7. Create Maps
        ============================ */
        const ordersMap = {};
        ordersSummary.forEach(o => (ordersMap[o.event_id] = o));

        const itemsMap = {};
        orderItemsSummary.forEach(i => (itemsMap[i.event_id] = i));

        const cancelMap = {};
        cancelledItemsSummary.forEach(c => (cancelMap[c.event_id] = c));

        const cancelAmountMap = {};
        cancelledAmountSummary.forEach(c => (cancelAmountMap[c.event_id] = c));

        /* ============================
           8. Final Response
        ============================ */
        const responseData = events.map(event => {
            const orderData = ordersMap[event.id] || {};
            const itemData = itemsMap[event.id] || {};
            const cancelData = cancelMap[event.id] || {};
            const cancelAmountData = cancelAmountMap[event.id] || {};

            return {
                event_id: event.id,
                event_name: event.name,
                date_from: event.date_from,
                date_to: event.date_to,

                currency_symbol: event.currencyName?.Currency_symbol || "",

                total_orders: Number(orderData.total_orders || 0),
                sub_total_sum: Number(orderData.sub_total_sum || 0),
                tax_total_sum: Number(orderData.tax_total_sum || 0),
                grand_total_sum: Number(orderData.grand_total_sum || 0),

                ticket_count: Number(itemData.ticket_count || 0),
                addon_count: Number(itemData.addon_count || 0),
                appointment_count: Number(itemData.appointment_count || 0),
                package_count: Number(itemData.package_count || 0),

                cancel_ticket_count: Number(cancelData.cancel_ticket_count || 0),
                cancel_addon_count: Number(cancelData.cancel_addon_count || 0),
                cancel_appointment_count: Number(cancelData.cancel_appointment_count || 0),
                cancel_package_count: Number(cancelData.cancel_package_count || 0),
                cancel_comps_count: Number(cancelData.cancel_comps_count || 0),
                cancel_committesale_count: Number(cancelData.cancel_committesale_count || 0),

                // ✅ Accurate cancel amounts
                cancel_sub_total: Number(cancelAmountData.cancel_sub_total || 0),
                cancel_tax_amount: Number(cancelAmountData.cancel_tax_amount || 0),
                cancel_grand_total: Number(cancelAmountData.cancel_grand_total || 0),

                staff_count: Number(staffMap[event.id] || 0),
            };
        });

        /* ============================
           9. Send Response
        ============================ */
        return apiResponse.success(res, "Events fetched successfully.", {
            events: responseData,
        });
    } catch (error) {
        console.error("Error fetching event details:", error);
        return apiResponse.error(res, "Internal Server Error");
    }
};











// event sales monthly reports
exports.eventSalesMonthlyReport = async (req, res) => {
    try {

        /* ============================
           1. Event ID (REQUIRED)
        ============================ */
        const { eventId } = req.params;

        /* ============================
           2. Event Details
        ============================ */
        const event = await Event.findOne({
            where: { id: eventId },
            attributes: ["id", "name"],
            include: [{
                model: Currency,
                as: "currencyName",
                attributes: ["Currency_symbol"],
            }]
        });

        if (!event) {
            return apiResponse.success(res, "Event not found", { data: {} });
        }

        /* ============================
           3. Monthly Sales Summary
        ============================ */
        const monthlySummary = await OrderItems.findAll({
            attributes: [
                [fn("DATE_FORMAT", col("createdAt"), "%m/%Y"), "month"],

                // SOLD COUNTS
                [fn("SUM", literal(`CASE WHEN type='ticket' AND cancel_status IS NULL THEN 1 ELSE 0 END`)), "tickets"],
                [fn("SUM", literal(`CASE WHEN type='addon' AND cancel_status IS NULL THEN 1 ELSE 0 END`)), "addons"],
                [fn("SUM", literal(`CASE WHEN type='package' AND cancel_status IS NULL THEN 1 ELSE 0 END`)), "packages"],
                [fn("SUM", literal(`CASE WHEN type='appointment' AND cancel_status IS NULL THEN 1 ELSE 0 END`)), "appointments"],
                [fn("SUM", literal(`CASE WHEN type='committesale' AND cancel_status IS NULL THEN 1 ELSE 0 END`)), "committees"],
                [fn("SUM", literal(`CASE WHEN type='comps' AND cancel_status IS NULL THEN 1 ELSE 0 END`)), "comps"],

                // CANCEL COUNTS
                [fn("SUM", literal(`CASE WHEN type='ticket' AND cancel_status='cancel' THEN 1 ELSE 0 END`)), "cancel_tickets"],
                [fn("SUM", literal(`CASE WHEN type='addon' AND cancel_status='cancel' THEN 1 ELSE 0 END`)), "cancel_addons"],

                // AMOUNTS
                [fn("SUM", literal(`CASE WHEN cancel_status IS NULL THEN price ELSE 0 END`)), "face_value"],
                [fn("SUM", literal(`CASE WHEN cancel_status IS NULL THEN price * 0.08 ELSE 0 END`)), "tax"],
                [fn("SUM", literal(`CASE WHEN cancel_status IS NULL THEN price * 1.08 ELSE 0 END`)), "gross_amount"],

                // CANCEL AMOUNTS
                [fn("SUM", literal(`CASE WHEN cancel_status='cancel' THEN price * 0.08 ELSE 0 END`)), "cancel_tax"],
                [fn("SUM", literal(`CASE WHEN cancel_status='cancel' THEN price * 1.08 ELSE 0 END`)), "cancel_amount"],
            ],
            where: { event_id: eventId },
            group: [literal("month")],
            order: [[literal("month"), "ASC"]],
            raw: true,
        });

        /* ============================
           4. Gross Totals
        ============================ */
        const totals = {
            tickets: 0,
            addons: 0,
            packages: 0,
            appointments: 0,
            committees: 0,
            comps: 0,
            cancel_tickets: 0,
            cancel_addons: 0,
            face_value: 0,
            tax: 0,
            gross_amount: 0,
            cancel_tax: 0,
            cancel_amount: 0,
        };

        monthlySummary.forEach(m => {
            Object.keys(totals).forEach(key => {
                totals[key] += Number(m[key] || 0);
            });
        });

        const net_amount_received =
            totals.gross_amount - totals.cancel_amount;

        /* ============================
           5. Final Response
        ============================ */
        return apiResponse.success(res, "Monthly sales report fetched", {
            event: {
                id: event.id,
                name: event.name,
                currency_symbol: event.currencyName?.Currency_symbol || "",
            },
            months: monthlySummary,
            gross_total: totals,
            net_amount_received,
        });

    } catch (error) {
        console.error("Monthly Sales Error:", error);
        return apiResponse.error(res, "Internal Server Error");
    }
};


// sales by ticket 
exports.getEventSalesTypes = async (req, res) => {
    try {
        const { event_id } = req.params;
        if (!event_id) {
            return apiResponse.error(res, "Event ID is required");
        }

        /* ============================
           1. EVENT INFO
        ============================ */
        const event = await Event.findOne({
            where: { id: event_id },
            attributes: ["id", "name"],
            include: [{
                model: Currency,
                as: "currencyName",
                attributes: ["Currency_symbol"],
            }],
        });

        if (!event) {
            return apiResponse.success(res, "No event found.", {
                event: null,
                ticketInfo: {
                    tickets: [],
                    packages: [],
                    addons: [],
                    appointments: [],
                    summary: {},
                }
            });
        }

        /* ============================
           2. TICKETS / COMMITTEE / COMPS
        ============================ */
        const ticketsRaw = await OrderItems.findAll({
            attributes: [
                "type",
                "ticket_id",
                [fn("COUNT", col("OrderItems.id")), "sold"],
                [fn("SUM", col("OrderItems.price")), "face_value"],
            ],
            where: {
                event_id,
                type: { [Op.in]: ["ticket", "committesale", "comps"] },
            },
            include: [{
                model: TicketType,
                as: "ticketType",
                attributes: ["id", "title", "price", 'count'],
            }],
            group: [
                "OrderItems.ticket_id",
                "OrderItems.type",
                "ticketType.id",
            ],
            raw: true,
        });

        const tickets = ticketsRaw.map(t => ({
            id: t["ticketType.id"],
            name: t["ticketType.title"],
            type: t.type,
            unit_price: Number(t["ticketType.price"] || 0),
            sold: Number(t.sold || 0),
            count: Number(t["ticketType.count"] || 0), // ✅
            face_value: Number(t.face_value || 0),
        }));

        /* ============================
           3. PACKAGES
        ============================ */
        const packagesRaw = await OrderItems.findAll({
            attributes: [
                "package_id",
                [fn("COUNT", col("OrderItems.id")), "sold"],
                [fn("SUM", col("OrderItems.price")), "face_value"],
            ],
            where: { event_id, type: "package" },
            include: [{
                model: Package,
                as: "package",
                attributes: ["id", "name", "grandtotal", "total_package"],
            }],
            group: ["package_id", "package.id"],
            raw: true,
        });

        const packages = packagesRaw.map(p => ({
            id: p["package.id"],
            name: p["package.name"],
            unit_price: Number(p["package.grandtotal"] || 0),
            sold: Number(p.sold || 0),
            count: Number(p["package.total_package"] || 0), // ✅
            face_value: Number(p.face_value || 0),
        }));

        /* ============================
           4. ADDONS
        ============================ */
        const addonsRaw = await OrderItems.findAll({
            attributes: [
                "addon_id",
                [fn("COUNT", col("OrderItems.id")), "sold"],
                [fn("SUM", col("OrderItems.price")), "face_value"],
            ],
            where: { event_id, type: "addon" },
            include: [{
                model: AddonTypes,
                as: "addonType",
                attributes: ["id", "name", "price", "count"],
            }],
            group: ["addon_id", "addonType.id"],
            raw: true,
        });

        const addons = addonsRaw.map(a => ({
            id: a["addonType.id"],
            name: a["addonType.name"],
            unit_price: Number(a["addonType.price"] || 0),
            sold: Number(a.sold || 0),
            count: Number(a["addonType.count"] || 0), // ✅
            face_value: Number(a.face_value || 0),
        }));

        /* ============================
           5. APPOINTMENTS
        ============================ */
        const appointmentsRaw = await OrderItems.findAll({
            attributes: [
                "appointment_id",
                [fn("COUNT", col("OrderItems.id")), "sold"],
                [fn("SUM", col("OrderItems.price")), "face_value"],
            ],
            where: { event_id, type: "appointment" },
            include: [{
                model: WellnessSlots,
                as: "appointment",
                attributes: ["id", "price", "count"],
                include: {
                    model: Wellness,
                    as: "wellnessList",
                    attributes: ["name"],
                }
            }],
            group: ["appointment_id", "appointment.id"],
            raw: true,
        });

        const appointments = appointmentsRaw.map(a => ({
            id: a["appointment.id"],
            name: a["appointment.wellnessList.name"],
            unit_price: Number(a["appointment.price"] || 0),
            sold: Number(a.sold || 0),
            count: Number(a["appointment.count"] || 0), // ✅
            face_value: Number(a.face_value || 0),
        }));


        // TOTAL ORDERS
        const totalOrdersCount = await Orders.count({
            where: { event_id },
        });

        /* ============================
           6. TOTAL HELPERS
        ============================ */
        const calcTotals = (arr) => ({
            total_sold: arr.reduce((s, i) => s + i.sold, 0),
            total_face_value: arr.reduce((s, i) => s + i.face_value, 0),
        });

        /* ============================
           7. PRICE SUMMARY
        ============================ */
        const priceInfo = await Orders.findOne({
            attributes: [
                [fn("SUM", col("sub_total")), "total_amount"],
                [fn("SUM", col("tax_total")), "total_taxes"],
                [fn("SUM", col("grand_total")), "gross_total"],
            ],
            where: { event_id },
            raw: true,
        });

        /* ============================
           8. CANCEL INFO
        ============================ */
        const cancelAmount = await OrderItems.findOne({
            attributes: [[fn("SUM", col("price")), "cancel_amount"]],
            where: { event_id, cancel_status: "cancel" },
            raw: true,
        });

        const cancelAmountValue = Number(cancelAmount?.cancel_amount || 0);
        const cancelTax = +(cancelAmountValue * 0.08).toFixed(2);

        /* ============================
           9. FINAL RESPONSE
        ============================ */

        const calcTotalCount = (arr) =>
            arr.reduce((sum, item) => sum + Number(item.count || 0), 0);

        const ticketsCountTotal = calcTotalCount(tickets);
        const packagesCountTotal = calcTotalCount(packages);
        const addonsCountTotal = calcTotalCount(addons);
        const appointmentsCountTotal = calcTotalCount(appointments);

        const grandTotalCount =
            ticketsCountTotal +
            packagesCountTotal +
            addonsCountTotal +
            appointmentsCountTotal;

        return apiResponse.success(res, "Event sales fetched successfully.", {
            event: {
                id: event.id,
                name: event.name,
                currency_symbol: event.currencyName?.Currency_symbol || "",
            },
            ticketInfo: {
                tickets,
                packages,
                addons,
                appointments,

                count_summary: {
                    tickets: ticketsCountTotal,
                    packages: packagesCountTotal,
                    addons: addonsCountTotal,
                    appointments: appointmentsCountTotal,
                    total: grandTotalCount // 🔥 FINAL
                },


                summary: {
                    tickets: calcTotals(tickets),
                    packages: calcTotals(packages),
                    addons: calcTotals(addons),
                    appointments: calcTotals(appointments),
                }
            },
            priceInfo: {
                total_amount: Number(priceInfo?.total_amount || 0),
                total_taxes: Number(priceInfo?.total_taxes || 0),
                gross_total: Number(priceInfo?.gross_total || 0),
            },
            cancelAmount: {
                cancel_amount: cancelAmountValue,
                cancel_tax: cancelTax,
            },
            totalOrdersCount
        });

    } catch (error) {
        console.error("Error fetching event sales types:", error);
        return apiResponse.error(res, "Internal Server Error");
    }
};


// Get completed orders by event with item type count
exports.getCompletedOrdersByEvent = async (req, res) => {
    try {
        const { event_id } = req.params;

        if (!event_id) {
            return apiResponse.error(res, "Event ID is required");
        }

        const orders = await Orders.findAll({
            where: { event_id },
            attributes: [
                "id",
                "order_uid",
                "sub_total",
                "tax_total",
                "grand_total",
                "created"
            ],
            include: [
                {
                    model: OrderItems,
                    as: "orderItems",
                    attributes: ["type"],
                },
                {
                    model: User,
                    as: "user",
                    attributes: ["first_name", "last_name", "email", "mobile"],
                },
                {
                    model: Event,
                    as: "event",
                    attributes: ["name"],
                    include: [
                        {
                            model: Currency,
                            as: "currencyName",
                            attributes: ["Currency_symbol"],
                        },
                    ],
                },
            ],
            order: [["created", "DESC"]],
        });

        if (!orders || orders.length === 0) {
            return apiResponse.success(
                res,
                "No completed orders found for this event",
                { orders: [] }
            );
        }

        // 🔥 FORMAT RESPONSE WITH TYPE COUNTS
        const formattedOrders = orders.map(order => {
            const itemCount = {
                ticket: 0,
                appointment: 0,
                addon: 0,
                package: 0,
                comps: 0,
                committesale: 0,
            };

            order.orderItems.forEach(item => {
                if (itemCount[item.type] !== undefined) {
                    itemCount[item.type] += 1;
                }
            });

            return {
                order_id: order.id,
                order_uid: order.order_uid,
                created: order.created,

                user: {
                    first_name: order.user?.first_name || "",
                    last_name: order.user?.last_name || "",
                    email: order.user?.email || "",
                    mobile: order.user?.mobile || "",
                },

                event: {
                    name: order.event?.name || "",
                    currency_symbol:
                        order.event?.currencyName?.Currency_symbol || "",
                },

                amount: {
                    sub_total: Number(order.sub_total || 0),
                    tax_total: Number(order.tax_total || 0),
                    grand_total: Number(order.grand_total || 0),
                },

                item_count: itemCount,       // ✅ MAIN REQUIREMENT
                total_items: order.orderItems.length,
            };
        });

        return apiResponse.success(
            res,
            "Completed orders fetched successfully",
            {
                total_orders: formattedOrders.length,
                orders: formattedOrders
            }
        );

    } catch (error) {
        console.error("Completed Orders Error:", error);
        return apiResponse.error(res, "Internal Server Error");
    }
};

