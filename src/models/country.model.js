const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Countries = sequelize.define(
    'Countries',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        CountryName: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        TwoCharCountryCode: {
            type: DataTypes.STRING(2),
            allowNull: false,
        },
        ThreeCharCountryCode: {
            type: DataTypes.STRING(3),
            allowNull: false,
        },
        words: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        Created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        Status: {
            type: DataTypes.ENUM('Y', 'N'),
            allowNull: false,
            defaultValue: 'Y',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: 'tbl_Countries', // replace with your actual table name
        timestamps: true,         // disable automatic createdAt/updatedAt
        createdAt: 'Created',    // map createdAt → created
        updatedAt: 'updateAt',   // map updatedAt → updateAt
    }
);

module.exports = Countries;
