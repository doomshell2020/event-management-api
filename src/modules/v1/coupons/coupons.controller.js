const apiResponse = require('../../../common/utils/apiResponse');
const { Coupons, Event, Currency, Orders, Cart, WellnessSlots, sequelize } = require('../../../models');
const { Op, fn, col, literal } = require("sequelize");

exports.applyCoupon = async (req, res) => {
    try {
        const { coupon_code, event_id, total_amount = 0 } = req.body;

        // Basic validation
        if (!coupon_code || !event_id) {
            return apiResponse.validation(res, [
                "coupon_code and event_id are required"
            ]);
        }

        const cartTotal = parseFloat(total_amount);

        if (!cartTotal || cartTotal <= 0) {
            return apiResponse.validation(res, [
                "Total amount must be greater than zero"
            ]);
        }

        // Find coupon for this event
        const coupon = await Coupons.findOne({
            where: {
                code: coupon_code,
                event: event_id,
                status: "Y",
            },
        });

        if (!coupon) {
            return apiResponse.notFound(
                res,
                "Invalid coupon code",
                "INVALID_COUPON"
            );
        }

        // Check max redeems (how many times this coupon has been used in Orders)
        const redeemedCount = await Orders.count({
            where: {
                discount_code: coupon_code
            }
        });

        if (coupon.max_redeems && redeemedCount >= coupon.max_redeems) {
            return apiResponse.conflict(
                res,
                "Coupon has reached its maximum number of uses",
                "COUPON_MAX_REDEEMED"
            );
        }

        // Date Validation
        if (coupon.validity_period == "specified_date") {
            const today = new Date();

            if (
                today < new Date(coupon.specific_date_from) ||
                today > new Date(coupon.specific_date_to)
            ) {
                return apiResponse.conflict(
                    res,
                    "Coupon is expired",
                    "COUPON_EXPIRED"
                );
            }
        }

        // Determine applicable amount
        let amountToApply = cartTotal;

        // Coupon applicability validation
        if (coupon.applicable_for != "all") {
            return apiResponse.conflict(
                res,
                `This coupon is only applicable for ${coupon.applicable_for} items`,
                "COUPON_NOT_APPLICABLE"
            );
        }

        // Calculate Discount
        let discount = 0;

        if (coupon.discount_type == "percentage") {
            discount = (amountToApply * parseFloat(coupon.discount_value)) / 100;
        } else {
            discount = parseFloat(coupon.discount_value);
        }

        // Discount validations
        if (!discount || discount <= 0) {
            return apiResponse.error(
                res,
                "Coupon discount value is invalid",
                400,
                [],
                "INVALID_DISCOUNT"
            );
        }

        if (discount > amountToApply) {
            return apiResponse.error(
                res,
                `Discount amount (${discount}) cannot be greater than cart amount (${amountToApply})`,
                400,
                [],
                "DISCOUNT_EXCEEDS_TOTAL"
            );
        }

        const finalAmount = cartTotal - discount;

        if (finalAmount < 0) {
            return apiResponse.error(
                res,
                "Final amount cannot be negative",
                400,
                [],
                "NEGATIVE_FINAL_AMOUNT"
            );
        }

        return apiResponse.success(
            res,
            "Coupon applied successfully",
            {
                coupon_code,
                original_amount: cartTotal,
                discount,
                final_amount: finalAmount,
                applicable_on: amountToApply,
                redeemed_count: redeemedCount,
                max_redeems: coupon.max_redeems || "unlimited"
            }
        );

    } catch (error) {
        console.error("Apply coupon error:", error);

        return apiResponse.error(
            res,
            "Failed to apply coupon",
            500,
            [error.message],
            "APPLY_COUPON_FAILED"
        );
    }
};

exports.CouponCodeCreation = async (req, res) => {
    try {
        const {
            couponPrefix,
            couponCount,
            event_id,
            discountType,
            discountValue,
            validityPeriod,
            validFromDate,
            validToDate,
            applicableFor,
        } = req.body;

        const totalCoupons = parseInt(couponCount, 10);

        if (!totalCoupons || totalCoupons <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid coupon count",
                code: "INVALID_COUPON_COUNT",
            });
        }

        const generatedCoupons = new Set();
        const createdCoupons = [];

        while (generatedCoupons.size < totalCoupons) {
            const randomSuffix = Math.floor(
                100000 + Math.random() * 900000
            ).toString();

            const couponCode = `${couponPrefix}${randomSuffix}`;

            const existingCoupon = await Coupons.findOne({
                where: { code: couponCode },
            });

            if (!existingCoupon && !generatedCoupons.has(couponCode)) {
                const newCoupon = await Coupons.create({
                    code: couponCode,
                    event: event_id,
                    discount_type: discountType,
                    discount_value: discountValue,
                    applicable_for: applicableFor,
                    validity_period: validityPeriod,
                    specific_date_from:
                        validityPeriod === "specified_date"
                            ? validFromDate
                            : null,
                    specific_date_to:
                        validityPeriod === "specified_date"
                            ? validToDate
                            : null,
                    status: "Y",
                });

                generatedCoupons.add(couponCode);
                createdCoupons.push(newCoupon);
            }
        }

        return res.status(201).json({
            success: true,
            message: `${createdCoupons.length} promotion codes created successfully`,
            total_created: createdCoupons.length,
        });

    } catch (error) {
        console.error("Coupon creation error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating coupons",
            error: error.message,
            code: "COUPON_CREATION_FAILED",
        });
    }
};

