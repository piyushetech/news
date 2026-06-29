const mongoose = require('mongoose');

const biasFeedbackSchema = new mongoose.Schema(
  {
    news: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['biased', 'balanced', 'neutral'], default: 'biased' },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

biasFeedbackSchema.index({ news: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('BiasFeedback', biasFeedbackSchema);
