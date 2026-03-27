const apiResponse = require('../../../common/utils/apiResponse');
const { body } = require('express-validator');
const { Package,OrderItems, PackageDetails, Event, AddonTypes, TicketType,TicketPricing } = require('../../../models');
const { Op, fn, col } = require("sequelize");

// module.exports.createPackage = async (req, res) => {
//     const t = await Package.sequelize.transaction(); // ✅ transaction start

//     try {
//         const {
//             event_id,
//             name,
//             package_limit,
//             discount_percentage,
//             total,
//             discount_amt,
//             grandtotal,
//             hidden,
//             ticketType,
//             total_package
//         } = req.body;

//         // ✅ Basic validation
//         if (!event_id || !name || !package_limit || !hidden) {
//             return apiResponse.validation(res, [], 'Required fields are missing');
//         }

//         // ✅ Create package
//         const newPackage = await Package.create(
//             {
//                 event_id,
//                 name,
//                 package_limit,
//                 discount_percentage: discount_percentage || 0,
//                 total,
//                 total_package,
//                 discount_amt: discount_amt || 0,
//                 grandtotal,
//                 hidden,
//                 status: 'Y'
//             },
//             { transaction: t }
//         );

//         // ✅ Validate and insert ticket/addon details
//         if (Array.isArray(ticketType) && ticketType.length > 0) {
//             const detailsData = ticketType.map((item) => ({
//                 package_id: newPackage.id,
//                 ticket_type_id: item.type == 'ticket' ? item.id : null,
//                 addon_id: item.type == 'addon' ? item.id : null,
//                 qty: item.count,
//                 price: item.price || 0,
//                 status: 'Y'
//             }));

//             await PackageDetails.bulkCreate(detailsData, { transaction: t });
//         }

//         await t.commit();

//         return apiResponse.success(res, 'Package created successfully', newPackage);
//     } catch (error) {
//         console.error('Error in createPackage:', error);
//         await t.rollback();
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// };

