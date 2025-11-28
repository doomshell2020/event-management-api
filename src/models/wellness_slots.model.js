const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const wellnessSlots = sequelize.define(
    'wellnessSlots',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        wellness_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        slot_start_time: {
            type: DataTypes.TIME,
            allowNull: true
        },
        slot_end_time: {
            type: DataTypes.TIME,
            allowNull: true
        },
        price: {
            type: DataTypes.STRING,
            allowNull: true
        },
        slot_location: {
            type: DataTypes.STRING,
            allowNull: true
        },
         count: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        },
        hidden: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
        // createdAt: {
        //     type: DataTypes.DATE,
        //     allowNull: false
        // },
        // updatedAt: {
        //     type: DataTypes.DATE,
        //     allowNull: false
        // }
    },
    {
        tableName: 'wellness_slots',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = wellnessSlots;

