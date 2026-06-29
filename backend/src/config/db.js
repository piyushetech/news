const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL: MONGODB_URI is not set. Add it in Render → Environment.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

module.exports = connectDB;
