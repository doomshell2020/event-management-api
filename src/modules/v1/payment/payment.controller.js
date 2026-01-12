const Stripe = require("stripe");
const { Payment, PaymentSnapshotItems, OrderItems, TicketType, AddonTypes, Package, TicketPricing } = require("../../../models");
const apiResponse = require("../../../common/utils/apiResponse");
const config = require("../../../config/app");
const { fulfilOrderFromSnapshot } = require("../orders/orders.controller");

const { Op, fn, col } = require("sequelize");
const sequelize = require("../../../models").sequelize;


const stripe = new Stripe(config.stripeKey, {
  apiVersion: "2024-06-20",
});

// -------------------------------------------------------------
// CREATE PAYMENT INTENT
exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      user_id,
      event_id,
      tax_total = 0,
      sub_total = 0,
      grand_total = 0,
      discount_amount = 0,
      discount_code,
      cartData,
      currency = "usd",
    } = req.body;

    if (!user_id || !event_id || !grand_total || !cartData?.length) {
      return apiResponse.error(res, "Missing required fields", 400);
    }


    // -------------------------------------------------------------
    // VALIDATE LIMITS (Ticket / Committee / Addon / Package)
    // -------------------------------------------------------------
    for (const item of cartData) {

      // 🚫 Skip appointment items completely
      if (item.ticketType == "appointment") {
        continue;
      }

      let Model = null;
      let whereClause = {};
      let itemId = null;
      let typeLabel = "";
      let limitField = null;
      let nameField = null;

      // 🔹 Decide source table, limit field & name field
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
      
      // 🔹 Fetch limit + display name
      const masterItem = await Model.findOne({
        where: { id: itemId },
        attributes: ["id", limitField, nameField]
      });

      const totalLimit = Number(masterItem?.[limitField] || 0);

      // If no limit defined → allow
      if (!totalLimit) continue;

      // 🔹 Count already booked
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

      // 🔥 LIMIT CHECK
      if (alreadyBooked + requested > totalLimit) {
        return apiResponse.error(
          res,
          `${typeLabel} "${masterItem?.[nameField] || "Item"}" is sold out or its booking limit has been reached. Please remove this item from your cart and add another available option.`,
          400
        );
      }
    }

    // Create snapshot rows
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
      }))
    );

    const snapshotIds = snapshotRows.map((r) => r.id).join(",");

    const buildStripeMetadata = (data = {}) => {
      const metadata = {};

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          metadata[key] = String(value).slice(0, 500);
        }
      });
      return metadata;
    };

    // 2️⃣ Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grand_total * 100),
      currency,
      metadata: buildStripeMetadata({
        user_id,
        event_id,
        tax_total,
        discount_amount,
        sub_total,
        grand_total,
        discount_code,
        snapshot_ids: snapshotIds,
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

// -------------------------------------------------------------
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
    // ---------------------------------------------------------
    if (event.type == "payment_intent.succeeded") {
      const pi = event.data.object;

      const snapshotIds = pi.metadata.snapshot_ids
        .split(",")
        .map(Number);

      await PaymentSnapshotItems.update(
        {
          payment_status: "paid",
          payment_intent_id: pi.id,
        },
        { where: { id: snapshotIds } }
      );

      const snapshotItems = await PaymentSnapshotItems.findAll({
        where: { id: snapshotIds },
        raw: true,
      });

      const payment = await Payment.create({
        user_id: pi.metadata.user_id,
        event_id: pi.metadata.event_id,
        amount: pi.metadata?.grand_total || 0,
        payment_intent: pi.id,
        payment_status: "paid",
      });

      const order = await fulfilOrderFromSnapshot({
        meta_data: pi.metadata,
        user_id: pi.metadata.user_id,
        event_id: pi.metadata.event_id,
        payment,
        snapshotItems,
        payment_method: "stripe",
      });
      // console.log('>>>>>>>>>>>>>>order',order);      

      console.log("✅ Payment → Order → QR completed");
    }

    // PAYMENT FAILED
    // ---------------------------------------------------------
    if (event.type == "payment_intent.payment_failed") {
      const pi = event.data.object;
      const snapshotIds = pi.metadata.snapshot_ids
        .split(",")
        .map(Number);

      await PaymentSnapshotItems.update(
        {
          payment_status: "failed",
          payment_intent_id: pi.id,
        },
        { where: { id: snapshotIds } }
      );

      console.log("❌ Payment failed");
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};
