// A spending cap: one weekly row (the overall limit) and up to 7 daily rows.
// See docs/schema.md -> budgets.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Budget',
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      period: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['daily', 'weekly']] } },
      dayOfWeek: { type: DataTypes.SMALLINT, allowNull: true, validate: { min: 0, max: 6 } }, // 0 = Mon
      // DECIMAL comes back from Postgres as a string ("20.00") so money never loses cents.
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'budgets' }
  );
