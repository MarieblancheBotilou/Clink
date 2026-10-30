# Clink 🪙

**Hear the clink. Stop and think.**

Clink makes Apple Pay spending feel real again. Set a daily or weekly cap, and every time you tap to pay you hear a *clink* and get a notification showing what you spent and what's left.

<p align="center">
  <img src="docs/wireframes/jar-stages.png" alt="Six stages of the Clink jar, from full to empty, as the budget is spent" width="720">
</p>

## The problem
Tap-to-pay makes paying so effortless that spending stops registering. Many people rarely open their bank app afterwards, and when they finally do, the balance is a surprise. Some start avoiding their bank app altogether because they're anxious about what they'll see.

**Clink closes that gap with real-time feedback on every Apple Pay purchase.**

## How it works
1. **Set a cap** for the day or week.
2. **Pay with Apple Pay** as usual. An Apple Shortcuts automation sends the purchase to Clink within seconds.
3. **Hear the clink** and see "You spent $6 at Starbucks · $34 left."
4. **Watch the jar** on the home screen empty as you spend.
5. **Get a heads-up** near your limit, and a nudge to check your bank app when you reach it.

No bank login required. Clink only sees the amount and merchant of each Apple Pay purchase.

## See it work
Three simulated Apple Pay purchases against a $20/day, $140/week budget. Each one returns the notification text, and the third triggers a **heads-up** as today's cap runs low:

<p align="center">
  <img src="docs/screenshots/clink-simulator.png" alt="PowerShell showing three simulated $6 Starbucks purchases. The notifications read $14, then $8, then 'Heads up' with $2 left today." width="560">
</p>

## Status: 🚧 In development
| Phase | Status |
|---|---|
| Problem definition & user journey | ✅ Done |
| User stories & MVP scope | ✅ Done |
| Paper wireframes | ✅ Done |
| ER diagram | ✅ Done |
| Relational schema | ✅ Done |
| API design | ✅ Done |
| Figma designs | 🔄 Next |
| Backend (Node.js, Express, Sequelize, PostgreSQL) | ✅ Done: all MVP endpoints, 67 tests ([details](server/README.md)) |
| Frontend (React) | ⏳ Next |
| Shortcut integration & deployment | ⏳ Planned |

## Tech stack
- **Frontend:** React
- **Backend:** Node.js, Express
- **Database:** PostgreSQL with Sequelize ORM
- **Integration:** Apple Shortcuts "Transaction" automation → Clink API
- **Design:** Paper sketches → Figma

## Design process
Every step is documented in [`docs/`](docs/):
- [User journey](docs/user-journey.md): the experience before and after Clink
- [User stories](docs/user-stories.md): MVP scope, acceptance criteria, known limitations
- [ER diagram](docs/er-diagram.md): what Clink stores and how it connects
- [Relational schema](docs/schema.md): exact tables, types, and rules ([SQL](docs/schema.sql))
- [API design](docs/api.md): every endpoint, its inputs, and its responses
- [Decision log](docs/decision-log.md): key product decisions and the reasoning behind them
- [Wireframes](docs/wireframes/): paper sketches and jar artwork

## Project structure
```
Clink/
├── client/   # React frontend
├── server/   # Node.js + Express API
└── docs/     # Research, user stories, wireframes, decisions
```

## Author
**Marie-Blanche Boti Lou**, Learning Technology & Performance Systems, Texas A&M University

## License
© 2026 Marie-Blanche Boti Lou. All rights reserved. This code is shared for portfolio viewing only; see [LICENSE](LICENSE).