// new api with count validation check...
module.exports.createPackage = async (req, res) => {
    const t = await Package.sequelize.transaction();

    try {
        const {
            event_id,
            name,
            package_limit,
            discount_percentage,
            total,
            discount_amt,
            grandtotal,
            hidden,
            ticketType,
            total_package
        } = req.body;

        // ===============================
        // ✅ BASIC VALIDATION
        // ===============================
        if (!event_id || !name || !package_limit || hidden === undefined) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        if (!Array.isArray(ticketType) || ticketType.length === 0) {
            return apiResponse.validation(res, [], 'Package items are required');
        }

        const totalPackageQty = total_package || 1;

        // ===============================
        // ✅ STOCK VALIDATION
        // ===============================
        for (const item of ticketType) {

            if (!item.id || !item.type || !item.count) {
                await t.rollback();
                return apiResponse.validation(res, [], 'Invalid package item data');
            }

            const requiredQty = item.count * totalPackageQty;

            // =====================================================
            // 🎟️ TICKET VALIDATION (NORMAL + PRICING + PACKAGE)
            // =====================================================
            if (item.type === "ticket") {

                const ticket = await TicketType.findOne({
                    where: { id: item.id, eventid: event_id },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (!ticket) {
                    await t.rollback();
                    return apiResponse.validation(res, [], 'Ticket not found');
                }

                // ✅ PACKAGE USED
                const packageUsedQty = await PackageDetails.sum('qty', {
                    where: { ticket_type_id: item.id },
                    transaction: t
                });

                // ===============================
                // ✅ NORMAL TICKET SOLD
                // ===============================
                const normalSoldQty = await OrderItems.sum('count', {
                    where: {
                        ticket_id: item.id,
                        status: 'Y'
                    },
                    transaction: t
                });

                // ===============================
                // ✅ PRICING BASED SOLD
                // ===============================
                const pricingIds = await TicketPricing.findAll({
                    where: { ticket_type_id: item.id },
                    attributes: ['id'],
                    raw: true,
                    transaction: t
                });

                const pricingIdList = pricingIds.map(p => p.id);

                let pricingSoldQty = 0;

                if (pricingIdList.length > 0) {
                    pricingSoldQty = await OrderItems.sum('count', {
                        where: {
                            ticket_pricing_id: pricingIdList,
                            status: 'Y'
                        },
                        transaction: t
                    });
                }

                // ===============================
                // ✅ FINAL SOLD + AVAILABLE
                // ===============================
                const totalSoldQty =
                    (normalSoldQty || 0) + (pricingSoldQty || 0);

                const availableQty =
                    ticket.count - ((packageUsedQty || 0) + totalSoldQty);

                if (requiredQty > availableQty) {
                    await t.rollback();
                    return apiResponse.validation(
                        res,
                        [],
                        `Only ${availableQty} tickets remaining, but required ${requiredQty}`
                    );
                }
            }

            // =====================================================
            // ➕ ADDON VALIDATION
            // =====================================================
            else if (item.type === "addon") {

                const addon = await AddonTypes.findOne({
                    where: { id: item.id, event_id },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (!addon) {
                    await t.rollback();
                    return apiResponse.validation(res, [], 'Addon not found');
                }

                const packageUsedQty = await PackageDetails.sum('qty', {
                    where: { addon_id: item.id },
                    transaction: t
                });

                const orderSoldQty = await OrderItems.sum('count', {
                    where: {
                        addon_id: item.id,
                        status: 'Y'
                    },
                    transaction: t
                });

                const availableQty =
                    addon.count - ((packageUsedQty || 0) + (orderSoldQty || 0));

                if (requiredQty > availableQty) {
                    await t.rollback();
                    return apiResponse.validation(
                        res,
                        [],
                        `Only ${availableQty} addons remaining, but required ${requiredQty}`
                    );
                }
            }
        }

        // ===============================
        // ✅ CREATE PACKAGE
        // ===============================
        const newPackage = await Package.create(
            {
                event_id,
                name,
                package_limit,
                discount_percentage: discount_percentage || 0,
                total,
                total_package: totalPackageQty,
                discount_amt: discount_amt || 0,
                grandtotal,
                hidden,
                status: 'Y'
            },
            { transaction: t }
        );

        // ===============================
        // ✅ INSERT PACKAGE DETAILS
        // ===============================
        const detailsData = ticketType.map((item) => ({
            package_id: newPackage.id,
            ticket_type_id: item.type === 'ticket' ? item.id : null,
            addon_id: item.type === 'addon' ? item.id : null,

            // 🔥 FINAL QTY (MULTIPLIED)
            qty: item.count * totalPackageQty,

            price: item.price || 0,
            status: 'Y'
        }));

        await PackageDetails.bulkCreate(detailsData, { transaction: t });

        await t.commit();

        return apiResponse.success(res, 'Package created successfully', newPackage);

    } catch (error) {
        console.error('Error in createPackage:', error);
        await t.rollback();
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};






// ✅ Update Package (name, hidden, limit — any or all)
module.exports.updatePackage = async (req, res) => {
    const t = await Package.sequelize.transaction();

    try {
        const { id } = req.params;
        const { name, hidden, package_limit, total_package } = req.body;

        const packageData = await Package.findByPk(id, {
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!packageData) {
            await t.rollback();
            return apiResponse.notFound(res, 'Package not found');
        }

        // ===============================
        // ✅ SOLD PACKAGE COUNT
        // ===============================
        const soldPackageQty = await OrderItems.sum('count', {
            where: {
                package_id: id,
                status: 'Y' // ya CONFIRMED
            },
            transaction: t
        });

        const soldQty = soldPackageQty || 0;

        // ===============================
        // ✅ VALIDATE total_package
        // ===============================
        if (total_package !== undefined) {

            if (total_package < soldQty) {
                await t.rollback();
                return apiResponse.validation(
                    res,
                    [],
                    `Cannot reduce package below sold quantity (${soldQty})`
                );
            }
        }

        // ===============================
        // ✅ UPDATE FIELDS
        // ===============================
        if (name !== undefined) packageData.name = name;
        if (hidden !== undefined) packageData.hidden = hidden;
        if (package_limit !== undefined) packageData.package_limit = package_limit;
        if (total_package !== undefined) packageData.total_package = total_package;

        await packageData.save({ transaction: t });

        await t.commit();

        return apiResponse.success(res, 'Package updated successfully', packageData);

    } catch (error) {
        console.error('Error in updatePackage:', error);
        await t.rollback();
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};



// module.exports.updatePackage = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, hidden, package_limit, total_package } = req.body;

//         const packageData = await Package.findByPk(id);
//         if (!packageData) {
//             return apiResponse.notFound(res, 'Package not found');
//         }

//         // ✅ Only update fields that are sent in body
//         if (name !== undefined) packageData.name = name;
//         if (hidden !== undefined) packageData.hidden = hidden;
//         if (package_limit !== undefined) packageData.package_limit = package_limit;
//         if (total_package !== undefined) packageData.total_package = total_package;

//         await packageData.save();

//         return apiResponse.success(res, 'Package updated successfully', packageData);
//     } catch (error) {
//         console.error('Error in updatePackage:', error);
//         return apiResponse.error(res, 'Internal Server Error', 500);
//     }
// };

module.exports.getAllPackages = async (req, res) => {
    try {
        const { event_id, id, hidden } = req.query;

        if (!event_id) {
            return apiResponse.error(res, "event_id is required", 400);
        }

        // ✅ Include associated models
        const includeData = [
            {
                model: Event,
                as: "event",
                attributes: ["id", "name", "date_from", "date_to"],
            },
            {
                model: PackageDetails,
                as: "details",
                include: [
                    {
                        model: TicketType,
                        as: "ticketType",
                        attributes: ["id", "title", "price", "ticket_image"],
                        include: {model:TicketPricing,as:"pricings"}
                    },
                    {
                        model: AddonTypes,
                        as: "addonType",
                        attributes: ["id", "name", "price", "addon_image"],
                    },
                ],
            },
        ];

        // ✅ Dynamic where condition
        const whereCondition = { event_id };
        if (hidden) whereCondition.hidden = hidden;
        if (id) whereCondition.id = id;

        // ✅ Fetch packages
        const packages = await Package.findAll({
            where: whereCondition,
            include: includeData,
            order: [["id", "DESC"]],
        });

        if (!packages || packages.length == 0) {
            return apiResponse.success(res, "No packages found for this event", []);
        }

        // ✅ Fetch sold count grouped by package_id
        const soldData = await OrderItems.findAll({
            where: {
                event_id,
                package_id: {
                    [Op.ne]: null,
                },
            },
            attributes: [
                "package_id",
                [fn("SUM", col("count")), "sold_count"],
            ],
            group: ["package_id"],
            raw: true,
        });

        // ✅ Convert sold data to map
        const soldMap = {};
        soldData.forEach((row) => {
            soldMap[row.package_id] = Number(row.sold_count || 0);
        });

        // ✅ Attach sold & available counts
        const formattedPackages = packages.map((pkg) => {
            const soldCount = soldMap[pkg.id] || 0;
            const totalLimit = Number(pkg.total_package || 0);
            const availableCount = Math.max(totalLimit - soldCount, 0);

            return {
                ...pkg.toJSON(),
                hidden: pkg.hidden === "Y" ? "Y" : "N",
                sold_count: soldCount,
                available_count: totalLimit ? availableCount : null,
                is_sold_out: totalLimit ? availableCount <= 0 : false,
            };
        });

        // ✅ Single package response
        if (id) {
            return apiResponse.success(
                res,
                "Package details fetched successfully",
                formattedPackages[0]
            );
        }

        return apiResponse.success(
            res,
            "Package list fetched successfully",
            formattedPackages
        );
    } catch (error) {
        console.error("Error fetching packages:", error);
        return apiResponse.error(
            res,
            "Something went wrong while fetching packages"
        );
    }
};