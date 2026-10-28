// One row of preferences per user. See docs/schema.md -> settings.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Settings',
    {
      userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      notificationsOn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      soundOn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      alertThresholdPct: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 75,
        validate: { min: 1, max: 99 },
      },
      reduceMotion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'settings' }
  );
