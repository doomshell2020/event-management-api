const Stripe = require("stripe");
const { Payment, Orders, PaymentSnapshotItems, EventSlots, OrderItems, TicketType, AddonTypes, Package, TicketPricing, Coupons, WellnessSlots, Wellness } = require("../../../models");
const apiResponse = require("../../../common/utils/apiResponse");
const config = require("../../../config/app");
const { fulfilOrderFromSnapshot } = require("../orders/orders.controller");

const { Op, fn, col } = require("sequelize");
const sequelize = require("../../../models").sequelize;


const stripe = new Stripe(config.stripeKey, {
  apiVersion: "2024-06-20",
});


exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      user_id,
      event_id,
      tax_total = 0,
      sub_total = 0,
      grand_total = 0,
      discount_amount = 0,
      cartData,
      currency = "usd",
      appliedCoupon = null,
      taxBreakdown
    } = req.body;


    // BASIC VALIDATION
    if (!user_id || !event_id || !grand_total || !Array.isArray(cartData) || cartData.length == 0) {
      return apiResponse.error(res, "Missing required fields", 400);
    }

    // DISCOUNT VALIDATION LOGIC

    let validatedDiscount = 0;
    let couponCode = null;

    if (appliedCoupon) {
      couponCode = appliedCoupon.coupon_code;

      const coupon = await Coupons.findOne({
        where: {
          code: couponCode,
          event: event_id,
          status: "Y",
        },
      });

      if (!coupon) {
        return apiResponse.error(res, "Invalid coupon code", 400);
      }

      // MAX REDEEMS CHECK
      if (coupon.max_redeems && coupon.max_redeems > 0) {
        const redeemedCount = await Orders.count({ where: { discount_code: couponCode } });
        if (redeemedCount >= coupon.max_redeems) {
          return apiResponse.error(res, "Coupon has reached its maximum number of uses", 400);
        }
      }

      // DATE VALIDATION
      if (coupon.validity_period == "specified_date") {
        const today = new Date();

        if (
          today < new Date(coupon.specific_date_from) ||
          today > new Date(coupon.specific_date_to)
        ) {
          return apiResponse.error(res, "Coupon is expired", 400);
        }
      }

      // DISCOUNT CALCULATION
      if (coupon.discount_type == "percentage") {
        validatedDiscount = (Number(sub_total) * parseFloat(coupon.discount_value)) / 100;
      } else {
        validatedDiscount = parseFloat(coupon.discount_value);
      }

      // MAX LIMIT SAFETY
      if (validatedDiscount > Number(sub_total)) {
        validatedDiscount = Number(sub_total);
      }

    }

    // GRAND TOTAL VALIDATION
    // const expectedGrandTotal =
    //   Number(sub_total) +
    //   Number(tax_total) -
    //   Number(validatedDiscount);

    // if (Math.abs(expectedGrandTotal - Number(grand_total)) > 1) {
    //   return apiResponse.error(
    //     res,
    //     "Amount mismatch detected. Please refresh and try again.",
    //     400
    //   );
    // }

    // VALIDATE LIMITS (Ticket / Committee / Addon / Package)

    for (const item of cartData) {

      if (item.ticketType == "appointment") {
        continue;
      }

      let Model = null;
      let whereClause = {};
      let itemId = null;
      let typeLabel = "";
      let limitField = null;
      let nameField = null;

      if (item.ticketType == "ticket" || item.ticketType == "committesale") {
        Model = TicketType;
        whereClause.ticket_id = item.ticketId;
        itemId = item.ticketId;
        typeLabel = "Ticket";
        limitField = "count";
        nameField = "title";
      }
      else if (item.ticketType == "addon") {
        Model = AddonTypes;
        whereClause.addon_id = item.ticketId;
        itemId = item.ticketId;
        typeLabel = "Addon";
        limitField = "count";
        nameField = "name";
      }
      else if (item.ticketType == "package") {
        Model = Package;
        whereClause.package_id = item.ticketId;
        itemId = item.ticketId;
        typeLabel = "Package";
        limitField = "total_package";
        nameField = "name";
      }
      else if (item.ticketType == "ticket_price") {
        Model = TicketPricing;
        whereClause.package_id = item.ticketId;
        itemId = item.ticketId;
        typeLabel = "TicketPrice";
        limitField = "total_count";
        nameField = "price";
      }
      else {
        continue;
      }

      const masterItem = await Model.findOne({
        where: { id: itemId },
        attributes: ["id", limitField, nameField]
      });

      const totalLimit = Number(masterItem?.[limitField] || 0);

      if (!totalLimit) continue;

      const booked = await OrderItems.findOne({
        where: {
          ...whereClause,
          event_id
        },
        attributes: [
          [fn("SUM", col("count")), "totalBooked"]
        ],
        raw: true
      });

      const alreadyBooked = Number(booked?.totalBooked || 0);
      const requested = Number(item.quantity || 1);

      if (alreadyBooked + requested > totalLimit) {
        return apiResponse.error(
          res,
          `${typeLabel} "${masterItem?.[nameField] || "Item"}" is sold out or its booking limit has been reached.`,
          400
        );
      }
    }

    // CREATE SNAPSHOT

    const snapshotRows = await PaymentSnapshotItems.bulkCreate(
      cartData.map((item) => ({
        user_id,
        event_id,
        ticket_id: item.ticketId || null,
        cart_id: item.id || null,
        addon_id: item.addonId || null,
        appointment_id: item.appointmentId || null,
        committee_user_id: item.committee_user_id || null,
        item_type: item.ticketType,
        quantity: item.quantity || 1,
        price: item.price || 0,
        payment_status: "pending",

        // new taxes
        platform_fee_tax: taxBreakdown.platform_fee_tax || 0,
        payment_gateway_tax: taxBreakdown.payment_gateway_tax || 0,
        platform_fee_percent: taxBreakdown.platform_fee_percent || 0,
        payment_gateway_percent: taxBreakdown.payment_gateway_percent || 0

      }))
    );

    const snapshotIds = snapshotRows.map((r) => r.id).join(",");

    // STRIPE METADATA BUILDER

    const buildStripeMetadata = (data = {}) => {
      const metadata = {};

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          metadata[key] = String(value).slice(0, 500);
        }
      });

      return metadata;
    };

    // CREATE STRIPE PAYMENT INTENT

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(grand_total) * 100),
      currency,
      metadata: buildStripeMetadata({
        user_id,
        event_id,
        tax_total,
        sub_total,
        snapshot_ids: snapshotIds,
        discount_amount: validatedDiscount,
        grand_total,
        coupon_code: couponCode || "",
      }),
    });

    return apiResponse.success(res, "Payment Intent Created", {
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe Error:", error);
    return apiResponse.error(res, error.message, 500);
  }
};


