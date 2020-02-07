const express = require('express');
const csurf = require('csurf');
const router = express.Router();

const redirect = require('./account').redirect

const accountRouter = require('./account').router;
const apiRouter = require('./api');
const adminRouter = require('./admin');
const scoringRouter = require('./scoring');

// csurf setup (token secretをsessionに保存する)
router.use(csurf({
  cookie: false,
}));

// 全ての要求に対して、応答時CSRF対策トークン & tournamentを入れる
router.use((req, res, next) => {
  const locals = res.locals;
  locals.csrfToken = req.csrfToken();
  let tournament = global.tournament.composition.tournament;
  locals.tournament = {
    name: tournament.name,
    period_from: tournament.period_from,
    period_to: tournament.period_to,
    days: tournament.days
  };
  return next();
});

// -------- 認証チェックが不要なルーティング設定 ここから -------- //
// JSON形式でcsrfTokenを返す（api呼び出し用）
router.get('/csrf-token', (req, res) => {
  res.json({ token: res.locals.csrfToken });
});

// 静的ファイルのルーティング express.static(root, [options])
router.use(express.static('public'));

// APIのルーティング
router.use('/api', apiRouter);

/* GET home page. */
router.get('/', (req, res, next) => {
  // 未ログインの場合は、何もせずに/loginにリダイレクト
  if (!req.user) {
    res.redirect(redirect.login);
    return;
  }
  // ログイン済みの場合は、それぞれのトップページにリダイレクト
  if (req.user.isAdmin()) {
    return res.redirect(redirect.success_admin);
  }else{
    return res.redirect(redirect.success_user);
  }
});
// ログイン・ログアウト
router.get('/login', (req, res, next) => {
  res.redirect(redirect.login)
});

router.get('/logout', (req, res, next) => {
  var now = new Date();
  console.log(`logout at ${ now.toLocaleString()}`);
  res.redirect(redirect.logout)
});
// ルーティング
router.use('/account', accountRouter);
// -------- 認証チェックが不要なルーティング設定 ここまで -------- //

// -------- 認証チェックが必要なルーティング設定 ここから -------- //
router.use('/admin', adminRouter);
router.use('/scoring', scoringRouter);
// -------- 認証チェックが必要なルーティング設定 ここまで -------- //

module.exports = router;
