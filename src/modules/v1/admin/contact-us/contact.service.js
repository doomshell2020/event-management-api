const { replaceTemplateVariables } = require('../../../../common/utils/helpers');
const sendEmail = require('../../../../common/utils/sendEmail');
const config = require('../../../../config/app');
const { ContactUs, Templates } = require('../../../../models');
const validator = require('email-validator'); // npm install email-validator
const { Op } = require('sequelize');

// Create Contact Us (from front-end)
module.exports.createContactUs = async (req) => {
    try {
        const { name, email, event, subject, description } = req.body;

        // 🛑 Validation: all fields required
        if (!name?.trim() || !email?.trim() || !event?.trim() || !subject?.trim() || !description?.trim()) {
            return {
                success: false,
                message: 'All fields (name, email, event, subject, description) are required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 🛑 Validate real email
        if (!validator.validate(email.trim())) {
            return {
                success: false,
                message: 'Please enter a valid email address.',
                code: 'INVALID_EMAIL'
            };
        }


        // 🛑 Check for existing submission today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const existingContact = await ContactUs.findOne({
            where: {
                email: email.trim(),
                createdAt: {
                    [Op.gte]: todayStart,
                    [Op.lte]: todayEnd
                }
            }
        });

        if (existingContact) {
            return {
                success: false,
                message: 'You have already submitted a contact request today. Please try again tomorrow.',
                code: 'DUPLICATE_SUBMISSION'
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

        // ===== EMAIL TEMPLATE FETCH =====
        const templateId = config.emailTemplates.contactUs;

        const templateRecord = await Templates.findOne({
            where: { id: templateId }
        });

        if (!templateRecord) {
            throw new Error('Contact email template not found');
        }

        const { description: emailTemplateDescription } = templateRecord;

        const html = replaceTemplateVariables(emailTemplateDescription, {
            SITE_URL: config.clientUrl,
            Name: newContact.name,
            Email: newContact.email,
            Event: newContact.event,
            Subject: newContact.subject,
            Description: newContact.description
        });

        await sendEmail(
            newContact.email,
            `Your Contact Request for ${newContact.subject} is Received!`,
            html
        );

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
            attributes: ['name', 'email', 'event', 'subject', 'createdAt', 'description'],
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