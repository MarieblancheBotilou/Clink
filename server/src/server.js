// Starts the API server. Run with:  npm run dev
require('dotenv').config({ quiet: true });
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');
  } catch (err) {
    console.error('❌ Could not connect to PostgreSQL. Check your .env settings.\n', err.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`🪙 Clink API running at http://localhost:${PORT}`));
}

start();
