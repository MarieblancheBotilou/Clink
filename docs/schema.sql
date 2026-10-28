-- Clink: relational schema (PostgreSQL)
-- In the app, Sequelize migrations create these same tables.
-- All timestamps are stored in UTC; users.timezone decides when "today" starts.

CREATE TABLE users (
  id              SERIAL        PRIMARY KEY,
  name            VARCHAR(50)   NOT NULL,
  email           VARCHAR(255)  NOT NULL UNIQUE,          -- stored lowercase
  password_hash   VARCHAR(255)  NOT NULL,                 -- bcrypt hash, never the real password
  shortcut_token  VARCHAR(64)   NOT NULL UNIQUE,          -- sent by the Apple Pay shortcut
  timezone        VARCHAR(50)   NOT NULL DEFAULT 'America/Chicago',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id                   SERIAL     PRIMARY KEY,
  user_id              INTEGER    NOT NULL UNIQUE           -- UNIQUE = one settings row per user
                                  REFERENCES users(id) ON DELETE CASCADE,
  notifications_on     BOOLEAN    NOT NULL DEFAULT TRUE,
  sound_on             BOOLEAN    NOT NULL DEFAULT TRUE,
  alert_threshold_pct  INTEGER    NOT NULL DEFAULT 75
                                  CHECK (alert_threshold_pct BETWEEN 1 AND 99),
  reduce_motion        BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budgets (
  id           SERIAL         PRIMARY KEY,
  user_id      INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period       VARCHAR(10)    NOT NULL CHECK (period IN ('daily', 'weekly')),
  day_of_week  SMALLINT,                                  -- 0 = Monday ... 6 = Sunday; NULL for weekly
  amount       DECIMAL(10,2)  NOT NULL CHECK (amount > 0),
  is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- daily rows need a day; the weekly row must not have one
  CHECK (
    (period = 'weekly' AND day_of_week IS NULL) OR
    (period = 'daily'  AND day_of_week IS NOT NULL AND day_of_week BETWEEN 0 AND 6)
  ),
  UNIQUE (user_id, period, day_of_week)                   -- one cap per day of the week
);

-- Only one weekly budget per user (UNIQUE above can't catch this, because NULLs never count as equal)
CREATE UNIQUE INDEX one_weekly_budget_per_user ON budgets (user_id) WHERE period = 'weekly';

-- Rule enforced in the app (it compares several rows, so a CHECK can't do it):
-- when both are active, the sum of the 7 daily caps must be <= the weekly amount.

CREATE TABLE purchases (
  id            SERIAL         PRIMARY KEY,
  user_id       INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        DECIMAL(10,2)  NOT NULL CHECK (amount > 0),
  merchant      VARCHAR(100),                             -- optional
  purchased_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Speeds up "this user's purchases today / this week"
CREATE INDEX idx_purchases_user_time ON purchases (user_id, purchased_at);
