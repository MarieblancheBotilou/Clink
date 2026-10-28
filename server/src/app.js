// Builds the Express app: middleware, routes, and error handling.
// Kept separate from server.js so tests can use the app without starting a server.
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const budgetRoutes = require('./routes/budgets');
const statusRoutes = require('./routes/status');
const purchaseRoutes = require('./routes/purchases');
const shortcutRoutes = require('./routes/shortcut');
const devRoutes = require('./routes/dev');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors()); // lets the React app (on another port) call this API
app.use(express.json()); // reads JSON request bodies into req.body

// Quick check that the server and database are up.
app.get('/api/health', async (req, res) => {
  await sequelize.authenticate();
  res.json({ status: 'ok', database: 'connected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/shortcut', shortcutRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes); // demo helper, off in production
}

// Any other URL -> 404 in the standard error format
app.use((req, res) => {
  throw new AppError(404, 'NOT_FOUND', `No endpoint at ${req.method} ${req.path}`);
});

app.use(errorHandler);

module.exports = app;
