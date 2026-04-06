const apiResponse = require('../../../common/utils/apiResponse');
const {Static } = require('../../../models');


exports.getStaticPage = async (req, res) => {
    try {
        const { url } = req.params;
        const data = await Static.findOne({
            where: { url }
        });

        if (!data) {
            return apiResponse.notFound(res, "Page not found");
        }

        return apiResponse.success(res, "Page fetched successfully", data);

    } catch (error) {
        console.error("GetStaticPage Error:", error);
        return apiResponse.error(res, "Failed to fetch page", 500);
    }
};


