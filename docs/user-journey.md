# Clink: User Journey

## Scenario
A college student who pays for almost everything with Apple Pay heads out for a full day of classes, errands, and plans with friends. She rarely opens her bank app, and lately she's been avoiding it because she's afraid of what she'll see.

**Goal:** enjoy her day without losing track of spending, and end it knowing where she stands.

---

## Current journey (without Clink)

| Stage | What she does | What she thinks | How she feels |
|---|---|---|---|
| Morning | Taps to pay for coffee | "It's just a coffee." | 😌 Relaxed |
| Afternoon | Taps for lunch, a ride, a small purchase | Doesn't think about it; the amounts don't register | 😐 Unaware |
| Evening | Taps for dinner out with friends | "I've probably spent a lot today… I'll check later." | 😟 Uneasy |
| Night | Avoids opening the bank app | "I don't want to know." | 😰 Anxious |
| Days later | Finally checks her balance | "How did I spend that much?" | 😣 Shocked, guilty |

**Pain point:** tap-to-pay removes the moment of awareness. Spending builds up out of view, and the fear of finding out turns into avoidance.

---

## Future journey (with Clink)

| Stage | What she does | Clink touchpoint | What she thinks | How she feels |
|---|---|---|---|---|
| 1. Set up | Opens Clink and sets a $40 cap for the day | Budget setup screen | "Okay, this is my limit today." | 🙂 In control |
| 2. First purchase | Taps to pay for coffee ($6) | *Clink* sound + "You spent $6, $34 left" | "Good, I'm fine." | 😌 Reassured |
| 3. Midday | Taps for lunch ($14) | *Clink* + "$20 left" | "Still on track." | 🙂 Aware |
| 4. Getting close | Taps for a ride ($12) | *Clink* + "Heads up: $8 left" | "I should be careful tonight." | 🤔 Mindful |
| 5. Cap reached | Taps for snacks ($9) | Clear "You've reached your limit" alert + nudge to open the bank app | "Let me see where I'm actually at." | 😮 Alert, not panicked |
| 6. Check-in | Opens her bank app and reviews the day | Hand-off from Clink to the bank app | "Okay, I know what I spent and what I have left." | 😊 Informed, confident |
| 7. Adjust | Decides how to spend the rest of the week | (Back in Clink) adjusts tomorrow's cap if needed | "I can plan around this." | 💪 In control |

### Alternate path: no cap set
If she skips setup and her spending passes a significant amount, Clink still gives a heads-up: "You've spent $X today. Want to check your bank app?" *(Possible extension, not MVP.)*

---

## Key insights
1. **Awareness has to happen at the moment of payment.** Feedback hours later is too late.
2. **Tone matters.** Alerts should feel supportive, not judgmental, so users don't avoid Clink the way they avoid their bank app.
3. **Clink hands off to the bank app.** Its job is to bring the user back to their bank app aware and calm, not to replace it.
4. **The user is in control.** She sets her own cap; Clink only reflects her own goal back to her.

---

## Journey → user stories
| Journey stage | Becomes user story about… |
|---|---|
| 1. Set up | Setting a daily/weekly cap |
| 2–4. Purchases | Logging a purchase and seeing what's left |
| 4. Getting close | Near-limit warning |
| 5. Cap reached | Limit-reached alert + bank app nudge |
| 6–7. Check-in, adjust | Reviewing purchases and editing the cap |