// CREATE PAYMENT INTENT
// exports.createPaymentIntent = async (req, res) => {
//   try {
//     const {
//       user_id,
//       event_id,
//       tax_total = 0,
//       sub_total = 0,
//       grand_total = 0,
//       discount_amount = 0,
//       discount_code,
//       cartData,
//       currency = "usd",
//     } = req.body;

//     if (!user_id || !event_id || !grand_total || !cartData?.length) {
//       return apiResponse.error(res, "Missing required fields", 400);
//     }


//     // -------------------------------------------------------------
//     // VALIDATE LIMITS (Ticket / Committee / Addon / Package)
//     // -------------------------------------------------------------
//     for (const item of cartData) {

//       // 🚫 Skip appointment items completely
//       if (item.ticketType == "appointment") {
//         continue;
//       }

//       let Model = null;
//       let whereClause = {};
//       let itemId = null;
//       let typeLabel = "";
//       let limitField = null;
//       let nameField = null;

//       // 🔹 Decide source table, limit field & name field
//       if (item.ticketType == "ticket" || item.ticketType == "committesale") {
//         Model = TicketType;
//         whereClause.ticket_id = item.ticketId;
//         itemId = item.ticketId;
//         typeLabel = "Ticket";
//         limitField = "count";
//         nameField = "title";
//       }
//       else if (item.ticketType == "addon") {
//         Model = AddonTypes;
//         whereClause.addon_id = item.ticketId;
//         itemId = item.ticketId;
//         typeLabel = "Addon";
//         limitField = "count";
//         nameField = "name";
//       }
//       else if (item.ticketType == "package") {
//         Model = Package;
//         whereClause.package_id = item.ticketId;
//         itemId = item.ticketId;
//         typeLabel = "Package";
//         limitField = "total_package";
//         nameField = "name";
//       }
//       else if (item.ticketType == "ticket_price") {
//         Model = TicketPricing;
//         whereClause.package_id = item.ticketId;
//         itemId = item.ticketId;
//         typeLabel = "TicketPrice";
//         limitField = "total_count";
//         nameField = "price";
//       }
//       else {
//         continue;
//       }

