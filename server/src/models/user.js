// A person using Clink. See docs/schema.md -> users.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      name: { type: DataTypes.STRING(50), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      shortcutToken: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      timezone: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'America/Chicago' },
    },
    { tableName: 'users' }
  );

  // Never send the password hash or shortcut token back in API responses.
  User.prototype.toPublicJSON = function toPublicJSON() {
    return { id: this.id, name: this.name, email: this.email, timezone: this.timezone };
  };

  return User;
};
