module.exports = (req, res, next) => {
  if (!req.user || !req.user.organizationId) {
    return res.status(401).json({ error: 'Unauthorized: missing organization scope' });
  }
  req.orgId = req.user.organizationId;
  next();
};
