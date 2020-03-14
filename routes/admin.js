const express = require('express');
const router = express.Router();
const {
  fmtDateYMDHMS,
  internalServerError
} = require(global.base_path+'/lib/utils');
const controllerUtils = require(global.base_path+'/lib/controller/utils');
const accountUtils = require(global.base_path+'/lib/account/utils');
const { SystemInitializeError } = require(global.base_path+'/lib/error');

const base = 'admin';
const SelectDay = require(global.base_path+'/controllers/admin/selectDay');

// 運営管理メニュー
const renderMenu = (req, res) => {
  res.render(base+'/index', { title: '運営管理メニュー', error: req.flash('error'), message: req.flash('message') });
}
// 管理者でログインしているかを全ての要求に対してチェックする。
router.all('*', accountUtils.isAdminAuthenticated, (req, res, next) => {
  if(global.tournament.management){
    // 管理者による初期設定が完了しているかチェックする。
    if(global.tournament.management.isInitialized){
      return next();
    }else{
      // 管理者による初期設定中
      if(req.path == SelectDay.inputViewName() || req.path == SelectDay.confirmViewName()) {
        return next();
      }
      // 管理者による初期設定画面の表示
      const selectDay = new SelectDay();
      let viewName = SelectDay.inputViewName();
      controllerUtils.deleteValues(req, viewName);
      res.render(base+viewName, selectDay.locals);
    }
  } else {
    throw new SystemInitializeError();
  }
});

/* ************************************************************* *
   *                    運営管理メニュー                             
   ************************************************************* */
router.get('/', (req, res, next) => {
  renderMenu(req, res);
});
router.get('/standingsIndividualEvent', (req, res, next) => {
  global.tournament.management.standingsIndividualEvent()
  .then(() => {
    let now = new Date();
    req.flash('message', `個人種目別順位作成が終了しました。 at ${fmtDateYMDHMS(now)}`);
    renderMenu(req, res);
  }, (error) => {
    next(internalServerError(error));
  });
});
router.get('/standingsIndividualAllRound', (req, res, next) => {
  global.tournament.management.standingsIndividualAllRound()
  .then(() => {
    let now = new Date();
    req.flash('message', `個人総合順位作成が終了しました。 at ${fmtDateYMDHMS(now)}`);
    renderMenu(req, res);    
  }, (error) => {
    next(internalServerError(error));
  });
});
router.get('/standingsTeamCompetition', (req, res, next) => {
  global.tournament.management.standingsTeamCompetition()
  .then(() => {
    let now = new Date();
    req.flash('message', `団体総合(4種目)順位作成が終了しました。 at ${fmtDateYMDHMS(now)}`);
    renderMenu(req, res);    
  }, (error) => {
    next(internalServerError(error));
  });
});
router.get('/standingsTeamCompetition30', (req, res, next) => {
  global.tournament.management.standingsTeamCompetition30()
  .then(() => {
    let now = new Date();
    req.flash('message', `団体総合(3種目)順位作成が終了しました。 at ${fmtDateYMDHMS(now)}`);
    renderMenu(req, res);    
  }, (error) => {
    next(internalServerError(error));
  });
});
router.get('/standingsExcludingTop3Teams', (req, res, next) => {
  global.tournament.management.standingsExcludingTop3Teams()
  .then(() => {
    let now = new Date();
    req.flash('message', `団体総合(3種目)上位３チーム所属者を除く個人順位の作成が終了しました。 at ${fmtDateYMDHMS(now)}`);
    renderMenu(req, res);
  }, (error) => {
    next(internalServerError(error));
  });
});


/* ************************************************************* *
   *                    競技日選択処理                             
   ************************************************************* */
// データ入力チェック
router.post(SelectDay.inputViewName(), (req, res, next) => {
  const selectDay = new SelectDay(req);
  if(!selectDay.check()){
    res.render(base+SelectDay.inputViewName(), selectDay.locals);
    return;
  }
  res.render(base+SelectDay.confirmViewName(), selectDay.locals);
});
// 確認画面=>戻る
router.get(SelectDay.inputViewName(), (req, res, next) => {
  const selectDay = new SelectDay(req);
  res.render(base+SelectDay.inputViewName(), selectDay.locals);
});
// 入力データ確認
router.post(SelectDay.confirmViewName(), (req, res, next) => {
  const selectDay = new SelectDay(req);
  selectDay.confirm();
  renderMenu(req, res);
});

module.exports = router;
