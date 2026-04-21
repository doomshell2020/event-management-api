const apiResponse = require('../../../common/utils/apiResponse');
const { Cart, Payment, QuestionsBook, CartQuestionsDetails, PaymentSnapshotItems, Orders, TicketType, AddonTypes, TicketPricing, Package, EventSlots, OrderItems, Event, WellnessSlots, Wellness, User, Company, Currency, Questions, QuestionItems, Templates,StaffGateAccess } = require('../../../models');



// exports.scanTickets = async (req, res) => {
//     const user_id = req.user?.id;
//     const t = await OrderItems.sequelize.transaction();

//     try {
//         const { order_item_id, scanner_id, type } = req.body;
//         const now = new Date();

//         // ✅ 1. Scanner suspend check
//         const suspendedUser = await User.findOne({
//             where: { id: scanner_id, is_suspend: "Y" },
//             transaction: t
//         });

//         if (suspendedUser) {
//             await t.rollback();
//             return res.status(403).json({
//                 success: false,
//                 message: "You are suspended from scanning!",
//                 ticketBackground: "#E4002B"
//             });
//         }

//         // ✅ 2. Get record + user + ticketType
//         const item = await OrderItems.findByPk(order_item_id, {
//             include: [
//                 {
//                     model: User,
//                     as: "user",
//                     attributes: ["id", "first_name", "last_name", "email"]
//                 },
//                 {
//                     model: TicketType, // 👈 IMPORTANT
//                     as: "ticketType",
//                     attributes: ["id", "gate_id", "eventid"]
//                 }
//             ],
//             transaction: t,
//             lock: t.LOCK.UPDATE
//         });

//         if (!item) {
//             await t.rollback();
//             return res.status(404).json({
//                 success: false,
//                 message: "Record not found"
//             });
//         }

//         // ✅ 3. Already scanned
//         if (item.is_scanned === "Y") {
//             await t.rollback();
//             return res.status(400).json({
//                 success: false,
//                 message: "Already scanned!",
//                 ticketBackground: "#E4002B",
//                 data: {
//                     user: item.user
//                 }
//             });
//         }

//         // ==================================================
//         // 🔥 GATE ACCESS CHECK (NEW)
//         // ==================================================
//         if (!["addon", "package"].includes(type)) {

//             const gateId = item.ticketType?.gate_id;
//             const eventId = item.ticketType?.eventid;

//             if (!gateId) {
//                 await t.rollback();
//                 return res.status(400).json({
//                     success: false,
//                     message: "Gate not assigned to this ticket!",
//                     ticketBackground: "#E4002B"
//                 });
//             }

//             const access = await StaffGateAccess.findOne({
//                 where: {
//                     user_id: scanner_id,
//                     event_id: eventId,
//                     gate_id: gateId
//                 },
//                 transaction: t
//             });

//             if (!access) {
//                 await t.rollback();
//                 return res.status(403).json({
//                     success: false,
//                     message: "You are not authorized for this gate!",
//                     ticketBackground: "#E4002B"
//                 });
//             }
//         }

//         // ==================================================
//         // 🔥 TYPE BASED VALIDATION
//         // ==================================================
//         switch (type) {
//             case "ticket":
//             case "ticket_price":
//             case "comps":
//             case "addon":
//                 break;

//             case "appointment":
//                 if (item.appointment_date && new Date(item.appointment_date) < now) {
//                     await t.rollback();
//                     return res.status(400).json({
//                         success: false,
//                         message: "Appointment expired!",
//                         ticketBackground: "#E4002B"
//                     });
//                 }
//                 break;

//             case "package":
//                 if (item.remaining_uses <= 0) {
//                     await t.rollback();
//                     return res.status(400).json({
//                         success: false,
//                         message: "Package limit exceeded!",
//                         ticketBackground: "#E4002B"
//                     });
//                 }

//                 await item.update({
//                     remaining_uses: item.remaining_uses - 1
//                 }, { transaction: t });
//                 break;

//             case "committesale":
//                 if (item.is_verified === "N") {
//                     await t.rollback();
//                     return res.status(400).json({
//                         success: false,
//                         message: "Not verified sale!",
//                         ticketBackground: "#E4002B"
//                     });
//                 }
//                 break;

//             default:
//                 await t.rollback();
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invalid type"
//                 });
//         }

