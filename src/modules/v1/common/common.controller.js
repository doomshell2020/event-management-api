// controllers/common.controller.js
// const Country = require('../../../models/Country.model');
const { Countries } = require('../../../models');
const apiResponse = require('../../../common/utils/apiResponse');

module.exports.getList = async (req, res) => {
    try {
        const { key } = req.query; // e.g., ?key=country or ?key=state
        if (!key) {
            return apiResponse.validation(res, [], 'Key is required');
        }
        let data;
        switch (key.toLowerCase()) {
            case 'country':
                data = await Countries.findAll({ attributes: ['id', 'CountryName','TwoCharCountryCode','words','ThreeCharCountryCode'] });
                break;
            default:
                return apiResponse.validation(res, [], 'Invalid key provided');
        }

        return apiResponse.success(res, `${key} list fetched successfully`, { data });

    } catch (error) {
        console.error('Error in getList:', error);
        return apiResponse.error(res, 'Something went wrong', 500);
    }
};
