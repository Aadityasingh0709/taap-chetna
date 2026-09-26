// server/middleware/role.js
const asyncHandler = require('express-async-handler');

// authorize based on allowed roles array, e.g. ['MUNICIPAL_OFFICER']
const authorize = (allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  });

module.exports = { authorize };
