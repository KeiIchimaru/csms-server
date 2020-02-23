const express = require('express');
const flash = require('connect-flash');
const path = require('path');
const logger = require('morgan');
const conf = require('config');
const createError = require('http-errors');

const app = express();

global.base_path = __dirname;
const { InternalServerError } = require(global.base_path+'/lib/error');

// mysql setup
const db = require('./lib/database/utils')
const Composition = require('./models/tournament/Composition');
const Management = require('./models/tournament/Management');
db.getPool().then(pool => {
  global.pool = pool;
  console.log('Server got a connection pool now.');
  return Composition.getInstance();
}).then(composition => {
  global.tournament = { composition };
  return Management.getInstance();
}).then(management => {
  global.tournament.management = management;
  if(global.tournament.composition.days == 2){
    global.tournament.management.day = 2;
  }
  // Express-session setup
  const cookieParser = require('cookie-parser');
  const session = require('express-session');
  app.use(session({
    secret: conf.cookieSecret,                 // クッキーIDを暗号化
    resave: false,
    saveUninitialized: false,
    cookie:{
      httpOnly: true,                          // クライアント側でクッキー値を秘匿
      secure: conf.cookieSecure,               // http通信
      maxage: 1000 * 60 * conf.cookieMaxage    // セッションの消滅時間(分)
    }
  })); 

  // passport setup
  var accountUtils = require('./lib/account/utils');
  accountUtils.setupPassport(app);

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(flash());

  // ------ routing ------ //
  app.use('/', require('./routes'));

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    next(createError.NotFound());
  });

  // error handler
  app.use((err, req, res, next) => {
    if(!err.status || (err.status && err.status != 404)) { // NotFoundError
      console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);  
    }
    if(!req.originalUrl.indexOf('/api')){
      res.status(err.status || 500).json({ error: err.message });
      return;
    }
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });
  console.log('App initialize end.');
});

module.exports = app;