// get promotion code..
exports.getPromotionCodesByEvent = async (req, res) => {
    try {
        const { event_id } = req.params;

        if (!event_id) {
            return res.status(400).json({
                success: false,
                message: "event_id is required",
            });
        }

        const couponData = await Coupons.findAll({
            where: {
                status: "Y",
                event: event_id, // ✅ IMPORTANT
            },
            include: [
                {
                    model: Event,
                    attributes: ["id", "name"],
                    as: "events",
                    include: [
                        {
                            model: Currency,
                            as: "currencyName",
                            attributes: ["Currency_symbol"],
                        },
                    ],
                },
            ],
            order: [["id", "DESC"]],
        });

        const discount_code = couponData.map((c) => c.code);

        const couponRedemptions = await Orders.findAll({
            attributes: [
                "discount_code",
                [sequelize.fn("COUNT", sequelize.col("discount_code")), "totalRedeemed"],
            ],
            where: {
                discount_code: {
                    [Op.in]: discount_code,
                },
            },
            group: ["discount_code"],
        });

        const redemptionMap = {};
        couponRedemptions.forEach((r) => {
            redemptionMap[r.discount_code] = parseInt(
                r.get("totalRedeemed"),
                10
            );
        });

        const data = couponData.map((value, index) => {
            const coupon = {
                id: value.id,
                SNO: index + 1,
                PromoCode: value.code,
                Discount:
                    value.discount_type === "percentage"
                        ? `${parseFloat(value.discount_value)}% OFF`
                        : `${value.events?.currencyName?.Currency_symbol}${parseFloat(
                            value.discount_value
                        )} OFF`,
                ApplicableFor: value.applicable_for.toUpperCase(),
                CreatedOn: value.createdAt.toISOString().split("T")[0],
                Usage: redemptionMap[value.code] || 0,
            };

            if (value.validity_period === "unlimited") {
                coupon.Duration = "Unlimited";
                coupon.StartOn = null;
                coupon.ExpiresOn = null;
            } else {
                const StartOn = new Date(value.specific_date_from);
                const ExpiresOn = new Date(value.specific_date_to);

                const duration =
                    Math.round(
                        (ExpiresOn - StartOn) / (1000 * 60 * 60 * 24)
                    ) + 1;

                coupon.Duration = `${duration} Days`;
                coupon.StartOn = StartOn.toISOString().split("T")[0];
                coupon.ExpiresOn = ExpiresOn.toISOString().split("T")[0];
            }

            return coupon;
        });

        return res.status(200).json({
            success: true,
            coupons: data,
        });
    } catch (error) {
        console.error("PromotionCodes error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve promotion codes",
            error: error.message,
        });
    }
};

// new api for couponEligible for appointments pass
exports.isCouponAppointmentEligible = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;
        const { couponCode } = req.query;

        if (!eventId || !couponCode || !userId) {
            return res.status(400).json({
                success: false,
                message: "eventId, couponCode and userId are required",
            });
        }

        const coupon = await Coupons.findOne({
            where: {
                code: couponCode,
                event: eventId,
                status: "Y",
            },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Invalid or expired coupon code",
            });
        }

        /* -------- Date Validation -------- */
        if (coupon.validity_period == "specified_date") {
            const today = new Date();

            if (
                (coupon.specific_date_from && new Date(coupon.specific_date_from) > today) ||
                (coupon.specific_date_to && new Date(coupon.specific_date_to) < today)
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Coupon not valid for current date",
                });
            }
        }

        /* -------- Redeem Count -------- */
        const redemptionCount = await Orders.count({
            where: { discount_code: couponCode, Approved: "succeeded" },
        });

        if (redemptionCount >= Number(coupon.max_redeems)) {
            return res.status(403).json({
                success: false,
                message: "Coupon redemption limit reached",
            });
        }

        let discountPrice = 0;

        /* -------- Discount Logic -------- */
        const discountValue = Number(coupon.discount_value);

        const calculateDiscount = (amount) => {
            if (coupon.discount_type === "percentage") {
                return (amount * discountValue) / 100;
            }
            return discountValue;
        };

        /* -------- Applicable Logic -------- */
        if (coupon.applicable_for == "appointment") {
            const cart = await Cart.findOne({
                where: { ticket_type: "appointment", user_id: userId },
                include: [{ model: WellnessSlots, as: 'appointments' }],
            });

            if (!cart) {
                return res.status(403).json({
                    success: false,
                    message: "Coupon valid only for appointments",
                });
            }

            discountPrice = calculateDiscount(cart?.appointments?.price);
        }
        /* -------- Success Response -------- */
        return res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            data: {
                ...coupon.dataValues,
                discountAmt: discountPrice
            },
        });

    } catch (error) {
        console.error("Coupon validation error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
