# Clink API (server)

Node.js + Express + Sequelize + PostgreSQL. Endpoints are designed in [`../docs/api.md`](../docs/api.md); tables match [`../docs/schema.md`](../docs/schema.md).

## Run it locally
**Prerequisites:** Node.js 20+ and PostgreSQL, with two empty databases: `clink_dev` and `clink_test`.

```bash
cd server
npm install                # install dependencies
cp .env.example .env       # then put your PostgreSQL password in .env
npm run db:migrate         # create the tables in clink_dev
npm run dev                # start the API at http://localhost:3000
```
Check it's running: open http://localhost:3000/api/health and you should see `{"status":"ok","database":"connected"}`.

## Run the tests
```bash
npm test                   # uses clink_test, never your real data
```

## Project structure
```
server/
├── src/
│   ├── config/database.js   # connection settings per environment
│   ├── models/              # User, Settings, Budget, Purchase (+ relationships)
│   ├── migrations/          # creates the tables
│   ├── routes/              # one file per group of endpoints
│   ├── middleware/          # login check, error handling
│   ├── utils/               # tokens, error class
│   ├── app.js               # wires everything together
│   └── server.js            # starts the server
└── tests/                   # Jest + Supertest
```

## Progress
| Endpoint | Status |
|---|---|
| `GET /api/health` | ✅ |
| `POST /api/auth/signup` | ✅ |
| `POST /api/auth/login` | ✅ |
| `GET /api/me` | ✅ |
| Budgets, status, purchases (the clink), history, settings | ⏳ Next |
