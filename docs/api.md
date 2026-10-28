# Clink: API Design

The API is the list of **endpoints**: web addresses on Clink's server that the app (and the Apple Pay shortcut) call to save or fetch data. Each endpoint maps to a user story and to the tables in the [schema](schema.md).

**Base URL:** `/api` · **Format:** JSON · **Database:** PostgreSQL via Sequelize

---

## How requests are authenticated

| Caller | How it proves who it is |
|---|---|
| **The app** (after login) | `Authorization: Bearer <token>`: a login token (JWT) returned by sign-up / log-in |
| **The Apple Pay shortcut** | `X-Shortcut-Token: <shortcut_token>`: the user's private shortcut token (from `users.shortcut_token`) |

🔓 = no login needed · 🔑 = app login token · ⚡ = shortcut token

---

## Endpoint summary

| # | Method | Endpoint | Auth | What it does | Story |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/signup` | 🔓 | Create an account (+ default settings) | US-1 |
| 2 | POST | `/api/auth/login` | 🔓 | Log in, get a token | US-1 |
| 3 | GET | `/api/me` | 🔑 | Get my profile | US-1 |
| 4 | PATCH | `/api/me` | 🔑 | Update name or time zone | US-1 |
| 5 | DELETE | `/api/me` | 🔑 | Delete my account and all my data | US-1 |
| 6 | GET | `/api/budgets` | 🔑 | Get my weekly budget and daily caps | US-2 |
| 7 | PUT | `/api/budgets` | 🔑 | Set or change my weekly budget and daily caps | US-2 |
| 8 | GET | `/api/status` | 🔑 | Home screen: today + this week, what's left, jar stage | US-4, US-5 |
| 9 | POST | `/api/purchases` | ⚡ | **The clink.** Shortcut reports an Apple Pay purchase | US-4, US-5 |
| 10 | POST | `/api/shortcut/test` | ⚡ | "Send a test clink" during setup (nothing saved) | US-3 |
| 11 | GET | `/api/shortcut` | 🔑 | Get my shortcut token and setup status | US-3 |
| 12 | POST | `/api/shortcut/regenerate` | 🔑 | Replace my shortcut token (if it's ever leaked) | US-3 |
| 13 | GET | `/api/history` | 🔑 | Daily or weekly totals vs. budget | US-6 |
| 14 | GET | `/api/purchases` | 🔑 | Purchases for one day (tap a day in History) | US-6 |
| 15 | GET | `/api/settings` | 🔑 | Get my settings | Settings tab |
| 16 | PATCH | `/api/settings` | 🔑 | Change settings | Settings tab |
| 17 | POST | `/api/dev/simulate-purchase` | 🔑 | **Development only.** Fake a purchase for demos/testing | Testing |

---

## Key endpoints in detail

### 1. `POST /api/auth/signup` 🔓
**Request**
```json
{ "name": "Marie-Blanche", "email": "mb@example.com", "password": "********", "timezone": "America/Chicago" }
```
**Server does:** validates input → hashes the password → creates the `users` row with a random `shortcut_token` → creates a `settings` row with defaults.

**Response `201 Created`**
```json
{ "token": "<login token>", "user": { "id": 7, "name": "Marie-Blanche", "email": "mb@example.com" } }
```
**Errors:** `400` invalid email or password under 8 characters · `409` email already used

---

### 7. `PUT /api/budgets` 🔑
Saves the weekly budget and the daily caps together, so the "daily caps must fit inside the week" rule can be checked in one place.

**Request: same amount every day**
```json
{
  "weekly": { "amount": 150.00, "is_active": true },
  "daily":  { "is_active": true, "mode": "same", "amount": 20.00 }
}
```
**Request: different amount per day** (Monday first)
```json
{
  "weekly": { "amount": 150.00, "is_active": true },
  "daily":  { "is_active": true, "mode": "per_day", "amounts": [15, 15, 15, 15, 30, 30, 30] }
}
```
**Server does:** validates every amount > 0 → if both are active, checks that the 7 daily caps add up to no more than the weekly amount → saves 1 weekly row + 7 daily rows.

**Response `200 OK`**: the saved budgets, in the same shape.

**Errors**
- `400 INVALID_AMOUNT`: an amount is ≤ 0 or not a number.
- `400 DAILY_EXCEEDS_WEEKLY`: "Your daily caps add up to $175.00, which is more than your $150.00 weekly budget."

---

### 8. `GET /api/status` 🔑 (Home screen)
**Response `200 OK`**
```json
{
  "today": { "cap": 20, "spent": 14, "remaining": 6, "percent_used": 70, "jar_stage": 2 },
  "week":  { "budget": 140, "spent": 70, "remaining": 70, "percent_used": 50, "jar_stage": 3 },
  "spent_today": 14,
  "spent_this_week": 70,
  "jar": "today",
  "alerts": []
}
```
- **The jar shows `today`.** If daily caps are off, `jar` is `"week"`; if no budget is on, it's `null`.
- `remaining` is calculated, never stored, and can go negative when over.
- `jar_stage`: 6 = full … 1 = almost empty, 0 = empty/over (matches the six jar drawings).
- `alerts` can include `"daily_heads_up"`, `"daily_limit"`, `"weekly_heads_up"`, `"weekly_limit"`.
- Unspent daily money is **not** carried over; it stays in the weekly pool.

---

### 9. `POST /api/purchases` ⚡ (the clink)
Called by the Apple Pay shortcut seconds after a tap.

**Request** (header `X-Shortcut-Token: <token>`)
```json
{ "amount": 6.00, "merchant": "Starbucks", "purchased_at": "2026-10-28T15:42:10Z" }
```
**Server does:**
1. Finds the user by shortcut token (`401` if none matches).
2. Validates the amount (> 0).
3. Saves the `purchases` row.
4. Recalculates today's and this week's spent / remaining, using the user's time zone (weeks start Monday).
5. Decides alerts for today and the week (heads-up at the user's alert level, limit at 100%).
6. Builds the notification text.

**Response `201 Created`** (the shortcut turns this into the notification and plays the clink)
```json
{
  "purchase": { "id": 42, "amount": 6, "merchant": "Starbucks", "purchased_at": "2026-10-28T15:42:10.000Z" },
  "notification": "You spent $6.00 at Starbucks · $14.00 left today · $134.00 left this week",
  "today_remaining": 14,
  "week_remaining": 134,
  "alerts": [],
  "show_notification": true,
  "play_sound": true
}
```
Other notification wordings:
- **Heads up** (at the alert level, 75% by default): `Heads up: You spent $16.00 at Target · $4.00 left today · $124.00 left this week`
- **Today's limit:** `You've reached today's limit · You spent $10.00 at Chipotle · −$5.00 over today · $115.00 left this week. Check your bank app.`
- **This week's limit:** `You've reached this week's limit · You spent $145.00 · −$5.00 over this week. Check your bank app.`

Notes:
- `amount` can be a number (`6.5`) or text the way Apple Shortcuts sends it (`"$6.50"`).
- `purchased_at` is optional (defaults to now) and can't be in the future.
- `play_sound` follows the user's `sound_on` setting.
- If only one budget is on, the notification mentions just that one. If none is set, it still says what was spent: "You spent $6.00 at Starbucks."

---

### 13. `GET /api/history?range=daily&from=2026-10-01&to=2026-10-28` 🔑
`range` is `daily` or `weekly`.

**Response `200 OK`**
```json
{
  "range": "daily",
  "periods": [
    { "start": "2026-10-28", "spent": 32.00, "budget": 40.00, "over": false },
    { "start": "2026-10-27", "spent": 47.25, "budget": 40.00, "over": true }
  ]
}
```

### 14. `GET /api/purchases?date=2026-10-28` 🔑
```json
{ "date": "2026-10-28", "purchases": [ { "id": 42, "amount": 6.00, "merchant": "Starbucks", "purchased_at": "2026-10-28T15:42:10Z" } ] }
```

---

## Standard error format
Every error uses the same shape, so the app can show friendly messages:
```json
{ "error": { "code": "INVALID_AMOUNT", "message": "Amount must be greater than $0." } }
```

| Status | Meaning |
|---|---|
| `200` / `201` | OK / created |
| `400` | Bad input (validation failed) |
| `401` | Not logged in, or invalid token |
| `404` | Not found |
| `409` | Conflict (e.g., email already used) |
| `500` | Server error |
