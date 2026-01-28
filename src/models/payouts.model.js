const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payouts = sequelize.define(
    'Payouts',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tblevent',
                key: 'id'
            },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
        },

        paid_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },

        txn_ref: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        created_by: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'payouts',
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
);

module.exports = Payouts;