//       // 🔹 Fetch limit + display name
//       const masterItem = await Model.findOne({
//         where: { id: itemId },
//         attributes: ["id", limitField, nameField]
//       });

//       const totalLimit = Number(masterItem?.[limitField] || 0);

//       // If no limit defined → allow
//       if (!totalLimit) continue;

//       // 🔹 Count already booked
//       const booked = await OrderItems.findOne({
//         where: {
//           ...whereClause,
//           event_id
//         },
//         attributes: [
//           [fn("SUM", col("count")), "totalBooked"]
//         ],
//         raw: true
//       });

//       const alreadyBooked = Number(booked?.totalBooked || 0);
//       const requested = Number(item.quantity || 1);

//       // 🔥 LIMIT CHECK
//       if (alreadyBooked + requested > totalLimit) {
//         return apiResponse.error(
//           res,
//           `${typeLabel} "${masterItem?.[nameField] || "Item"}" is sold out or its booking limit has been reached. Please remove this item from your cart and add another available option.`,
//           400
//         );
//       }
//     }

//     // Create snapshot rows
//     const snapshotRows = await PaymentSnapshotItems.bulkCreate(
//       cartData.map((item) => ({
//         user_id,
//         event_id,
//         ticket_id: item.ticketId || null,
//         cart_id: item.id || null,
//         addon_id: item.addonId || null,
//         appointment_id: item.appointmentId || null,
//         committee_user_id: item.committee_user_id || null,
//         item_type: item.ticketType,
//         quantity: item.quantity || 1,
//         price: item.price || 0,
//         payment_status: "pending",
//       }))
//     );

//     const snapshotIds = snapshotRows.map((r) => r.id).join(",");

//     const buildStripeMetadata = (data = {}) => {
//       const metadata = {};

//       Object.entries(data).forEach(([key, value]) => {
//         if (value !== undefined && value !== null && value !== "") {
//           metadata[key] = String(value).slice(0, 500);
//         }
//       });
//       return metadata;
//     };

//     // 2️⃣ Create Stripe PaymentIntent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(grand_total * 100),
//       currency,
//       metadata: buildStripeMetadata({
//         user_id,
//         event_id,
//         tax_total,
//         discount_amount,
//         sub_total,
//         grand_total,
//         discount_code,
//         snapshot_ids: snapshotIds,
//       }),
//     });

//     return apiResponse.success(res, "Payment Intent Created", {
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.error("Stripe Error:", error);
//     return apiResponse.error(res, error.message, 500);
//   }
// };

