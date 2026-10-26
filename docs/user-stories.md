# Clink — User Stories (MVP)

## Problem
Tap-to-pay (Apple Pay, contactless cards) makes paying so effortless that spending stops registering. A double-tap and a tap leaves no moment to notice the amount, so over a day or a week the total quietly builds up out of view.

Many tap-to-pay users rarely open their bank app to check. When they finally do, the balance can be a surprise, and some begin avoiding the bank app because they're anxious about what they'll see. That avoidance makes the problem worse.

**The core gap:** tap-to-pay gives no real-time feedback on how much you've spent compared with how much you meant to spend.

### How Clink addresses it
- The user sets their own spending cap for the day or the week.
- After each purchase, Clink says how much was spent and how much of the cap is left, with a "clink" coin sound so the spending registers.
- When the cap is reached, Clink signals it clearly and prompts the user to open their bank app to review their spending and plan what to do next.
- *(Possible extension)* If no cap is set but spending passes a significant amount, Clink still gives a heads-up suggesting a check-in.

Clink isn't meant to replace the bank app. Its job is to bring people back to it, at the right moment, aware and not afraid.

### Assumption to validate
Other tap-to-pay users also rarely check their bank app after spending. *Next step: a quick survey or a few conversations with classmates and friends.*

## Target user
Young adults and college students who pay mostly with Apple Pay or other tap-to-pay methods. They value the convenience of contactless payment but rarely check their bank app afterwards, so they often lose track of how much they've spent.

---

## MVP user stories

### US-1: Set a daily cap
**As a** tap-to-pay user, **I want to** set a daily spending cap, **so that** I have a clear limit to stay within.

**Acceptance criteria**
- Given I'm on the setup screen, when I enter an amount above $0 and save, then it becomes my daily cap.
- Given I enter $0, a negative number, or letters, when I try to save, then I see an error and nothing is saved.
- Given I already have a cap, when I change it, then the new amount shows on my dashboard.

### US-2: See what I spent and what's left
**As a** tap-to-pay user, **I want to** see how much I just spent and how much of my cap is left after each purchase, **so that** I stay aware of my spending in the moment.

**Acceptance criteria**
- Given I log a purchase, then I hear the *clink* sound and see "You spent $X, $Y left."
- Given I open the dashboard, then I see my cap, my total spent today, and the amount remaining.
- Remaining = cap − total of today's purchases.

### US-3: Get alerted at my limit
**As a** tap-to-pay user, **I want to** be alerted when I'm close to or have reached my cap, **so that** I can stop and check my bank app before overspending.

**Acceptance criteria**
- Given a purchase brings me to 75% or more of my cap, then I see a "Heads up: $Y left" message.
- Given a purchase brings me to 100% or more of my cap, then I see a clear "You've reached your limit" alert with a prompt to open my bank app.
- Alerts use supportive wording, not judgmental wording.

---

## Out of scope for MVP (roadmap)
In the MVP, purchases are entered by hand so the core experience (cap → purchase → clink → alert) can be built and tested first.

**Next (top priority after MVP)**
- Automatic purchase syncing through Plaid, so tap-to-pay purchases appear in Clink without manual entry

**Later**
- Weekly cap option (in addition to daily)
- Heads-up alert when no cap is set but spending passes a significant amount
- Phone notifications and vibration when the cap is reached
- Apple Wallet / Shortcuts automation
- User accounts and login

---

## Story → screen map
| Screen | Stories |
|---|---|
| Cap Setup | US-1 |
| Add Purchase | US-2 |
| Dashboard (includes alerts) | US-2, US-3 |
