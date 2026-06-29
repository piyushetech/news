const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { signToken } = require('../middleware/auth');
const { verifyGoogleToken } = require('../services/googleAuth');
const { CATEGORY_IDS } = require('../constants/categories');
const { LANGUAGE_CODES } = require('../constants/languages');
exports.googleLogin = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) return next(new AppError('Google ID token required.', 400));

  let profile;
  try {
    profile = await verifyGoogleToken(idToken);
  } catch (err) {
    return next(new AppError(err.message || 'Google authentication failed.', 401));
  }

  let user = await User.findOne({ googleId: profile.googleId });
  if (!user) {
    user = await User.create(profile);
  } else {
    user.name = profile.name;
    user.avatar = profile.avatar;
    await user.save();
  }

  const token = signToken({ id: user._id, role: 'user', email: user.email });

  res.json({
    status: 'success',
    data: { user, token },
  });
});

exports.updateFcmToken = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));
  user.fcmToken = req.body.fcmToken;
  await user.save();
  res.json({ status: 'success', message: 'FCM token updated.' });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.json({ status: 'success', data: user.toObject({ virtuals: true }) });
});

exports.updatePreferences = catchAsync(async (req, res, next) => {
  const { subscribedCategories, notificationCategories, preferredLanguage, countryCode } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  if (Array.isArray(subscribedCategories)) {
    const valid = subscribedCategories.filter((c) => CATEGORY_IDS.includes(c));
    if (!valid.length) return next(new AppError('Pick at least one category.', 400));
    user.subscribedCategories = valid;
    user.markModified('subscribedCategories');
  }

  if (Array.isArray(notificationCategories)) {
    const validNotify = notificationCategories.filter((c) => CATEGORY_IDS.includes(c));
    user.notificationCategories = validNotify;
    user.markModified('notificationCategories');
  }

  if (preferredLanguage && LANGUAGE_CODES.includes(preferredLanguage)) {
    user.preferredLanguage = preferredLanguage;
  }

  if (countryCode && typeof countryCode === 'string') {
    user.countryCode = countryCode.toUpperCase().slice(0, 3);
  }

  await user.save();

  const fresh = await User.findById(user._id);
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.json({
    status: 'success',
    data: fresh.toObject({ virtuals: true }),
  });
});
