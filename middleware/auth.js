function isAuth(req, res, next) {
  if (!req.session?.authenticated) return res.redirect("/login");
  next();
}

module.exports = { isAuth };
