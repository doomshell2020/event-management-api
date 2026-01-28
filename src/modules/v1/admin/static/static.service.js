const { Op, Sequelize } = require('sequelize');
const { Static } = require('../../../../models');




// Get event List..
module.exports.getStaticList = async (req, res) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) {
            return {
                success: false,
                message: 'Unauthorized access. Admin authentication required.',
                code: 'UNAUTHORIZED'
            };
        }
        const events = await Static.findAll({
            order: [['id', 'DESC']]
        });
        return {
            success: true,
            message: 'Static pages fetched successfully.',
            data: events
        };
    } catch (error) {
        console.error('Error fetching event:', error);
        return {
            success: false,
            message: 'An unexpected error occurred while fetching static.',
            code: 'INTERNAL_SERVER_ERROR'
        };
    }
};


// Create static page
module.exports.createStaticPage = async (req) => {
    try {
        const { title, descr,url } = req.body;
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
        if (!title?.trim() || !descr?.trim()|| !url?.trim()) {
            return {
                success: false,
                message: 'Title and description are required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 📦 Prepare data
        const staticPageData = {
            title: title.trim(),
            descr: descr.trim(),
            url: url.trim(),
        };

        // 💾 Save to DB
        const newPage = await Static.create(staticPageData);
        if (!newPage) {
            return {
                success: false,
                message: 'Static page creation failed.',
                code: 'CREATION_FAILED'
            };
        }
        // ✅ Success response
        return {
            success: true,
            message: 'Static page created successfully.',
            data: {
                id: newPage.id,
                title: newPage.title,
                descr: newPage.descr,
                url: newPage.url,
            }
        };

    } catch (error) {
        console.error('Error creating static page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'INTERNAL_ERROR'
        };
    }
};


// update static page
module.exports.updateStaticPage = async (pageId, data) => {
    try {
        const { title, descr,url } = data;
        // 🔍 Find Static Page
        const existingPage = await Static.findOne({
            where: { id: pageId }
        });
        if (!existingPage) {
            return {
                success: false,
                message: 'Static page not found.',
                code: 'PAGE_NOT_FOUND'
            };
        }

        // 🛑 Optional: Prevent duplicate title
        if (title?.trim()) {
            const duplicatePage = await Static.findOne({
                where: {
                    title: title.trim(),
                    id: { [Op.ne]: pageId }
                }
            });

            if (duplicatePage) {
                return {
                    success: false,
                    message: 'Another static page already exists with the same title.',
                    code: 'DUPLICATE_TITLE'
                };
            }
        }

        // ✏️ Update only provided fields
        if (title !== undefined) existingPage.title = title.trim();
        if (descr !== undefined) existingPage.descr = descr.trim();
        if (url !== undefined) existingPage.url = url.trim();
        await existingPage.save();
        // ✅ Success response
        return {
            success: true,
            message: 'Static page updated successfully.',
            data: {
                id: existingPage.id,
                title: existingPage.title,
                descr: existingPage.descr
            }
        };

    } catch (error) {
        console.error('❌ Error updating static page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};


// delete static page service
module.exports.deleteStaticPage = async (pageId) => {
    try {
        if (!pageId) {
            return {
                success: false,
                message: 'Static Page ID is required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 🔍 Find static page
        const staticPage = await Static.findByPk(pageId);

        if (!staticPage) {
            return {
                success: false,
                message: 'Static page not found.',
                code: 'PAGE_NOT_FOUND'
            };
        }

        // 🗑 Delete static page
        await staticPage.destroy();

        return {
            success: true,
            message: 'Static page deleted successfully.'
        };

    } catch (error) {
        console.error('❌ Error deleting static page:', error);
        return {
            success: false,
            message: 'Failed to delete static page.',
            code: 'DB_ERROR'
        };
    }
};


// View Static Page by ID - service
module.exports.getStaticPageById = async (pageId) => {
    try {
        if (!pageId) {
            return {
                success: false,
                message: 'Static page ID is required.',
                code: 'VALIDATION_FAILED'
            };
        }

        // 🔍 Fetch static page
        const pageData = await Static.findOne({
            where: { id: pageId },
            attributes:['title','descr','url']
        });

        if (!pageData) {
            return {
                success: false,
                message: 'Static page not found.',
                code: 'PAGE_NOT_FOUND'
            };
        }

        return {
            success: true,
            message: 'Static page fetched successfully.',
            data: pageData
        };

    } catch (error) {
        console.error('❌ Error fetching static page:', error);
        return {
            success: false,
            message: 'Internal server error.',
            code: 'DB_ERROR'
        };
    }
};


// Status update Api..
module.exports.updateStatusStatic = async (req) => {
    try {
        const staticId = req.params.id;
        const { status } = req.body;
        // Find record
        const existingPage = await Static.findByPk(staticId);
        if (!existingPage) {
            return {
                success: false,
                message: 'Seo  not found',
                code: 'SEO_NOT_FOUND'
            };
        }
        // Update ONLY status
        await existingPage.update({ status });
        return {
            success: true,
            message: 'Static page updated successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: 'DB_ERROR'
        };
    }
};



// Searching Static Pages
module.exports.searchStatic = async (req) => {
    try {
        const { title, status } = req.query;

        const whereCondition = {};

        // 🔹 Title filter (partial match)
        if (title) {
            whereCondition.title = {
                [Op.like]: `%${title}%`
            };
        }

        // 🔹 Status filter (exact match: Y / N)
        if (status) {
            whereCondition.status = status;
        }

        const statics = await Static.findAll({
            where: whereCondition,
            order: [['id', 'DESC']],
        });

        return {
            success: true,
            message: "Static pages fetched successfully.",
            data: statics
        };

    } catch (error) {
        console.error("Error searching static pages:", error);
        return {
            success: false,
            message: "An unexpected error occurred while searching static pages.",
            code: "INTERNAL_SERVER_ERROR"
        };
    }
};
