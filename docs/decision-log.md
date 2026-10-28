# Clink: Decision Log

A running record of key product and technical decisions: what I decided, why, and what I gave up. Newest entries at the top. Times are US Central.

---

## 2026-10-28 · 11:10 AM CT: Relational schema: UTC times + user time zone; database-enforced rules

**Decision**
- Add a **`timezone`** column to User. Store all times in UTC and convert using the user's time zone.
- Enforce rules in the database itself, not just the app: one settings row per user, at most one daily and one weekly budget, amounts must be above $0, period must be daily or weekly.
- Deleting an account deletes that user's settings, budgets, and purchases (`ON DELETE CASCADE`).
- Merchant is optional, since the shortcut doesn't always provide it.
- Weeks start on Monday for the MVP.

**Why**
- A daily budget has to reset at the user's midnight, not the server's. Without a time zone, an 11:30 PM purchase in Texas would count toward the next day.
- Rules in the database protect the data even if there's a bug in the app code.
- Users who delete their account shouldn't leave financial data behind.

---

## 2026-10-28 · 11:00 AM CT: Data model: Settings gets its own table; no Alerts table

**Decision**
- Four entities: **User**, **Settings**, **Budget**, **Purchase** (see [`er-diagram.md`](er-diagram.md)).
- **Settings** is its own table (one-to-one with User) instead of columns on User.
- Alerts are **not** stored as their own records.

**Why**
- Keeping settings separate keeps User focused on identity and login, and lets settings grow later without changing User.
- Purchase history already shows users what they spent and when. Alerts are moments in time, calculated from purchases and budget as they happen, so storing them would duplicate information.

---

## 2026-10-27 · 9:23 PM CT: Tap the jar's $ label to edit the budget; four-tab navigation

**Decision**
- Tapping the **$ label on the jar** (Home screen) opens the Budget screen directly, so users can change their cap without hunting for it.
- Bottom tab bar with four tabs: **Home** (jar) · **History** (daily & weekly Apple Pay reports) · **Budget** (daily or weekly cap) · **Settings**.
- Remove the ☰ menu icon; Settings lives in the tab bar instead.

**Why**
- The $ amount is the most prominent thing on Home, and people naturally tap the number they want to change. Making it a shortcut matches that instinct.
- One place for navigation (the tab bar, within thumb reach) is simpler than splitting it between a menu icon and tabs.
- A Home tab gives users a one-tap way back to the jar from anywhere.

**Accessibility notes**
- The $ label needs a clear accessible name for screen readers (e.g., "$10.00 left of $40. Tap to edit budget") and a large enough tap target.
- The Budget tab remains the main way to edit, since a tappable label isn't obvious to everyone.

---

## 2026-10-27 · 9:16 PM CT: Drop Plaid; track Apple Pay purchases only, via the shortcut

**Decision**
- Remove Plaid from the MVP. The Apple Shortcuts automation is the only way purchases get into Clink.
- Clink tracks **Apple Pay purchases only**.
- Make "notified of what you spent and what's left after **every** purchase" its own user story (US-4). It's one of Clink's main pillars, separate from the limit alert.

**Why**
- Plaid isn't specific to Apple Pay or tap-to-pay: it returns *every* transaction on a linked account (chip, swipe, online, transfers). Since Clink is about not spending blindly with Apple Pay, Plaid doesn't serve the core purpose.
- The shortcut fires only on Apple Pay and reports within seconds, which is exactly the behavior Clink targets.
- Without Plaid, users never hand Clink their bank login. That's a big trust and privacy win for a money app.
- It's simpler and faster to build (no Plaid sandbox, webhooks, de-duplication, or production approval).

**Trade-offs / risks**
- Physical card taps aren't tracked (no tool can reliably separate contactless card taps from chip/swipe).
- Purchases can be missed if the shortcut can't reach the server, and tips added after tapping aren't captured.
- Plaid stays on the roadmap as a possible optional accuracy add-on.

**Resolves** the open question from the 9:10 PM entry: only Apple Pay purchases count toward the cap.

---

## 2026-10-27 · 9:10 PM CT: Automatic purchase capture (Plaid + Apple Shortcuts); no manual entry

**Decision**
- Remove the manual "Add purchase" screen entirely.
- Capture purchases automatically from two sources:
  1. **Apple Shortcuts "Transaction" automation**: runs when an Apple Pay card is tapped and sends the amount and merchant to Clink's server within seconds. This triggers the clink sound and the "you spent $X · $Y left" notification.
  2. **Plaid**: syncs transactions from the user's linked bank as a backup, catching purchases the shortcut missed, confirming final amounts, and filling history. The server de-duplicates purchases that arrive from both.
- Move **Plaid** and **user accounts/login** into the MVP.
- Extend the build timeline from 2 days to about 1 week.

**Why**
- Clink's whole value is that it's as seamless as tap-to-pay itself. If users have to type purchases in, it becomes another budgeting app people forget to use. The clink only works if it happens automatically.
- The clink doesn't need to sound at the exact moment of tapping, but it should come soon after the purchase (within a few minutes at most) so the awareness moment isn't lost.
- **Plaid alone can't do that:** banks report transactions to Plaid with a delay (minutes to a day+), and Plaid only checks for new data periodically. The shortcut fills that gap.
- **Plaid can't reliably tell Apple Pay apart from other card payments.** With Apple Pay, the phone uses a stand-in card number (a "token"), and the bank mostly records it as an ordinary card purchase; most banks don't pass an "Apple Pay" flag through to Plaid. Plaid's `payment_channel` only says *in store*, *online*, or *other*. Building my own version of Plaid isn't realistic (Plaid has agreements with thousands of banks), so the shortcut, which only fires on Apple Pay, is how Clink knows a purchase was Apple Pay.
- Accounts are required because Plaid links a bank to a specific user, and I want history saved and available on any device.

**Trade-offs / risks**
- Users have to set up the shortcut once during onboarding, so clear step-by-step instructions are essential.
- Plaid's sandbox uses fake data; real bank data needs Plaid production approval later.
- Reviewers can't tap my phone, so a hidden developer-only "simulate a purchase" button will demo the flow.

**Open question**
- Should non-Apple Pay in-store card purchases (from Plaid) count toward the cap, or only Apple Pay purchases?

---

## 2026-10-26: Rebuild Clink from scratch as a full-stack app

**Decision**
- Start a fresh repo and rebuild Clink as a full-stack app: React (frontend), Node.js + Express (backend), SQL + Sequelize (database).
- Work through a full product process: problem → user journey → user stories → wireframes → ER diagram → schema → API design → build.

**Why**
- I wanted to complete a full-stack project end to end before applying to developer roles (e.g., the TAMU Entomology Web Application Developer role, whose stack is React, Node.js, MSSQL, and Sequelize).
- Documenting the process in `docs/` shows how I think as a designer and developer, not just the final code.
