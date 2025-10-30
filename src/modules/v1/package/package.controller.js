const apiResponse = require('../../../common/utils/apiResponse');
const { body } = require('express-validator');
const { Package, PackageDetails, Event, AddonTypes, TicketType } = require('../../../models');


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
        const { name, hidden, package_limit } = req.body;

        const packageData = await Package.findByPk(id);
        if (!packageData) {
            return apiResponse.notFound(res, 'Package not found');
        }

        // ✅ Only update fields that are sent in body
        if (name !== undefined) packageData.name = name;
        if (hidden !== undefined) packageData.hidden = hidden;
        if (package_limit !== undefined) packageData.package_limit = package_limit;

        await packageData.save();

        return apiResponse.success(res, 'Package updated successfully', packageData);
    } catch (error) {
        console.error('Error in updatePackage:', error);
        return apiResponse.error(res, 'Internal Server Error', 500);
    }
};



// ✅ Get Package List or Single Package (supports hidden & id filter)
module.exports.getAllPackages = async (req, res) => {
    try {
        const { event_id, id, hidden } = req.query;

        // ✅ Include associated models (event, details, ticketType, addonType)
        const includeData = [
            {
                model: Event,
                as: 'event',
                attributes: ['id', 'name', 'date_from', 'date_to'],
            },
            {
                model: PackageDetails,
                as: 'details',
                include: [
                    {
                        model: TicketType,
                        as: 'ticketType',
                        attributes: ['id', 'title', 'price', 'ticket_image'],
                    },
                    {
                        model: AddonTypes,
                        as: 'addonType',
                        attributes: ['id', 'name', 'price', 'addon_image'],
                    },
                ],
            },
        ];

        // ✅ Prepare where condition dynamically
        const whereCondition = { event_id };
        if (hidden) whereCondition.hidden = hidden; // filter by hidden only if provided

        // ✅ If single package requested
        if (id) {
            whereCondition.id = id;

            const singlePackage = await Package.findOne({
                where: whereCondition,
                include: includeData,
            });

            if (!singlePackage) {
                return apiResponse.notFound(res, 'Package not found for this event');
            }

            return apiResponse.success(res, singlePackage, 'Package details fetched successfully');
        }

        // ✅ Fetch all packages for the event (filtered by hidden if passed)
        const packages = await Package.findAll({
            where: whereCondition,
            include: includeData,
            order: [['id', 'DESC']],
        });

        if (!packages || packages.length === 0) {
            return apiResponse.success(res, [], 'No packages found for this event');
        }

        // ✅ Normalize hidden flag to ensure it's either Y/N
        const formattedPackages = packages.map((pkg) => ({
            ...pkg.toJSON(),
            hidden: pkg.hidden === 'Y' ? 'Y' : 'N',
        }));

        return apiResponse.success(res, formattedPackages, 'Package list fetched successfully');
    } catch (error) {
        console.error('Error fetching packages:', error);
        return apiResponse.error(res, 'Something went wrong while fetching packages');
    }
};