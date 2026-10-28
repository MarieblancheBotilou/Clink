// Connects to the database, loads every model, and wires up the relationships
// from the ER diagram (docs/er-diagram.md).
const { Sequelize } = require('sequelize');
const configs = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const config = configs[env];

const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

const User = require('./user')(sequelize);
const Settings = require('./settings')(sequelize);
const Budget = require('./budget')(sequelize);
const Purchase = require('./purchase')(sequelize);

// User 1 --- 1 Settings
User.hasOne(Settings, { foreignKey: 'userId', as: 'settings', onDelete: 'CASCADE' });
Settings.belongsTo(User, { foreignKey: 'userId' });

// User 1 --- many Budgets (1 weekly + up to 7 daily)
User.hasMany(Budget, { foreignKey: 'userId', as: 'budgets', onDelete: 'CASCADE' });
Budget.belongsTo(User, { foreignKey: 'userId' });

// User 1 --- many Purchases
User.hasMany(Purchase, { foreignKey: 'userId', as: 'purchases', onDelete: 'CASCADE' });
Purchase.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, Sequelize, User, Settings, Budget, Purchase };