// STRIPE WEBHOOK (RAW BODY REQUIRED)
exports.stripeWebhook = async (req, res) => {
  console.log("🔥 WEBHOOK HIT");

  let event;

  try {
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripeWebhookSecret
    );

    console.log("✅ STRIPE EVENT TYPE:", event.type);
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send("Webhook Error");
  }

  try {
    // PAYMENT SUCCESS
    if (event.type == "payment_intent.succeeded") {
      const pi = event.data.object;
      const meta = pi.metadata || {};

      // 🔒 Snapshot IDs (safe)
      const snapshotIds = meta.snapshot_ids
        ? meta.snapshot_ids.split(",").map(Number)
        : [];

      if (!snapshotIds.length) {
        console.warn("⚠️ No snapshot IDs found for PI:", pi.id);
        return res.json({ received: true });
      }

      // Update snapshot payment status
      await PaymentSnapshotItems.update(
        {
          payment_status: "paid",
          payment_intent_id: pi.id,
        },
        { where: { id: snapshotIds } }
      );

      // Fetch snapshot items
      const snapshotItems = await PaymentSnapshotItems.findAll({
        where: { id: snapshotIds },
        include: [
          { model: TicketType, as: "ticketType", required: false },
          { model: AddonTypes, as: "addonType", required: false },
          { model: Package, as: "packageType", required: false },
          {
            model: TicketPricing, as: "ticketPricing",
            required: false,
            attributes: ["id", "price", "date"],
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
                attributes: [
                  "id",
                  "slot_name",
                  "slot_date",
                  "start_time",
                  "end_time",
                  "description",
                ],
              },
            ],
          },
          {
            model: WellnessSlots, as: "appointment", required: false,
            include: [
              {
                model: Wellness,
                as: "wellnessList",
                required: false
              }
            ]
          }
        ],
      });

      // Fetch snapshot items only taxes..(kamal)
      const snapshotItemsTax = await PaymentSnapshotItems.findOne({
        where: { id: snapshotIds },
        attributes: ['id', 'platform_fee_tax', 'payment_gateway_tax', 'platform_fee_percent', 'payment_gateway_percent'],
      });

      // COUPON HANDLING (NO KEY CHANGES)
      const couponCode = meta.coupon_code || null;
      let couponDetails = null;

      if (couponCode) {
        couponDetails = await Coupons.findOne({
          where: { code: couponCode },
        });
      }

      // Normalize numeric values (Stripe metadata = string)
      const grandTotal = Number(meta.grand_total || 0);
      const discountAmount = Number(meta.discount_amount || 0);

      // CREATE PAYMENT RECORD
      const payment = await Payment.create({
        user_id: Number(meta.user_id),
        event_id: Number(meta.event_id),
        amount: grandTotal,
        payment_intent: pi.id,
        payment_status: "paid",
        coupon_code: couponCode,
        discount_amount: discountAmount,
        discount_type: couponDetails?.discount_type || null,
        discount_value: couponDetails?.discount_value || null,
        // new taxes
        platform_fee_tax: snapshotItemsTax.platform_fee_tax,
        payment_gateway_tax: snapshotItemsTax.payment_gateway_tax,
        platform_fee_percent: snapshotItemsTax.platform_fee_percent,
        payment_gateway_percent: snapshotItemsTax.payment_gateway_percent
      });

      // FULFIL ORDER
      await fulfilOrderFromSnapshot({
        meta_data: meta,
        user_id: Number(meta.user_id),
        event_id: Number(meta.event_id),
        payment,
        snapshotItems,
        payment_method: "stripe",
        coupon_code: couponCode,
        discount_amount: discountAmount,
        coupon_details: couponDetails,
        snapshotItemsTax   // new taxes
      });

      console.log("✅ Payment → Order → QR completed");
    }

    // PAYMENT FAILED
    if (event.type == "payment_intent.payment_failed") {
      const pi = event.data.object;
      const meta = pi.metadata || {};

      const snapshotIds = meta.snapshot_ids
        ? meta.snapshot_ids.split(",").map(Number)
        : [];

      if (snapshotIds.length) {
        await PaymentSnapshotItems.update(
          {
            payment_status: "failed",
            payment_intent_id: pi.id,
          },
          { where: { id: snapshotIds } }
        );
      }

      console.log("❌ Payment failed:", pi.id);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};


exports.manualWebhook = async (req, res) => {
  try {
    const snapshotIds = req.body.snapshot_ids
      .split(",")
      .map(Number);

    const snapshotItems = await PaymentSnapshotItems.findAll({
      where: { id: snapshotIds },
      include: [
        { model: TicketType, as: "ticketType", required: false },
        { model: AddonTypes, as: "addonType", required: false },
        { model: Package, as: "packageType", required: false },
        {
          model: TicketPricing, as: "ticketPricing",
          required: false,
          attributes: ["id", "price", "date"],
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
              attributes: [
                "id",
                "slot_name",
                "slot_date",
                "start_time",
                "end_time",
                "description",
              ],
            },
          ],
        },
        {
          model: WellnessSlots, as: "appointment", required: false,
          include: [
            {
              model: Wellness,
              as: "wellnessList",
              required: false
            }
          ]
        }
      ],
    });
    // Fetch snapshot items only taxes..(kamal)
    const snapshotItemsTax = await PaymentSnapshotItems.findOne({
      where: { id: snapshotIds },
      attributes: ['id', 'platform_fee_tax', 'payment_gateway_tax', 'platform_fee_percent', 'payment_gateway_percent'],
    });

    const payment = await Payment.create({
      user_id: 6450,
      event_id: 346,
      amount: 500 || 0,
      payment_intent: 'pi_3Sp3sWCwP2xM68Rm1wkQ3rRR',
      payment_status: "paid",


      // new taxes
      platform_fee_tax: snapshotItemsTax.platform_fee_tax,
      payment_gateway_tax: snapshotItemsTax.payment_gateway_tax,
      platform_fee_percent: snapshotItemsTax.platform_fee_percent,
      payment_gateway_percent: snapshotItemsTax.payment_gateway_percent
    });

    const order = await fulfilOrderFromSnapshot({
      meta_data: { discount_amount: 0, grand_total: 540, snapshot_ids: req.body.snapshot_ids, sub_total: 500, tax_total: 40 },
      user_id: 6450,
      event_id: 346,
      payment,
      snapshotItems,
      payment_method: "stripe",
      snapshotItemsTax
    });

    console.log("✅ Payment → Order → QR completed");
    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};
