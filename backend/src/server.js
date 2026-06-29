require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./services/schedulerService');

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`BriefNews API running on port ${PORT}`);
  startScheduler();
});
