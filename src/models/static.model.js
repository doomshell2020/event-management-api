const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Static = sequelize.define(
    'Static',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true
        },
        url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        descr: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    },
    {
        tableName: 'tblstatic',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = Static;

