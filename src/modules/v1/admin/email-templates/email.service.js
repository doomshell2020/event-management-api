const { Op, Sequelize, Model } = require('sequelize');
const { Templates, Event } = require('../../../../models');
const sendEmail = require('../../../../common/utils/sendEmail');


// Get event List..
module.exports.getTemplatesList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: "Unauthorized access. Admin authentication required.",
                code: "UNAUTHORIZED",
            };
        }

        const templates = await Templates.findAll({
            attributes: [
                "id",
                "title",
                "subject",
                "description",
                "status",
                "eventId",
                "createdAt",
            ],
            include: [
                {
                    model: Event,
                    as: "events",
                    attributes: ["id", "name"],
                    required: false, // 👈 important (LEFT JOIN)
                },
            ],
            order: [["id", "DESC"]],
            raw: true,
            nest: true,
        });

        // ✅ Map eventId = 0 → General Template
        const formattedTemplates = templates.map((tpl) => {
            if (tpl.eventId === 0) {
                return {
                    ...tpl,
                    events: {
                        id: 0,
                        name: "General Template",
                    },
                };
            }
            return tpl;
        });

        return {
            success: true,
            message: "Templates fetched successfully.",
            data: formattedTemplates,
        };
    } catch (error) {
        console.error("Error fetching Templates:", error);
        return {
            success: false,
            message: "An unexpected error occurred while fetching Templates.",
            code: "INTERNAL_SERVER_ERROR",
        };
    }
};



// module.exports.getTemplatesList = async (req, res) => {
//     try {
//         const adminId = req.user?.id;
//         if (!adminId) {
//             return {
//                 success: false,
//                 message: 'Unauthorized access. Admin authentication required.',
//                 code: 'UNAUTHORIZED'
//             };
//         }
//         const events = await Templates.findAll({
//             attributes:['title','subject','description','createdAt','id','status'],
//             include:{model:Event,as:"events",attributes:['id','name']},
//             order: [['id', 'DESC']]
//         });
//         return {
//             success: true,
//             message: 'Templates fetched successfully.',
//             data: events
//         };
//     } catch (error) {
//         console.error('Error fetching Templates:', error);
//         return {
//             success: false,
//             message: 'An unexpected error occurred while fetching Templates.',
//             code: 'INTERNAL_SERVER_ERROR'
//         };
//     }
// };


// Create Templates  page
module.exports.createTemplatesPage = async (req) => {
    try {
        const { description, title, subject,eventId } = req.body;
        const adminId = req.user?.id;
        // 🔐 Auth check
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }

        // 🛑 Validation
        if (!subject?.trim() || !description || !title?.trim()) {
            return {
                success: false,
                message: 'Title and description are required.',
                code: 'VALIDATION_FAILED'
            };
        }
        // 📦 Prepare data
        const TemplatesData = {
            description: description.trim(),
            subject: subject.trim(),
            title: title.trim(),
            eventId:eventId

        };

        // 💾 Save to DB
        const newPage = await Templates.create(TemplatesData);
        if (!newPage) {
            return {
                success: false,
                message: 'Templates page creation failed.',
                code: 'CREATION_FAILED'
            };
        }
        // ✅ Success response
        return {
            success: true,
            message: 'Templates page created successfully.',
            data: {
                id: newPage.id,
                title: newPage.title,
            }
        };
    } catch (error) {
        console.error('Error creating Templates page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'INTERNAL_ERROR'
        };
    }
};


