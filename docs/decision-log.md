# Clink: Decision Log

A running record of key product and technical decisions: what I decided, why, and what I gave up. Newest entries at the top. Times are US Central.

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
