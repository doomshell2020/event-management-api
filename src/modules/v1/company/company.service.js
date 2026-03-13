const { Company ,Event} = require('../../../models');

module.exports.companyDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Validation
        if (!id) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_FAILED",
                message: "Company ID is required",
            });
        }

        // Fetch company
        const company = await Company.findOne({
            where: { id },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                code: "NOT_FOUND",
                message: "Company not found",
            });
        }

        // Success response
        return res.status(200).json({
            success: true,
            message: "Company details fetched successfully",
            data: company,
        });
    } catch (error) {
        console.error("Company detail error:", error);

        return res.status(500).json({
            success: false,
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        });
    }
};

module.exports.companyList = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            return {
                success: false,
                message: 'User not authenticated',
                code: 'VALIDATION_FAILED'
            };
        }

        const companies = await Company.findAll({
            where: { user_id: user_id },
            order: [['id', 'DESC']]
        });

        return {
            success: true,
            message: 'Company list fetched successfully',
            companies: companies
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


module.exports.updateCompany = async (id, name) => {
    try {
        // Find company
        const existingCompany = await Company.findByPk(id);

        if (!existingCompany) {
            return {
                success: false,
                code: 'NOT_FOUND',
                message: 'Company not found',
            };
        }
        // Update ONLY name
        await existingCompany.update(name);

        return {
            success: true,
            message: 'Company name updated successfully',
            data: existingCompany,
        };
    } catch (error) {
        console.error('updateCompanyName service error:', error);

        return {
            success: false,
            code: 'DB_ERROR',
            message: error.message,
        };
    }
};



module.exports.deleteCompany = async (companyId) => {
    try {
        if (!companyId) {
            return {
                success: false,
                code: "VALIDATION_FAILED",
                message: "Company ID is required",
            };
        }

        // Find company
        const company = await Company.findByPk(companyId);

        if (!company) {
            return {
                success: false,
                code: "NOT_FOUND",
                message: "Company not found",
            };
        }

        // Check if company used in Event
        const eventExists = await Event.findOne({
            where: { company_id: companyId }
        });

        if (eventExists) {
            return {
                success: false,
                code: "COMPANY_IN_USE",
                message: "Company is assigned to an event and cannot be deleted",
            };
        }

        // Delete company
        await company.destroy();

        return {
            success: true,
            message: "Company deleted successfully",
            data: { id: companyId },
        };

    } catch (error) {
        console.error("deleteCompany service error:", error);

        return {
            success: false,
            code: "DB_ERROR",
            message: "Error occurred while deleting company",
        };
    }
};
