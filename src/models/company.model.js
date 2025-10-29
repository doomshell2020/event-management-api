const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define(
    'Company',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER, allowNull: false
        },
    },
    {
        tableName: 'tblcompany',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'created',    // map createdAt → created
    }
);

module.exports = Company;
