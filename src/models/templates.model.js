const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Templates = sequelize.define(
    'Templates',
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
        eventId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        fromemail: {
            type: DataTypes.STRING,
            allowNull: true
        },
        fromname: {
            type: DataTypes.STRING,
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
        tableName: 'templates',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = Templates;

