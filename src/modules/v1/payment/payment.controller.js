const Stripe = require("stripe");
const { Payment } = require("../../../models");
const apiResponse = require("../../../common/utils/apiResponse");
const config = require("../../../config/app");

// Initialize Stripe
const stripe = new Stripe(config.stripeKey, {
  apiVersion: "2024-06-20",
});

// -------------------------------------------------------------
//                     CREATE PAYMENT INTENT
// -------------------------------------------------------------
exports.createPaymentIntent = async (req, res) => {
  try {
    const { user_id, event_id, amount, currency = "inr" } = req.body;

    if (!user_id || !event_id || !amount) {
      return apiResponse.error(res, "Missing required fields");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,       // convert to cents
      currency: currency,         // default "usd"
      metadata: {
        user_id: String(user_id),
        event_id: String(event_id),
        description: "Event Ticket Payment",
      },
    });

    return apiResponse.success(res, "Payment Intent Created Successfully", {
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    return apiResponse.error(res, "Stripe Error", error.message);
  }
};

// -------------------------------------------------------------
//                         STRIPE WEBHOOK
// -------------------------------------------------------------
exports.stripeWebhook = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      req.body,                      // RAW body (important)
      signature,
      config.stripeWebhookSecret     // from your config/app.js
    );

  } catch (err) {
    console.error("❌ Webhook Signature Verification Failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --------------------------------------------------
  // PAYMENT SUCCESS
  // --------------------------------------------------
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;

    await Payment.create({
      user_id: pi.metadata.user_id,
      event_id: pi.metadata.event_id,
      amount: pi.amount_received / 100,
      stripe_payment_id: pi.id,
      payment_status: "paid",
    });

    console.log("✔ Payment saved successfully");
  }

  // --------------------------------------------------
  // PAYMENT FAILED
  // --------------------------------------------------
  if (event.type == "payment_intent.payment_failed") {
    const pi = event.data.object;

    await Payment.create({
      user_id: pi.metadata.user_id,
      event_id: pi.metadata.event_id,
      amount: pi.amount / 100,
      stripe_payment_id: pi.id,
      payment_status: "failed",
    });

    console.log("❌ Payment saved as FAILED");
  }

  return res.json({ received: true });
};
