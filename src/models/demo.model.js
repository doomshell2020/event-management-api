const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const requestDemo = sequelize.define(
    'requestDemo',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: true
        },
        country_code: {
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        time: {
            type: DataTypes.TIME,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
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
        tableName: 'demo_requests',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = requestDemo;

