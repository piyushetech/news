const Admin = require('../models/Admin');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { signToken } = require('../middleware/auth');

exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return next(new AppError('Invalid credentials.', 401));
  }
  const token = signToken({ id: admin._id, role: 'admin', email: admin.email });
  res.json({ status: 'success', data: { admin: { email: admin.email, name: admin.name }, token } });
});
