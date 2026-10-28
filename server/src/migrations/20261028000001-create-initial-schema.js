'use strict';

// Creates Clink's four tables, matching docs/schema.sql.
// Run with:   npm run db:migrate
// Undo with:  npm run db:migrate:undo

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };
    // Every child table points back to users and is deleted along with its user.
    const userForeignKey = {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    };

    // ---------- users ----------
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      shortcut_token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      timezone: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'America/Chicago' },
      ...timestamps,
    });

    // ---------- settings (one row per user) ----------
    await queryInterface.createTable('settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { ...userForeignKey, unique: true }, // unique = one-to-one
      notifications_on: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sound_on: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      alert_threshold_pct: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 75 },
      reduce_motion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    });
    await queryInterface.addConstraint('settings', {
      type: 'check',
      fields: ['alert_threshold_pct'],
      where: { alert_threshold_pct: { [Sequelize.Op.between]: [1, 99] } },
      name: 'settings_alert_threshold_range',
    });

    // ---------- budgets (1 weekly + up to 7 daily per user) ----------
    await queryInterface.createTable('budgets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: userForeignKey,
      period: { type: Sequelize.STRING(10), allowNull: false },
      day_of_week: { type: Sequelize.SMALLINT, allowNull: true }, // 0 = Monday ... 6 = Sunday
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE budgets
        ADD CONSTRAINT budgets_period_valid CHECK (period IN ('daily', 'weekly')),
        ADD CONSTRAINT budgets_amount_positive CHECK (amount > 0),
        ADD CONSTRAINT budgets_day_matches_period CHECK (
          (period = 'weekly' AND day_of_week IS NULL) OR
          (period = 'daily'  AND day_of_week IS NOT NULL AND day_of_week BETWEEN 0 AND 6)
        ),
        ADD CONSTRAINT budgets_one_per_day UNIQUE (user_id, period, day_of_week);
    `);
    // Only one weekly budget per user. (The UNIQUE above can't catch this because NULLs never count as equal.)
    await queryInterface.addIndex('budgets', ['user_id'], {
      unique: true,
      where: { period: 'weekly' },
      name: 'one_weekly_budget_per_user',
    });

    // ---------- purchases ----------
    await queryInterface.createTable('purchases', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: userForeignKey,
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      merchant: { type: Sequelize.STRING(100), allowNull: true },
      purchased_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      created_at: timestamps.created_at,
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE purchases ADD CONSTRAINT purchases_amount_positive CHECK (amount > 0);'
    );
    // Speeds up "this user's purchases today / this week", the most common query.
    await queryInterface.addIndex('purchases', ['user_id', 'purchased_at'], {
      name: 'idx_purchases_user_time',
    });
  },

  async down(queryInterface) {
    // Drop in reverse order so foreign keys don't block us.
    await queryInterface.dropTable('purchases');
    await queryInterface.dropTable('budgets');
    await queryInterface.dropTable('settings');
    await queryInterface.dropTable('users');
  },
};
