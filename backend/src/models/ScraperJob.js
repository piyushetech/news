const mongoose = require('mongoose');

const scraperJobSchema = new mongoose.Schema(
  {
    triggeredBy: {
      type: String,
      enum: ['manual', 'cron', 'user_refresh', 'admin'],
      default: 'manual',
    },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    feedsMatched: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    jobErrors: [String],
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

scraperJobSchema.index({ createdAt: -1 });
scraperJobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ScraperJob', scraperJobSchema);
