const { ContactUs } = require('../../../../models');



module.exports.contactUsList = async (req, res) => {
    try {
        const contactUs = await ContactUs.findAll({
            attributes:['name','email','event','subject','createdAt','description'],
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Contact Us list fetched successfully',
            data: contactUs
        };

    } catch (error) {
        console.error('Error fetching company list:', error);
        return {
            success: false,
            message: 'Internal server error: ' + error.message,
            code: 'INTERNAL_ERROR'
        };
    }

}