//         // ==================================================
//         // ✅ FINAL UPDATE
//         // ==================================================
//         await item.update({
//             is_scanned: "Y",
//             scanned_date: now,
//             scanner_id: scanner_id,
//             used_by: item.user?.email || null
//         }, { transaction: t });

//         await t.commit();

//         // ==================================================
//         // ✅ SUCCESS RESPONSE
//         // ==================================================
//         return res.status(200).json({
//             success: true,
//             message: `${type} scanned successfully!`,
//             ticketBackground: "#28A745",
//             data: {
//                 ticket_id: item.id,
//                 type: type,
//                 scanned_at: now,
//                 user: {
//                     id: item.user?.id,
//                     name: `${item.user?.first_name || ""} ${item.user?.last_name || ""}`,
//                     email: item.user?.email
//                 }
//             }
//         });

//     } catch (error) {
//         console.error(error);
//         await t.rollback();
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong"
//         });
//     }
// };



exports.scanTickets = async (req, res) => {
    try {
        const { order_item_id, scanner_id, type } = req.body;
        const now = new Date();

        // ==================================================
        // ✅ 1. PARALLEL FETCH (FASTER)
        // ==================================================
        const [suspendedUser, item] = await Promise.all([
            User.findOne({
                where: { id: scanner_id, is_suspend: "Y" },
                attributes: ["id"]
            }),
            OrderItems.findByPk(order_item_id, {
                include: [
                    {
                        model: User,
                        as: "user",
                        attributes: ["id", "first_name", "last_name", "email"]
                    },
                    {
                        model: TicketType,
                        as: "ticketType",
                        attributes: ["id", "gate_id", "eventid"]
                    }
                ]
            })
        ]);

        // ==================================================
        // ✅ 2. VALIDATIONS
        // ==================================================

        if (suspendedUser) {
            return res.status(403).json({
                success: false,
                message: "You are suspended from scanning!",
                ticketBackground: "#E4002B"
            });
        }

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }

        if (item.is_scanned === "Y") {
            return res.status(400).json({
                success: false,
                message: "Already scanned!",
                ticketBackground: "#E4002B",
                data: { user: item.user }
            });
        }

        if (!item.ticketType) {
            return res.status(400).json({
                success: false,
                message: "Ticket type not found!",
                ticketBackground: "#E4002B"
            });
        }

        // ==================================================
        // 🔥 GATE ACCESS CHECK
        // ==================================================
        if (!["addon", "package"].includes(type)) {

            const gateId = item.ticketType.gate_id;
            const eventId = item.ticketType.eventid;

            const access = await StaffGateAccess.findOne({
                where: {
                    user_id: scanner_id,
                    event_id: eventId,
                    gate_id: gateId
                },
                attributes: ["id"] // 🔥 only required field
            });

            if (!access) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized for this gate!",
                    ticketBackground: "#E4002B"
                });
            }
        }

        // ==================================================
        // 🔥 TYPE VALIDATION
        // ==================================================
        if (type === "appointment") {
            if (item.appointment_date && new Date(item.appointment_date) < now) {
                return res.status(400).json({
                    success: false,
                    message: "Appointment expired!",
                    ticketBackground: "#E4002B"
                });
            }
        }

        if (type === "package") {
            if (item.remaining_uses <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Package limit exceeded!",
                    ticketBackground: "#E4002B"
                });
            }

            await item.update({
                remaining_uses: item.remaining_uses - 1
            });
        }

        if (type === "committesale" && item.is_verified === "N") {
            return res.status(400).json({
                success: false,
                message: "Not verified sale!",
                ticketBackground: "#E4002B"
            });
        }

        // ==================================================
        // ✅ FINAL UPDATE (NO TRANSACTION)
        // ==================================================
        await item.update({
            is_scanned: "Y",
            scanned_date: now,
            scanner_id: scanner_id,
            used_by: item.user?.email || null
        });

        // ==================================================
        // ✅ RESPONSE
        // ==================================================
        return res.status(200).json({
            success: true,
            message: `${type} scanned successfully!`,
            ticketBackground: "#28A745",
            data: {
                ticket_id: item.id,
                type,
                scanned_at: now,
                user: {
                    id: item.user?.id,
                    name: `${item.user?.first_name || ""} ${item.user?.last_name || ""}`,
                    email: item.user?.email
                }
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};