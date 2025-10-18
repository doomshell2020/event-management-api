// src/config/database.js

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// 🔹 Log environment variables to check
// console.log('DB_NAME:', process.env.DB_NAME);
// console.log('DB_USER:', process.env.DB_USER);
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD); // hide actual password
// console.log('DB_HOST:', process.env.DB_HOST);

const sequelize = new Sequelize(
  process.env.DB_NAME,      // Database name
  process.env.DB_USER,      // Database username
  process.env.DB_PASSWORD,  // Database password
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,          // Set true if you want to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
  }
);

module.exports = sequelize;
