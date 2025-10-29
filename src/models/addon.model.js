const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AddonTypes = sequelize.define(
    'AddonTypes',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        addon_image: {
            type: DataTypes.STRING,
            allowNull: true
        },
        count: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        hidden: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    },
    {
        tableName: 'tbladdons',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = AddonTypes;

