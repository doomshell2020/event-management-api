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

        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },

        card_holder_name: {
            type: DataTypes.STRING,
            allowNull: true
        },

        card_number: {
            type: DataTypes.STRING,
            allowNull: true
        },

        month_year: {
            type: DataTypes.STRING,
            allowNull: true
        },

        paymenttype: {
            type: DataTypes.ENUM('Online', 'Cash'),
            allowNull: true,
            defaultValue: 'Online'
        },

        RRN: {
            type: DataTypes.STRING,
            allowNull: true
        },

        IsoResponseCode: {
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
