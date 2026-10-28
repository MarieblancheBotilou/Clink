# Clink: Relational Schema

The relational schema turns the [ER diagram](er-diagram.md) into exact table definitions: the precise data type of every column, which columns are required, default values, and the rules the database enforces so bad data can't get in.

The runnable SQL version is in [`schema.sql`](schema.sql). In the app, these tables are created by **Sequelize models and migrations**, which generate the same structure.

---

## Column reference

| Term | Meaning |
|---|---|
| **Required** | `NOT NULL`: the column must always have a value. |
| **Default** | The value used if none is given. |
| **Rule** | A constraint the database enforces (`UNIQUE`, `CHECK`, `FOREIGN KEY`). |
| `VARCHAR(n)` | Text up to *n* characters. |
| `DECIMAL(10,2)` | Exact money values: up to 10 digits, 2 after the decimal point (e.g., 6.50). Never use floating-point numbers for money; they cause rounding errors. |
| `TIMESTAMP` | A date and time, stored in **UTC**. |

---

## `users`
| Column | Type | Required | Default | Rules |
|---|---|---|---|---|
| `id` | INTEGER | ✓ | auto-increment | **PRIMARY KEY** |
| `name` | VARCHAR(50) | ✓ | | Shown as "Howdy, {name}" |
| `email` | VARCHAR(255) | ✓ | | **UNIQUE**; stored lowercase |
| `password_hash` | VARCHAR(255) | ✓ | | Hashed with bcrypt; the real password is never stored |
| `shortcut_token` | VARCHAR(64) | ✓ | random, generated at sign-up | **UNIQUE**; identifies the user when the Apple Pay shortcut sends a purchase |
| `timezone` | VARCHAR(50) | ✓ | `'America/Chicago'` | IANA time zone name; decides when "today" and "this week" start for this user |
| `created_at` | TIMESTAMP | ✓ | now | |
| `updated_at` | TIMESTAMP | ✓ | now | |

## `settings`
| Column | Type | Required | Default | Rules |
|---|---|---|---|---|
| `id` | INTEGER | ✓ | auto-increment | **PRIMARY KEY** |
| `user_id` | INTEGER | ✓ | | **FOREIGN KEY** → `users.id`, **UNIQUE** (enforces one settings row per user) · delete with user |
| `notifications_on` | BOOLEAN | ✓ | `true` | |
| `sound_on` | BOOLEAN | ✓ | `true` | |
| `alert_threshold_pct` | INTEGER | ✓ | `75` | **CHECK** between 1 and 99 |
| `reduce_motion` | BOOLEAN | ✓ | `false` | |
| `created_at` / `updated_at` | TIMESTAMP | ✓ | now | |

## `budgets`
| Column | Type | Required | Default | Rules |
|---|---|---|---|---|
| `id` | INTEGER | ✓ | auto-increment | **PRIMARY KEY** |
| `user_id` | INTEGER | ✓ | | **FOREIGN KEY** → `users.id` · delete with user |
| `period` | VARCHAR(10) | ✓ | | **CHECK** is `'daily'` or `'weekly'` |
| `day_of_week` | SMALLINT | daily only | | 0 = Monday … 6 = Sunday. **CHECK:** required for daily rows (0–6), must be empty for the weekly row |
| `amount` | DECIMAL(10,2) | ✓ | | **CHECK** greater than 0 |
| `is_active` | BOOLEAN | ✓ | `true` | The on/off switch on the Set cap screen |
| `created_at` / `updated_at` | TIMESTAMP | ✓ | now | |

**How budgets are stored**
- **Weekly budget:** one row with `period = 'weekly'` and no day. This is the overall limit.
- **Daily caps:** seven rows, one per day of the week (`day_of_week` 0–6). "Same amount every day" just means all seven rows have the same amount; "different per day" means they differ.
- So a user has at most **8 budget rows**: 7 daily + 1 weekly.

**Table rules**
- `UNIQUE (user_id, period, day_of_week)`: one cap per day of the week.
- A partial unique index (`WHERE period = 'weekly'`): only one weekly budget per user.
- **Enforced in the app:** when both are active, the 7 daily caps can't add up to more than the weekly budget. This compares several rows at once, so a simple database `CHECK` can't do it; the backend validates it before saving.

## `purchases`
| Column | Type | Required | Default | Rules |
|---|---|---|---|---|
| `id` | INTEGER | ✓ | auto-increment | **PRIMARY KEY** |
| `user_id` | INTEGER | ✓ | | **FOREIGN KEY** → `users.id` · delete with user |
| `amount` | DECIMAL(10,2) | ✓ | | **CHECK** greater than 0 |
| `merchant` | VARCHAR(100) | | | Optional: the shortcut doesn't always provide it; the app shows "Apple Pay purchase" instead |
| `purchased_at` | TIMESTAMP | ✓ | now | When the tap happened (UTC) |
| `created_at` | TIMESTAMP | ✓ | now | When Clink received it |

**Index:** `(user_id, purchased_at)`, which makes "this user's purchases today / this week" fast. That's the most frequent query in the app (every purchase notification and the History tab).

---

## Design decisions
- **Delete with user (`ON DELETE CASCADE`):** if someone deletes their account, their settings, budgets, and purchases are deleted too. No orphaned financial data is left behind.
- **No `remaining` column:** what's left is always calculated (budget amount − sum of purchases in the period), so it can never drift out of sync.
- **Times stored in UTC, user's time zone stored separately:** a purchase at 11:30 PM in College Station is still "today" for that user even though it's the next day in UTC. The server converts using `users.timezone`.
- **Weeks start on Monday** (assumption for MVP; could become a setting later).
- **No carry-over:** unspent daily money doesn't roll into tomorrow; it stays in the weekly pool, which already accounts for it.
- **Settings row created at sign-up** with the defaults above, so every user always has exactly one.

## Database engine
The schema is written in standard SQL and works on PostgreSQL. Sequelize generates the right syntax for each database, so switching to **Microsoft SQL Server (MSSQL)** only changes a few type names (e.g., `BOOLEAN` → `BIT`, `TIMESTAMP` → `DATETIME2`, auto-increment → `IDENTITY`).
