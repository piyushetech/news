let firebaseAdmin = null;

const initFirebase = () => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) return;
    const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    if (!key.includes('BEGIN PRIVATE KEY')) return;
    firebaseAdmin = require('firebase-admin');
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: key,
        }),
      });
    }
  } catch (err) {
    console.warn('FCM not configured:', err.message);
  }
};

const sendNewsNotification = async (heading) => {
  if (!firebaseAdmin) {
    console.log(`[DEV NOTIFICATION] New story: ${heading}`);
    return;
  }
  try {
    await firebaseAdmin.messaging().send({
      topic: 'all-users',
      notification: {
        title: '📰 New Story',
        body: heading,
      },
      data: { type: 'new_news' },
    });
  } catch (err) {
    console.warn('FCM broadcast failed:', err.message);
  }
};

const sendToUser = async (fcmToken, heading, category, isBreaking = false) => {
  if (!firebaseAdmin || !fcmToken) {
    console.log(`[DEV NOTIFICATION] ${category}: ${heading}`);
    return;
  }
  try {
    await firebaseAdmin.messaging().send({
      token: fcmToken,
      notification: {
        title: isBreaking ? `🚨 Breaking · ${category}` : category ? `📰 ${category}` : '📰 New Story',
        body: heading,
      },
      data: { type: isBreaking ? 'breaking_news' : 'new_news', category: category || '' },
    });
  } catch (err) {
    console.warn('FCM user send failed:', err.message);
  }
};

const sendCategoryNewsNotification = async (news) => {
  const User = require('../models/User');
  const category = news.category || 'General';

  const users = await User.find({
    fcmToken: { $exists: true, $ne: '' },
    $or: [
      { notificationCategories: category },
      {
        notificationCategories: { $size: 0 },
        subscribedCategories: category,
      },
    ],
  }).select('fcmToken notificationCategories subscribedCategories');

  if (!users.length) {
    console.log(`[DEV NOTIFICATION] ${category}: ${news.heading} (no subscribed users)`);
    return { sent: 0 };
  }

  let sent = 0;
  await Promise.all(
    users.map(async (user) => {
      const notifyCats = user.notificationCategories?.length
        ? user.notificationCategories
        : user.subscribedCategories;
      if (!notifyCats.includes(category)) return;
      await sendToUser(user.fcmToken, news.heading, category, news.isBreaking);
      sent += 1;
    })
  );

  return { sent };
};

initFirebase();

module.exports = { sendNewsNotification, sendToUser, sendCategoryNewsNotification };
