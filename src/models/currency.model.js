const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Currency = sequelize.define(
    'Currency',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        Currency_symbol: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        Currency: {
            type: DataTypes.STRING,
            allowNull: false
        },
        conversion_rate: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
    },
    {
        tableName: 'tblcurrency',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = Currency;

