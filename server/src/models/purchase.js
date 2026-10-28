// One Apple Pay purchase, sent by the Clink shortcut. See docs/schema.md -> purchases.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Purchase',
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
      merchant: { type: DataTypes.STRING(100), allowNull: true },
      purchasedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'purchases', updatedAt: false } // purchases are never edited, so no updated_at
  );
