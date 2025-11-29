const apiResponse = require('../../../common/utils/apiResponse');
const { Cart, Orders, TicketType, AddonTypes, TicketPricing, Package, EventSlots, OrderItems } = require('../../../models');
const { generateQRCode } = require("../../../common/utils/qrGenerator");
const orderConfirmationTemplateWithQR = require('../../../common/utils/emailTemplates/orderConfirmationWithQR');
const sendEmail = require('../../../common/utils/sendEmail');
const path = require("path");

exports.createOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = req.user;  // for email template
        const { event_id, payment_method, coupon_code } = req.body;
        // console.log('>>>>>>>>>>>>>>>',user);
        // return false
        

        let where = { user_id };
        if (event_id) where.event_id = event_id;

        // FETCH CART
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

        // CALCULATE TOTAL AMOUNT
        let totalAmount = 0;
        cartList.forEach(item => {
            if (item.ticket_type == 'ticket') {
                totalAmount += Number(item.TicketType.price || 0);
            } else if (item.ticket_type == 'ticket_price') {
                totalAmount += Number(item.TicketPricing.price || 0);
            }
        });

        // CREATE ORDER
        const order = await Orders.create({
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

        // LOOP CART ITEMS → CREATE ORDER ITEMS + QR CODE
        for (const item of cartList) {
            let price = 0;
            if (item.ticket_type == "ticket") price = Number(item.TicketType?.price || 0);
            else if (item.ticket_type == "ticket_price") price = Number(item.TicketPricing?.price || 0);
            else if (item.ticket_type == "addon") price = Number(item.AddonType?.price || 0);
            else if (item.ticket_type == "package") price = Number(item.Package?.price || 0);

            // 1️⃣ CREATE ORDER ITEM
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
                price: price,
                slot_id: item.TicketPricing?.event_slot_id || null
            });

            // 2️⃣ GENERATE QR CODE
            const qr = await generateQRCode(orderItem);

            // 3️⃣ UPDATE ORDER ITEM WITH QR PATH + HASH
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

                // OPTIONAL: add attachment
                attachments.push({
                    filename: qr.qrImageName,
                    path: path.join(__dirname, "../../../uploads/qr_codes/", qr.qrImageName)
                });
            }
        }

        // CLEAR CART
        await Cart.destroy({ where });

        // SEND EMAIL WITH QR CODES
        try {
            await sendEmail(
                user.email,
                "Your Ticket Order Confirmation",
                orderConfirmationTemplateWithQR(user, order, cartList, qrResults),
                attachments   // optional PDF/PNG attachments
            );
        } catch (emailError) {
            console.log("Email sending failed:", emailError);
        }

        return apiResponse.success(res, "Order created successfully", {
            order_id: order.id,
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