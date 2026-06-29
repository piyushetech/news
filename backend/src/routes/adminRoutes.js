const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');
const newsController = require('../controllers/newsController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', adminAuthController.adminLogin);
router.get('/stats', protectAdmin, newsController.getStats);
router.get('/news', protectAdmin, newsController.adminGetAll);
router.get('/news/pending', protectAdmin, newsController.adminGetPending);
router.get('/scrape-options', protectAdmin, newsController.getScrapeOptions);
router.get('/system-health', protectAdmin, newsController.getSystemHealth);
router.post('/news/scrape', protectAdmin, newsController.scrapeNews);
router.post('/news/scrape/cron', protectAdmin, newsController.triggerCronScrape);
router.get('/scraper-jobs', protectAdmin, newsController.getScraperJobs);
router.post('/news', protectAdmin, newsController.createNews);
router.patch('/news/:id/approve', protectAdmin, newsController.approveNews);
router.patch('/news/:id/reject', protectAdmin, newsController.rejectNews);
router.patch('/news/:id', protectAdmin, newsController.updateNews);
router.delete('/news/:id', protectAdmin, newsController.deleteNews);

module.exports = router;
