const cron = require('node-cron');
const { log } = require('../utils/logger');
const { runScrape } = require('./scrapeOrchestrator');

let cronTask = null;

const runHourlyScrape = async () => {
  log.info('[CRON] Starting hourly news scrape…');
  try {
    const result = await runScrape({}, { triggeredBy: 'cron' });
    log.info(
      `[CRON] Done — created ${result.created}, skipped ${result.skipped}, engine ${result.engine}`
    );
    return result;
  } catch (err) {
    log.error('[CRON] Scrape failed:', err.message);
    throw err;
  }
};

const startScheduler = () => {
  if (process.env.CRON_ENABLED === 'false') {
    log.info('[CRON] Disabled (CRON_ENABLED=false)');
    return;
  }

  const schedule = process.env.CRON_SCHEDULE || '0 * * * *';

  if (!cron.validate(schedule)) {
    log.error('[CRON] Invalid CRON_SCHEDULE:', schedule);
    return;
  }

  cronTask = cron.schedule(schedule, () => {
    runHourlyScrape().catch(() => {});
  });

  log.info(`[CRON] Scheduled: ${schedule} (every hour at minute 0 by default)`);

  if (process.env.CRON_RUN_ON_START === 'true') {
    setTimeout(() => runHourlyScrape().catch(() => {}), 5000);
  }
};

const stopScheduler = () => {
  if (cronTask) cronTask.stop();
};

module.exports = { startScheduler, stopScheduler, runHourlyScrape };
