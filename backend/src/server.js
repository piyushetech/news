require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startScheduler } = require('./services/schedulerService');

const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`BriefNews API running on port ${PORT}`);
    startScheduler();
  });
};

start().catch((err) => {
  console.error('Failed to start API:', err.message);
  process.exit(1);
});
