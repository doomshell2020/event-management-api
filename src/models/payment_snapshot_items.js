const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentSnapshotItems = sequelize.define(
    'PaymentSnapshotItems',
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

        ticket_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        
        cart_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        item_type: {
            type: DataTypes.STRING, // 'ticket' or 'appointment'
            allowNull: false
        },

        quantity: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },

        price: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },

        payment_intent_id: {
            type: DataTypes.STRING,
            allowNull: true
        },

        payment_status: {
            type: DataTypes.ENUM('pending', 'paid', 'failed'),
            defaultValue: 'pending'
        },

        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        },

        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },

        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'payment_snapshot_items',
        timestamps: true,
    }
);

module.exports = PaymentSnapshotItems;
