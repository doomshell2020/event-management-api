const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define(
    'Payment',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        name: {
            type: DataTypes.STRING,
            allowNull: true
        },

        email: {
            type: DataTypes.STRING,
            allowNull: true
        },

        amount: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        total_taxes: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        total_cart_amount: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        total_appointment_amount: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        total_appointment_tax: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        ticket_bank_fee: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        ticket_platform_fee: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        ticket_processing_fee: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        ticket_stripe_fee: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        admin_fee: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        coupon_code: {
            type: DataTypes.STRING,
            allowNull: true
        },

        discount_type: {
            type: DataTypes.STRING,   // percentage / fixed
            allowNull: true
        },

        discount_value: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        discount_amount: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        order_items: {
            type: DataTypes.JSON, // For multiple tickets or appointments
            allowNull: true
        },

        payment_option: {
            type: DataTypes.STRING, // card / bank / stripe / paypal etc
            allowNull: true
        },

        client_secret: {
            type: DataTypes.STRING,
            allowNull: true
        },

        payment_intent: {
            type: DataTypes.STRING,
            allowNull: true
        },

        payment_status: {
            type: DataTypes.STRING, // succeeded / failed / pending
            allowNull: true
        },

        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        },
    },
    {
        tableName: 'payment',
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    }
);

module.exports = Payment;