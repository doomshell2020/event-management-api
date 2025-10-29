const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PackageDetails = sequelize.define(
  'PackageDetails',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ticket_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    addon_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Y', 'N'),
      allowNull: false,
      defaultValue: 'N',
    },
  },
  {
    tableName: 'tblpackage_details',
    timestamps: true, // Sequelize manages createdAt & updatedAt automatically
    createdAt: 'CreatedAt', // maps createdAt -> CreatedAt column in DB
    updatedAt: 'UpdatedAt', // maps updatedAt -> UpdatedAt column in DB
  }
);

module.exports = PackageDetails;
