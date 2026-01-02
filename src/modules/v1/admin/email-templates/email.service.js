const { Op, Sequelize } = require('sequelize');
const { Templates } = require('../../../../models');


// Get event List..
module.exports.getTemplatesList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const events = await Templates.findAll({
            attributes:['title','subject','description','createdAt','id'],
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Templates fetched successfully.',
            data: events
        };
    } catch (error) {
        console.error('Error fetching Templates:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching Templates.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// Create Templates  page
module.exports.createTemplatesPage = async (req) => {
    try {
        const {description,title,subject } = req.body;
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
        if (!subject?.trim() ||  !description || !title?.trim() ) {
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
      description
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
            attributes:['title','subject','description']
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


