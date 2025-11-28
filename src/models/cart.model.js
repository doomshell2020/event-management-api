const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cart = sequelize.define(
    'Cart',
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
            allowNull: true
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
            allowNull: true
        },
        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ticket_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        }
    },
    {
        tableName: 'tblcart',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = Cart;

