var express = require('express');
var router = express.Router();
var passport = require('passport');

const base = 'account';
const redirect = {
  login: '/account/login',
  logout: '/account/logout',
  success_admin: '/admin',
  success_user: '/scoring',
  permissiom_error: '/'
}

router.get('/login', (req, res, next) => {
  const parms = {
    title: 'Login',
    error: req.flash('error'),
    username: req.flash('username')
  }
  res.render(base+'/login', parms);
});

router.get('/logout', (req, res, next) => {
  // 未ログインの場合は何もせずに/loginにリダイレクト
  if (!req.user) {
    res.redirect(redirect.login);
    return;
  }
  // ログイン済みの場合はセッションを破棄してから/loginにリダイレクト
  req.logout(); // for Passport
  req.session.destroy((err) => {
    if (err) { return next(err); }
    res.redirect(redirect.login);
  });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', function(err, user, info) {
    if(err){ return next(err); }
    if(!user){
      req.flash('error', info.message);
      req.flash('username', req.body.username);
      return res.redirect(redirect.login)
    }
    // req.isAuthenticatedを有効にする
    req.login(user, function(error) {
      if (error) return next(error);
      if (user.isAdmin()) {
        return res.redirect(redirect.success_admin);
      }else{
        return res.redirect(redirect.success_user);
      }
    });
  })(req, res, next);
});

module.exports = {
  router: router,
  redirect: redirect
};
