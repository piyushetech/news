const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const protectUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next(new AppError('Please log in.', 401));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'user') return next(new AppError('Unauthorized.', 403));
    req.user = decoded;
    next();
  } catch {
    next(new AppError('Invalid token.', 401));
  }
};

const protectAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next(new AppError('Admin login required.', 401));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return next(new AppError('Admin access only.', 403));
    req.admin = decoded;
    next();
  } catch {
    next(new AppError('Invalid admin token.', 401));
  }
};

const optionalUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'user') req.user = decoded;
    }
  } catch {
    /* ignore invalid token */
  }
  next();
};

module.exports = { signToken, protectUser, protectAdmin, optionalUser };
