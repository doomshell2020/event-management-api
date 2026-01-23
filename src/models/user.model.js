const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    confirm_pass: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    profile_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    zip_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    paid_date: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    mob_verify_code: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    is_mob_verify: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    is_suspend: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    status: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    is_email_verified: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      defaultValue: 'Other',
    },
    activation_code: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    service: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    fkey: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    imei: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    created: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fburl: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    instaurl: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    Twitterurl: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    otpcode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    linkdinurl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    googleplusurl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    googleplaystore: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    applestore: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mobileverifynumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    feeassignment: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    emailRelatedEvents: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    emailNewsLetter: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    admineventstatus: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    forFreeEvent: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    forPaidEvent: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    resendverifcationemail: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'organizer'),
      defaultValue: 'user',
    },
    payment_gateway_charges: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    default_platform_charges: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    admin_approval_required: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'N',
    },
    approval_type: {
      type: DataTypes.ENUM('all', 'paid', 'free'),
      defaultValue: 'all',
    },
    eventId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    updateAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'users',
    timestamps: true,       // ✅ Enable automatic management
    createdAt: 'created',    // map createdAt → created
    updatedAt: 'updateAt',   // map updatedAt → updateAt
  });

module.exports = User;
