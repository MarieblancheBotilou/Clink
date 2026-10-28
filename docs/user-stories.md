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

> **How purchases get into Clink:** there is no manual entry. Purchases are captured automatically from two sources:
> 1. **Apple Shortcuts "Transaction" automation**: fires within seconds of an Apple Pay tap and sends the amount and merchant to Clink's server. This is what makes the clink feel immediate.
> 2. **Plaid**: syncs transactions from the linked bank account, catching anything the shortcut missed, confirming final amounts, and building history. The server matches the two sources so a purchase is never counted twice.
>
> See [`decision-log.md`](decision-log.md) for why.

### US-1: Create an account
**As a** tap-to-pay user, **I want to** create an account and log in, **so that** my cap, purchases, and history are saved and follow me to any device.

**Acceptance criteria**
- Given I'm new, when I sign up with email and password, then my account is created and I'm taken to onboarding.
- Given my password is under 8 characters or my email is invalid, then I see an error and no account is created.
- Given I log in on a new device, then I see the same cap, purchases, and history.
- Passwords are stored hashed, never as plain text.
- *(Later: Sign in with Apple / Google.)*

### US-2: Set a daily cap
**As a** tap-to-pay user, **I want to** set a daily spending cap, **so that** I have a clear limit to stay within.

**Acceptance criteria**
- Given I'm on the setup screen, when I enter an amount above $0 and save, then it becomes my daily cap.
- Given I enter $0, a negative number, or letters, when I try to save, then I see an error and nothing is saved.
- Given I already have a cap, when I change it, then the new amount shows on my home screen.

### US-3: Connect my payments
**As a** tap-to-pay user, **I want to** link my bank and set up the Clink shortcut once, **so that** my purchases are tracked automatically without me entering anything.

**Acceptance criteria**
- Given I'm in onboarding, when I tap "Link your bank," then Plaid Link opens and I can connect my account.
- Given the link succeeds, then Clink shows the connected bank and begins syncing transactions.
- Given I'm on the shortcut setup screen, then I see simple step-by-step instructions (with images) to add the Clink shortcut.
- Given the bank link fails or I cancel, then I see a friendly message and can try again.

### US-4: Hear the clink after I pay
**As a** tap-to-pay user, **I want to** hear a clink and get a notification telling me what I spent and what's left shortly after I pay, **so that** I stay aware of my spending without opening any app.

**Acceptance criteria**
- Given I pay with Apple Pay, when the shortcut sends the purchase, then within seconds I hear the *clink* and see "You spent $X at [merchant] · $Y left."
- Given a purchase arrives only through Plaid (the shortcut missed it), then it's logged and I still get the notification when Plaid delivers it.
- Given the same purchase arrives from both the shortcut and Plaid, then it's counted once.
- Remaining = cap − total of today's purchases.
- The jar on the home screen updates to match.

### US-5: Get alerted at my limit
**As a** tap-to-pay user, **I want to** be alerted when I'm close to or have reached my cap, **so that** I can stop and check my bank app before overspending.

**Acceptance criteria**
- Given a purchase brings me to 75% or more of my cap, then I see a "Heads up: $Y left" message.
- Given a purchase brings me to 100% or more of my cap, then I see a clear "You've reached your limit" alert with a prompt to open my bank app.
- Going over shows a negative amount with a minus sign and words (e.g., "−$5.00 over"), not color alone.
- Alerts use supportive wording, not judgmental wording.

### US-6: See my spending history
**As a** tap-to-pay user, **I want to** see my past purchases by day, **so that** I can understand my spending over time.

**Acceptance criteria**
- Given I open History, then I see each day with total spent vs. cap, newest first.
- Given I tap a day, then I see that day's purchases (amount, merchant, time).

---

## Development & testing note
Plaid's sandbox uses fake bank data, and reviewers can't tap a real phone. A **developer-only "simulate a purchase"** button (hidden from users) triggers the same flow as a real purchase, so the clink, notification, jar, and alerts can be demoed and tested.

---

## Out of scope for MVP (roadmap)
- Sign in with Apple / Google
- Weekly cap option (in addition to daily)
- Heads-up alert when no cap is set but spending passes a significant amount
- Vibration patterns and custom notification settings
- Moving from Plaid sandbox to real bank data (requires Plaid production approval)

---

## Open questions
- **Which purchases count toward the cap?** Apple Pay purchases are identified by the shortcut. Plaid can't reliably tell tap-to-pay from chip, swipe, or online purchases, so: count only shortcut-confirmed Apple Pay purchases, or all in-store card purchases from Plaid too?

---

## Story → screen map
| Screen | Stories |
|---|---|
| Sign-up options / Email sign-up / Log in | US-1 |
| Set cap | US-2 |
| Link your bank (Plaid) | US-3 |
| Set up the Clink shortcut | US-3 |
| Notification (lock screen / banner) | US-4, US-5 |
| Home (jar) | US-4, US-5 |
| History | US-6 |
