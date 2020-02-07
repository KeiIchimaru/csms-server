const express = require('express');
const router = express.Router();

const accountUtils = require(global.base_path+'/lib/account/utils');
const { SystemInitializeError, SystemBeforeOpeningError } = require(global.base_path+'/lib/error');

const apiTournamentRouter = require('./apiTournament');

router.all('*', accountUtils.isAuthenticated, (req, res, next) => {
    if(global.tournament.management){
      // 管理者による初期設定が完了しているかチェックする。
      if(global.tournament.management.isInitialized){
        return next();
      }else{
        throw new SystemBeforeOpeningError();
      }
    } else {
        throw new SystemInitializeError();
    }
});
router.use('/tournament', apiTournamentRouter);

module.exports = router;
