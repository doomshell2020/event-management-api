const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Package = sequelize.define(
  'Package',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    package_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_package: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    discount_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    discount_amt: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    grandtotal: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Y', 'N'),
      allowNull: false,
      defaultValue: 'N',
    },
    hidden: {
      type: DataTypes.ENUM('Y', 'N'),
      allowNull: false,
      defaultValue: 'N',
    },
  },
  {
    tableName: 'tblpackage',
    timestamps: true, // Sequelize manages createdAt & updatedAt automatically
    createdAt: 'CreatedAt', // maps createdAt -> CreatedAt column in DB
    updatedAt: 'UpdatedAt', // maps updatedAt -> UpdatedAt column in DB
  }
);

module.exports = Package;
