const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItems = sequelize.define(
    'OrderItems',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        type: {
            type: DataTypes.ENUM(
                "ticket",
                "addon",
                "package",
                "appointment",
                "committesale",
                "opensale",
                "ticket_price"
            ),
            allowNull: false
        },

        ticket_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        addon_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        ticket_pricing_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        slot_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        appointment_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        count: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },

        price: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },

        qr_data: {
            type: DataTypes.TEXT("long"),   // Store full JSON
            allowNull: true
        },

        secure_hash: {
            type: DataTypes.STRING,
            allowNull: true
        },

        qr_image: {
            type: DataTypes.STRING,
            allowNull: true
        },

        cancel_status: {
            type: DataTypes.STRING,
            allowNull: true
        },

        cancel_date: {
            type: DataTypes.DATE,
            allowNull: true
        },


        status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'Y',
        },
    },
    {
        tableName: 'tbl_order_items',
        timestamps: true
    }
);

module.exports = OrderItems;
