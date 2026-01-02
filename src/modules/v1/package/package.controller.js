const apiResponse = require('../../../common/utils/apiResponse');
const { body } = require('express-validator');
const { Package,OrderItems, PackageDetails, Event, AddonTypes, TicketType } = require('../../../models');
const { Op, fn, col } = require("sequelize");

module.exports.createPackage = async (req, res) => {
    const t = await Package.sequelize.transaction(); // ✅ transaction start

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
            ticketType
        } = req.body;

        // ✅ Basic validation
        if (!event_id || !name || !package_limit || !hidden) {
            return apiResponse.validation(res, [], 'Required fields are missing');
        }

        // ✅ Create package
        const newPackage = await Package.create(
            {
                event_id,
                name,
                package_limit,
                discount_percentage: discount_percentage || 0,
                total,
                discount_amt: discount_amt || 0,
                grandtotal,
                hidden,
                status: 'Y'
            },
            { transaction: t }
        );

        // ✅ Validate and insert ticket/addon details
        if (Array.isArray(ticketType) && ticketType.length > 0) {
            const detailsData = ticketType.map((item) => ({
                package_id: newPackage.id,
                ticket_type_id: item.type == 'ticket' ? item.id : null,
                addon_id: item.type == 'addon' ? item.id : null,
                qty: item.count,
                price: item.price || 0,
                status: 'Y'
            }));

            await PackageDetails.bulkCreate(detailsData, { transaction: t });
        }

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
    try {
        const { id } = req.params;
        const { name, hidden, package_limit, total_package } = req.body;

        const packageData = await Package.findByPk(id);
        if (!packageData) {
            return apiResponse.notFound(res, 'Package not found');
        }

        // ✅ Only update fields that are sent in body
        if (name !== undefined) packageData.name = name;
        if (hidden !== undefined) packageData.hidden = hidden;
        if (package_limit !== undefined) packageData.package_limit = package_limit;
        if (total_package !== undefined) packageData.total_package = total_package;

        await packageData.save();

        return apiResponse.success(res, 'Package updated successfully', packageData);
    } catch (error) {
        console.error('Error in updatePackage:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};


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