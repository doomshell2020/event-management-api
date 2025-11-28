const apiResponse = require('../../../common/utils/apiResponse');
const { Cart, Orders, TicketType, AddonTypes, TicketPricing, Package, EventSlots } = require('../../../models');

exports.createOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        const {
            event_id,
            payment_method,
            coupon_code
        } = req.body;

        let where = { user_id };
        // if (event_id) where.event_id = event_id;
        // console.log('>>>>>>>>>>>>>',where);


        // FETCH USER CART
        const cartList = await Cart.findAll({
            where,
            order: [["id", "DESC"]],
            include: [
                {
                    model: TicketType,
                    attributes: ["id", "title", "price"]
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
                            attributes: ['id', 'title', 'access_type', 'type', 'price']
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

        // APPLY COUPON IF EXISTS
        let couponDiscount = 0;

        // if (coupon_code) {
        //     const coupon = await Coupons.findOne({
        //         where: { code: coupon_code, status: 1 }
        //     });

        //     if (coupon) {
        //         couponDiscount = coupon.discount;
        //         totalAmount = totalAmount - couponDiscount;
        //     }
        // }

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

        // ----------------------------
        // LOOP CART ITEMS → CREATE ORDER ITEMS
        // ----------------------------
        for (const item of cartList) {
            await OrderItems.create({
                order_id: order.id,
                user_id,
                event_id: item.event_id,
                type: item.item_type,               // ticket / addon / package
                ticket_id: item.ticket_id || null,
                addon_id: item.addons_id || null,
                package_id: item.package_id || null,
                ticket_pricing_id: item.ticket_price_id || null,
                count: item.count || 1,
                price: item.total_price,
                slot_id: item.ticket_pricing ? item.ticket_pricing.event_slot_id : null,
            });
        }

        // ----------------------------
        // CLEAR CART AFTER ORDER CREATED
        // ----------------------------
        await Cart.destroy({ where });

        return apiResponse.success(res, "Order created successfully", {
            order_id: order.id,
            total_amount: totalAmount,
            coupon_applied: coupon_code || null,
            items: cartList.length
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
