const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketType = sequelize.define(
    'TicketType',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        eventid: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        userid: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ticket_image: {
            type: DataTypes.STRING,
            allowNull: true
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        count: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('open_sales', 'committee_sales', 'comps'),
            allowNull: false
        },
        hidden: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'Y'
        },
        sold_out: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            defaultValue: 'N'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
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
        tableName: 'event_ticket_types',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'createdAt',    // map createdAt → created
        updatedAt: 'updatedAt',   // map updatedAt → updatedAt
    });

module.exports = TicketType;

