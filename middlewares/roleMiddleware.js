// Restrict access to certain roles (e.g., admin, superadmin)
export const adminOnly = (roles = ['superadmin']) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user found' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Insufficient role' });
  }

  next();
};
