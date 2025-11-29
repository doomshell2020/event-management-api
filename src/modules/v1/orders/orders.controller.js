const apiResponse = require('../../../common/utils/apiResponse');
const { Cart, Orders, TicketType, AddonTypes, TicketPricing, Package, EventSlots, OrderItems, Event } = require('../../../models');
const { generateQRCode } = require("../../../common/utils/qrGenerator");
const orderConfirmationTemplateWithQR = require('../../../common/utils/emailTemplates/orderConfirmationWithQR');
const sendEmail = require('../../../common/utils/sendEmail');
const path = require("path");
const { generateUniqueOrderId } = require('../../../common/utils/helpers');
const { convertUTCToLocal } = require('../../../common/utils/timezone');

exports.createOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = req.user;
        const { event_id, payment_method, coupon_code } = req.body;

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

        // 🕒 Convert to user-friendly readable format
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
        });

        // CREATE ORDER

        const order_uid = generateUniqueOrderId();

        const order = await Orders.create({
            order_uid,
            user_id,
            event_id,
            total_amount: totalAmount,
            paymenttype: payment_method,
            coupon_code: coupon_code || null,
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
                orderConfirmationTemplateWithQR(user, order, cartList, qrResults, formattedEvent),
                attachments
            );
        } catch (emailError) {
            console.log("Email sending failed:", emailError);
        }

        return apiResponse.success(res, "Order created successfully", {
            order_uid,
            order_id: order.id,
            event: formattedEvent,
            total_amount: totalAmount,
            items: cartList.length,
            qr_codes: qrResults
        });

    } catch (error) {
        console.log(error);
        return apiResponse.error(res, "Error creating order", 500);
    }
};


// GET ORDER DETAILS
exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const user_id = req.user.id;

        const order = await Orders.findOne({
            where: {
                id: orderId,
                user_id
            }
        });

        if (!order) {
            return apiResponse.error(res, "Order not found", 404);
        }

        return apiResponse.success(res, "Order details", order);

    } catch (error) {
        console.log(error);
        return apiResponse.error(res, "Error fetching order details", 500);
    }
};

// LIST ALL USER ORDERS
exports.listOrders = async (req, res) => {
    try {
        const user_id = req.user.id;

        const orders = await Orders.findAll({
            where: { user_id },
            order: [['id', 'DESC']]
        });

        return apiResponse.success(res, "Orders list", orders);

    } catch (error) {
        console.log(error);
        return apiResponse.error(res, "Error fetching order list", 500);
    }
};