const apiResponse = require('../../../common/utils/apiResponse');
const {requestDemo } = require('../../../models');


exports.addDemoRequest = async (req, res) => {
    try {

        const {
            name,
            email,
            mobile,
            country_code,
            description,
            date,
            time
        } = req.body;

        const demoRequest = await requestDemo.create({
            name,
            email,
            mobile,
            country_code,
            description,
            date,
            time
        });

        return apiResponse.success(
            res,
            "Demo request submitted successfully",
            demoRequest
        );

    } catch (error) {

        console.error("AddDemoRequest Error:", error);
        return apiResponse.error(res, "Failed to submit demo request", 500);

    }
};


