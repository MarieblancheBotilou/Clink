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
| 6 | GET | `/api/budgets` | 🔑 | Get my daily and weekly budgets | US-2 |
| 7 | PUT | `/api/budgets/:period` | 🔑 | Set or change my `daily` or `weekly` budget | US-2 |
| 8 | GET | `/api/status` | 🔑 | Home screen: budget, spent, what's left, jar stage | US-4, US-5 |
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

### 7. `PUT /api/budgets/:period` 🔑
`:period` is `daily` or `weekly`. Creates the budget if it doesn't exist, or updates it if it does.

**Request**
```json
{ "amount": 40.00, "is_active": true }
```
**Response `200 OK`**
```json
{ "period": "daily", "amount": 40.00, "is_active": true }
```
**Errors:** `400` amount ≤ 0 or not a number · `404` period isn't `daily` or `weekly`

---

### 8. `GET /api/status` 🔑 (Home screen)
**Response `200 OK`**
```json
{
  "budgets": [
    { "period": "daily",  "amount": 40.00, "spent": 32.00, "remaining": 8.00,  "percent_used": 80, "jar_stage": 2 },
    { "period": "weekly", "amount": 150.00, "spent": 95.50, "remaining": 54.50, "percent_used": 64, "jar_stage": 3 }
  ],
  "alert": "heads_up"
}
```
- `remaining` is calculated, never stored: `amount − sum(purchases in the period)`. It can go negative when over.
- `jar_stage`: 6 = full … 1 = almost empty, 0 = empty/over (matches the six jar drawings).
- `alert`: `null`, `"heads_up"` (at or past the user's alert level), or `"limit_reached"`.

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
4. Recalculates spent / remaining for the user's active budget(s), using the user's time zone.
5. Decides the alert level.
6. Builds the notification text.

**Response `201 Created`** (the shortcut turns this into the notification and plays the clink)
```json
{
  "notification": "You spent $6.00 at Starbucks · $34.00 left",
  "remaining": 34.00,
  "alert": null,
  "play_sound": true
}
```
When the cap is reached:
```json
{
  "notification": "You've reached your limit · −$5.00 over. Check your bank app.",
  "remaining": -5.00,
  "alert": "limit_reached",
  "play_sound": true
}
```
- `play_sound` follows the user's `sound_on` setting.
- If no budget is set, the notification still says what was spent: "You spent $6.00 at Starbucks."

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

---

## Open question
- **When both daily and weekly budgets are on, which one drives the jar and the notification?** `/api/status` returns both, so the app can decide. Proposed: whichever has the lower percentage left.
