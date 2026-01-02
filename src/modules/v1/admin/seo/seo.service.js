const { Op, Sequelize } = require('sequelize');
const { Seo } = require('../../../../models');


// Get event List..
module.exports.getSeoList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const events = await Seo.findAll({
            attributes:['page','keyword','description','title','location','status','id'],
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Seo fetched successfully.',
            data: events
        };
    } catch (error) {
        console.error('Error fetching seo:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching seo.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// Create seo  page
module.exports.createSeoPage = async (req) => {
    try {
        const {page,keyword,description,title,location } = req.body;
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
        if (!page?.trim() || !keyword?.trim() || !description || !location || !title?.trim() ) {
            return {
                success: false,
                message: 'Title and description are required.',
                code: 'VALIDATION_FAILED'
            };
        }
        // 📦 Prepare data
        const staticPageData = {
            page: page.trim(),
            keyword: keyword.trim(),
            description: description.trim(),
            location: location.trim(),
            title: title.trim(),
            orgid:1
        };

        // 💾 Save to DB
        const newPage = await Seo.create(staticPageData);
        if (!newPage) {
            return {
                success: false,
                message: 'Seo page creation failed.',
                code: 'CREATION_FAILED'
            };
        }
        // ✅ Success response
        return {
            success: true,
            message: 'Seo page created successfully.',
            data: {
                id: newPage.id,
                title: newPage.title,
            }
        };
    } catch (error) {
        console.error('Error creating seo page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'INTERNAL_ERROR'
        };
    }
};


// update seo page

module.exports.updateSeoPage = async (pageId, data) => {
  try {
    const {
      page,
      title,
      location,
      keyword,
      description
    } = data;
    // 🔍 Find SEO Page
    const existingPage = await Seo.findOne({
      where: { id: pageId },
    });

    if (!existingPage) {
      return {
        success: false,
        message: "SEO page not found.",
        code: "PAGE_NOT_FOUND",
      };
    }

    // ✏️ Update only provided fields
    if (page !== undefined)
      existingPage.page = page.trim();

    if (title !== undefined)
      existingPage.title = title.trim();

    if (location !== undefined)
      existingPage.location = location.trim();

    if (keyword !== undefined)
      existingPage.keyword = keyword.trim();

    if (description !== undefined)
      existingPage.description = description.trim();

    await existingPage.save();

    // ✅ Success response
    return {
      success: true,
      message: "SEO page updated successfully.",
      data: {
        id: existingPage.id,
        page_name: existingPage.page_name,
        title: existingPage.title,
        location: existingPage.location,
        keywords: existingPage.keywords,
        description: existingPage.description,
      },
    };
  } catch (error) {
    console.error("❌ Error updating SEO page:", error);
    return {
      success: false,
      message: "Internal server error.",
      code: "DB_ERROR",
    };
  }
};

//View Seo Page by ID - service
module.exports.getSeoPageById = async (pageId) => {
    try {
        if (!pageId) {
            return {
                success: false,
                message: 'Seo page ID is required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 🔍 Fetch Seo page
        const pageData = await Seo.findOne({
            where: { id: pageId },
            attributes:['page','keyword','description','title','location']
        });

        if (!pageData) {
            return {
                success: false,
                message: 'Seo page not found.',
                code: 'PAGE_NOT_FOUND'
            };
        }

        return {
            success: true,
            message: 'Seo page fetched successfully.',
            data: pageData
        };

    } catch (error) {
        console.error('❌ Error fetching Seo page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};


// Status update Api..
module.exports.updateStatusSeo = async (req) => {
    try {
        const seoId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingSeo = await Seo.findByPk(seoId);
        if (!existingSeo) {
            return {
                success: false,
                message: 'Seo  not found',
                code: 'SEO_NOT_FOUND'
            };
        }
        // Update ONLY status
        await existingSeo.update({ status });
        return {
            success: true,
            message: 'Seo Status updated successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};

