const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    avatar: String,
    fcmToken: String,
    subscribedCategories: { type: [String], default: [] },
    notificationCategories: { type: [String], default: [] },
    preferredLanguage: { type: String, default: 'en', trim: true },
    countryCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
