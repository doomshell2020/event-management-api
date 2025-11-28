const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cart = sequelize.define(
    'Cart',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        addons_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ticket_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        appointment_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        no_tickets: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },

        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        ticket_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'ticket | addon | package | appointment | committesale | opensale | ticket_price',
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'Y',
        },

        created: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        commitee_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        serial_no: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        checkout_data: {
            type: DataTypes.JSON,
            allowNull: true,
        },

        // ⭐ NEW FIELD ADDED FOR SLOT+PRICE MAPPING
        ticket_price_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
    },
    {
        tableName: 'tblcart',
        timestamps: true, // createdAt, updatedAt
    }
);

module.exports = Cart;
