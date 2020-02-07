const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { AuthenticateError } = require('../error');
const TUser = require(global.base_path+'/models/core/TUser');

module.exports.setupPassport = (app) => {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy((username, password, done) => {
    // ここで username と password を確認して結果を返す
    TUser.isAuthenticated(username, password).then(rc => {
      if(rc){
        TUser.getInstance(username).then(user => {
            return done(null, user);
        });
      }else{
        return done(null, false, { message: 'ユーザーID又はパスワードが正しくありません。' });
      }
    });
  }));
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser((id, done) => {
    TUser.getInstance(id).then(user => {
      done(null, user);
    });
  });
}
module.exports.isAdminAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {  // 認証済
    if (req.user.isAdmin()){
      return next();
    }
  }
  // 認証されていない
  throw new AuthenticateError();
}
module.exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {  // 認証済
    return next();
  }
  // 認証されていない
  throw new AuthenticateError();
}
