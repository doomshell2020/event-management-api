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

        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        committee_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        type: {
            type: DataTypes.ENUM(
                "ticket",
                "addon",
                "package",
                "appointment",
                "committesale",
                "opensale",
                "ticket_price",
                "comps"
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

        // cancel ticket and send cancel ticket request...
        cancel_request_status: {
            type: DataTypes.ENUM(
                "pending",
                "approved",
                "rejected"),
            allowNull: true
        },

        cancel_request_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancel_request_reject_reason: {
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

        refund_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },

        refund_id: {
            type: DataTypes.STRING,
            allowNull: true
        },


        refund_date: {
            type: DataTypes.DATE,
            allowNull: true
        },

        is_refunded: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        refund_status: {
            type: DataTypes.ENUM(
                "pending",
                "success",
                "failed"),
            allowNull: true
        },


        status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'Y',
        },

        // new keys added..
        used_by: {
            type: DataTypes.STRING,
            allowNull: true
        },
        scanner_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        scanned_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        is_scanned: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N',
        },

    },
    {
        tableName: 'tbl_order_items',
        timestamps: true
    }
);

module.exports = OrderItems;
