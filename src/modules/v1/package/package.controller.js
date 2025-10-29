const apiResponse = require('../../../common/utils/apiResponse');
const { body } = require('express-validator');
const { Package, PackageDetails } = require('../../../models');


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
