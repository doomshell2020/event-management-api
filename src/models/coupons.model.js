const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupons = sequelize.define(
    'Coupons',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        event: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        discount_type: {
            type: DataTypes.ENUM("percentage", "fixed_amount"),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true, // Ensuring coupon code is unique
        },
        discount_value: {
            type: DataTypes.DECIMAL(12, 5),
            allowNull: false,
        },
        max_redeems: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        applicable_for: {
            type: DataTypes.ENUM("all", "ticket", "addon","appointment",'committesale','package','ticket_price'),
            allowNull: true,
        },
        validity_period: {
            type: DataTypes.ENUM("specific_date", "specified_date"),
            allowNull: false,
        },
        specific_date_from: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        specific_date_to: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("Y", "N"),
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: 'coupons',
        timestamps: true,
    }
);

module.exports = Coupons;
