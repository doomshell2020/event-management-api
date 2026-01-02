const { ContactUs } = require('../../../../models');




// Create Contact Us (from front-end)
module.exports.createContactUs = async (req) => {
    try {
        const { name, email, event, subject, description } = req.body;
        // 🛑 Validation
        if (
            !name?.trim() ||
            !email?.trim() ||
            !event?.trim() ||
            !subject?.trim() ||
            !description?.trim()
        ) {
            return {
                success: false,
                message: 'All fields (name, email, event, subject, description) are required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 📦 Prepare data
        const contactUsData = {
            name: name.trim(),
            email: email.trim(),
            event: event.trim(),
            subject: subject.trim(),
            description: description.trim(),
        };

        // 💾 Save to DB
        const newContact = await ContactUs.create(contactUsData);

        if (!newContact) {
            return {
                success: false,
                message: 'Contact request creation failed.',
                code: 'CREATION_FAILED'
            };
        }

        // ✅ Success response
        return {
            success: true,
            message: 'Contact request submitted successfully.',
            data: {
                id: newContact.id,
                name: newContact.name,
                email: newContact.email,
                event: newContact.event,
                subject: newContact.subject,
                description: newContact.description
            }
        };

    } catch (error) {
        console.error('Error creating contact request:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'INTERNAL_ERROR'
        };
    }
};





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