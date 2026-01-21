const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Orders = sequelize.define(
    'Orders',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        order_uid: {
            type: DataTypes.STRING,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        sub_total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        tax_total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        discount_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        grand_total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        paymenttype: {
            type: DataTypes.ENUM('Online', 'Cash'),
            allowNull: true,
            defaultValue: 'Online'
        },
        discount_code: {
            type: DataTypes.STRING,
            allowNull: true
        },
        discount_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        discount_value: {
            type: DataTypes.STRING,
            allowNull: true
        },     
        RRN: {
            type: DataTypes.STRING,
            allowNull: true
        },
        OrderIdentifier: {
            type: DataTypes.STRING,
            allowNull: true
        },
        OriginalTrxnIdentifier: {
            type: DataTypes.STRING,
            allowNull: true
        },
        TransactionIdentifier: {
            type: DataTypes.STRING,
            allowNull: true
        },
        TransactionType: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Approved: {
            type: DataTypes.STRING,
            allowNull: true
        },
        adminfee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        paymentgateway: {
            type: DataTypes.STRING,
            allowNull: true
        },
        created: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N',
        },
    },
    {
        tableName: 'tblorders',
        timestamps: true, // will use createdAt / updatedAt
    }
);

module.exports = Orders;
