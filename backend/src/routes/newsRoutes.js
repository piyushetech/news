const express = require('express');
const newsController = require('../controllers/newsController');
const engagementController = require('../controllers/engagementController');
const { protectUser, optionalUser } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', newsController.getCategories);
router.get('/languages', newsController.getLanguages);
router.get('/trending', newsController.getTrending);
router.get('/trending-topics', newsController.getTrendingTopics);
router.get('/topic', newsController.getTopicNews);
router.post('/topic/refresh', newsController.refreshTopicNews);
router.get('/local', newsController.getLocalNews);
router.post('/local/refresh', newsController.refreshLocalNews);
router.get('/country', newsController.getCountryNews);
router.get('/briefing', newsController.getMorningBriefing);
router.get('/for-me', protectUser, newsController.getNewsForMe);
router.post('/for-me/refresh', protectUser, newsController.refreshNewsForMe);
router.get('/', newsController.getNewsFeed);
router.get('/:id/comments', engagementController.getComments);
router.get('/:id/engagement', optionalUser, engagementController.getEngagement);
router.post('/:id/comments', protectUser, engagementController.addComment);
router.post('/:id/bias-feedback', protectUser, engagementController.submitBiasFeedback);
router.delete('/:id/bias-feedback', protectUser, engagementController.removeBiasFeedback);
router.get('/:id/deep-dive', newsController.getDeepDive);
router.get('/:id/eli5', newsController.getEli5);
router.get('/:id/bias', newsController.getBias);
router.get('/:id', newsController.getNewsById);

module.exports = router;
