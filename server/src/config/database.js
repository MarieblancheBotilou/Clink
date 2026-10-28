// Database connection settings for each environment.
// Used by both the app (src/models/index.js) and sequelize-cli (migrations).
require('dotenv').config({ quiet: true });

const shared = {
  dialect: 'postgres',
  logging: false, // set to console.log to see the SQL Sequelize runs
  define: {
    underscored: true, // JS `userId` <-> database column `user_id`
  },
};

module.exports = {
  development: {
    ...shared,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'clink_dev',
  },
  test: {
    ...shared,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || 'clink_test',
  },
  production: {
    ...shared,
    // Hosted databases (e.g., Supabase, Neon) give you a single connection URL.
    use_env_variable: 'DATABASE_URL',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  },
};
