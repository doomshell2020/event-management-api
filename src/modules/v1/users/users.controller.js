const apiResponse = require('../../../common/utils/apiResponse');
const { User } = require('../../../models');
const { Op, Sequelize } = require('sequelize');

exports.searchUsers = async (req, res) => {
    try {
        let { q } = req.query;

        // Prevent unnecessary DB hits
        if (!q || q.trim().length < 2) {
            return apiResponse.success(res, "Type at least 2 characters", []);
        }

        q = q.trim();

        /* 🔥 SINGLE QUERY – MULTI FIELD SEARCH */
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { first_name: { [Op.like]: `%${q}%` } },
                    { last_name: { [Op.like]: `%${q}%` } },
                    {
                        // full name search: first_name + last_name
                        [Op.and]: Sequelize.where(
                            Sequelize.fn(
                                'concat',
                                Sequelize.col('first_name'),
                                ' ',
                                Sequelize.col('last_name')
                            ),
                            { [Op.like]: `%${q}%` }
                        )
                    },
                    { email: { [Op.like]: `%${q}%` } },
                    { mobile: { [Op.like]: `%${q}%` } }
                ]
            },
            attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
                'mobile'
            ],
            limit: 10,
            order: [['id', 'DESC']]
        });

        return apiResponse.success(res, "Users fetched successfully", users);

    } catch (error) {
        console.error(error);
        return apiResponse.error(res, "Failed to search users", 500);
    }
};
