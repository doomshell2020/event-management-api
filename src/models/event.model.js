const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Event = sequelize.define('Event',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        event_org_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        desp: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        date_from: {
            type: DataTypes.DATE,
            allowNull: false
        },
        date_to: {
            type: DataTypes.DATE,
            allowNull: false
        },
        sale_start: {
            type: DataTypes.DATE,
            allowNull: true
        },
        sale_end: {
            type: DataTypes.DATE,
            allowNull: true
        },
        request_rsvp: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        feat_image: {
            type: DataTypes.STRING,
            allowNull: true
        },
        video_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        thumbnail: {
            type: DataTypes.STRING,
            allowNull: true
        },
        no_of_seats: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lat: {
            type: DataTypes.STRING,
            allowNull: true
        },
        longs: {
            type: DataTypes.STRING,
            allowNull: true
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ticket_limit: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        approve_timer: {
            type: DataTypes.STRING,
            allowNull: true
        },
        fee_assign: {
            type: DataTypes.STRING,
            allowNull: true
        },
        committee_memmberId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        payment_currency: {
            type: DataTypes.STRING,
            allowNull: true
        },
        banner_image: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: true,
            defaultValue: 'N'
        },
        entry_type: {
            type: DataTypes.ENUM('single', 'recurring', 'timed_entry'),
            allowNull: true,
            defaultValue: 'single'
        },
        featured: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        agreement: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        hidden_homepage: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        hidden_company: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        committee_payment: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        online_payments: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        admineventstatus: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        is_free: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'N'
        },
        allow_register: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'Y'
        },
        submit_count: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        event_timezone: {
            type: DataTypes.STRING,
            allowNull: true
        },
    },
    {
        tableName: 'tblevent',
        timestamps: true,       // ✅ Enable automatic management
        createdAt: 'created',    // map createdAt → created
        updatedAt: 'updateAt',   // map updatedAt → updateAt
    });

module.exports = Event;

