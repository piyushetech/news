const mongoose = require('mongoose');

const deepDiveSchema = new mongoose.Schema(
  {
    who: String,
    what: String,
    where: String,
    when: String,
    why: String,
    how: String,
  },
  { _id: false }
);

const newsSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true, trim: true, maxlength: 200 },
    paragraph: { type: String, required: true, trim: true, maxlength: 2000 },
    fullContent: { type: String, trim: true, maxlength: 5000 },
    category: { type: String, default: 'General', trim: true, index: true },
    language: { type: String, default: 'en', trim: true, index: true },
    country: { type: String, trim: true, index: true },
    source: { type: String, default: 'BriefNews', trim: true },
    originalLink: { type: String, trim: true },
    imageUrl: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isAutomated: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isControversial: { type: Boolean, default: false },
    isBreaking: { type: Boolean, default: false },
    region: { type: String, trim: true },
    city: { type: String, trim: true },
    topicTag: { type: String, trim: true, index: true },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    deepDive: deepDiveSchema,
    eli5Summary: String,
    biasLeft: String,
    biasRight: String,
    commentCount: { type: Number, default: 0 },
    biasedCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now },
    scrapedBy: { type: String, trim: true, default: 'node' },
    ai: {
      sentiment: String,
      sentimentScore: Number,
      qualityScore: Number,
      breakingScore: Number,
      clickbaitScore: Number,
      importanceScore: Number,
      spamScore: Number,
      modelVersion: String,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    translations: {
      type: Map,
      of: {
        heading: String,
        paragraph: String,
        fullContent: String,
      },
      default: {},
    },
  },
  { timestamps: true }
);

newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ isTrending: 1, status: 1 });
newsSchema.index({ city: 1, status: 1 });
newsSchema.index({ country: 1, status: 1, publishedAt: -1 });

module.exports = mongoose.model('News', newsSchema);
