const Comment = require('../models/Comment');
const BiasFeedback = require('../models/BiasFeedback');
const News = require('../models/News');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getComments = catchAsync(async (req, res, next) => {
  const news = await News.findById(req.params.id);
  if (!news) return next(new AppError('News not found.', 404));

  const comments = await Comment.find({ news: news._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('userName text createdAt');

  res.json({ status: 'success', data: comments });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  if (!text?.trim()) return next(new AppError('Comment text is required.', 400));

  const news = await News.findOne({ _id: req.params.id, status: 'approved', isPublished: true });
  if (!news) return next(new AppError('News not found.', 404));

  const userDoc = await User.findById(req.user.id).select('name');
  const comment = await Comment.create({
    news: news._id,
    user: req.user.id,
    userName: userDoc?.name || 'Reader',
    text: text.trim(),
  });

  news.commentCount = (news.commentCount || 0) + 1;
  await news.save({ validateBeforeSave: false });

  res.status(201).json({ status: 'success', data: comment });
});

exports.submitBiasFeedback = catchAsync(async (req, res, next) => {
  const { type = 'biased', note } = req.body;
  const news = await News.findOne({ _id: req.params.id, status: 'approved', isPublished: true });
  if (!news) return next(new AppError('News not found.', 404));

  const existing = await BiasFeedback.findOne({ news: news._id, user: req.user.id });
  if (existing) {
    return res.json({
      status: 'success',
      message: 'You already marked this story.',
      data: { biasedCount: news.biasedCount, userMarked: true },
    });
  }

  await BiasFeedback.create({
    news: news._id,
    user: req.user.id,
    type,
    note: note?.trim(),
  });

  if (type === 'biased') {
    news.biasedCount = (news.biasedCount || 0) + 1;
    await news.save({ validateBeforeSave: false });
  }

  res.json({
    status: 'success',
    message: 'Thanks for your feedback.',
    data: { biasedCount: news.biasedCount, userMarked: true },
  });
});

exports.removeBiasFeedback = catchAsync(async (req, res, next) => {
  const news = await News.findOne({ _id: req.params.id, status: 'approved', isPublished: true });
  if (!news) return next(new AppError('News not found.', 404));

  const existing = await BiasFeedback.findOne({ news: news._id, user: req.user.id });
  if (!existing) {
    return res.json({
      status: 'success',
      data: { biasedCount: news.biasedCount || 0, userMarked: false },
    });
  }

  await BiasFeedback.deleteOne({ _id: existing._id });

  if (existing.type === 'biased') {
    news.biasedCount = Math.max(0, (news.biasedCount || 0) - 1);
    await news.save({ validateBeforeSave: false });
  }

  res.json({
    status: 'success',
    message: 'Your flag was removed.',
    data: { biasedCount: news.biasedCount || 0, userMarked: false },
  });
});

exports.getEngagement = catchAsync(async (req, res, next) => {
  const news = await News.findOne({ _id: req.params.id, status: 'approved', isPublished: true });
  if (!news) return next(new AppError('News not found.', 404));

  let userMarked = false;
  if (req.user?.id) {
    userMarked = !!(await BiasFeedback.exists({ news: news._id, user: req.user.id }));
  }

  res.json({
    status: 'success',
    data: {
      commentCount: news.commentCount || 0,
      biasedCount: news.biasedCount || 0,
      userMarked,
    },
  });
});