// update Templates page
module.exports.updateTemplatesPage = async (pageId, data) => {
    try {
        const {
            subject,
            title,
            description,
            eventId
        } = data;
        // 🔍 Find Templates Page
        const existingPage = await Templates.findOne({
            where: { id: pageId },
        });

        if (!existingPage) {
            return {
                success: false,
                message: "Templates page not found.",
                code: "PAGE_NOT_FOUND",
            };
        }

        // ✏️ Update only provided fields
        if (title !== undefined)
            existingPage.title = title.trim();
        if (subject !== undefined)
            existingPage.subject = subject.trim();

        if (description !== undefined)
            existingPage.description = description.trim();
        if (eventId !== undefined)
            existingPage.eventId = eventId;

        await existingPage.save();

        // ✅ Success response
        return {
            success: true,
            message: "Templates page updated successfully.",
            data: {
                id: existingPage.id,
                title: existingPage.title,
                subject: existingPage.subject,
                description: existingPage.description,
            },
        };
    } catch (error) {
        console.error("❌ Error updating Templates page:", error);
        return {
            success: false,
            message: "Internal server error.",
            code: "DB_ERROR",
        };
    }
};

//View Seo Page by ID - service
module.exports.getTemplatesPageById = async (pageId) => {
    try {
        if (!pageId) {
            return {
                success: false,
                message: 'Templates page ID is required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 🔍 Fetch Templates page
        const pageData = await Templates.findOne({
            where: { id: pageId },
            attributes: ['title', 'subject', 'description','eventId']
        });

        if (!pageData) {
            return {
                success: false,
                message: 'Templates page not found.',
                code: 'PAGE_NOT_FOUND'
            };
        }

        return {
            success: true,
            message: 'Templates page fetched successfully.',
            data: pageData
        };

    } catch (error) {
        console.error('❌ Error fetching Templates page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};



// Status update Api..
module.exports.updateStatusTemplates = async (req) => {
    try {
        const templateId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingTemplate = await Templates.findByPk(templateId);
        if (!existingTemplate) {
            return {
                success: false,
                message: 'Seo  not found',
                code: 'SEO_NOT_FOUND'
            };
        }
        // Update ONLY status
        await existingTemplate.update({ status });
        return {
            success: true,
            message: 'Template updated successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};


// event list
module.exports.getEventList = async (req, res) => {
    try {
        const events = await Event.findAll({
            where: { status: "Y" },
            attributes: ["id", "name"],
            order: [["id", "DESC"]],
            raw: true, // 👈 important for plain objects
        });

        // ✅ Add static event at top
        const staticEvent = {
            id: 0,
            name: "General Template",
        };

        events.unshift(staticEvent);

        return {
            success: true,
            message: "Events fetched successfully.",
            data: events,
        };
    } catch (error) {
        console.error("Error fetching events:", error);
        return {
            success: false,
            message: "An unexpected error occurred while fetching events.",
            code: "INTERNAL_SERVER_ERROR",
        };
    }
};




// Searching Template Pages
module.exports.searchTemplate = async (req) => {
    try {
        const { title, eventId } = req.query;

        const whereCondition = {};

        // 🔹 Title filter (partial match)
        if (title) {
            whereCondition.title = {
                [Op.like]: `%${title}%`
            };
        }
        // 🔹 Status filter (exact match: Y / N)
        if (eventId) {
            whereCondition.eventId = eventId;
        }
        const statics = await Templates.findAll({
            where: whereCondition,
            order: [['id', 'DESC']],
        });

        return {
            success: true,
            message: "Email templates fetched successfully.",
            data: statics
        };

    } catch (error) {
        console.error("Error searching Email templates:", error);
        return {
            success: false,
            message: "An unexpected error occurred while searching static pages.",
            code: "INTERNAL_SERVER_ERROR"
        };
    }
};



module.exports.sendTestEmail = async (templateId, email) => {
    // 🔹 Get template
    const template = await Templates.findOne({
        where: { id: templateId },
        attributes: ["subject", "description"],
    });

    if (!template) {
        throw new Error("Email template not found");
    }

    const subject = template.subject;
    const htmlContent = template.description;

    // 🔹 Send test email (FIXED)
    await sendEmail(
        email,
        `[TEST] ${subject}`,
        htmlContent
    );

    return {
        email,
        templateId,
    };
};
