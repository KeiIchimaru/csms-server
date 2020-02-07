const express = require('express');
const router = express.Router();

const accountUtils = require(global.base_path+'/lib/account/utils');
const { SystemInitializeError } = require(global.base_path+'/lib/error');

const base = 'scoring';

/* GET home page. */
router.all('*', accountUtils.isAuthenticated, (req, res, next) => {
  if(global.tournament.management){
    if(global.tournament.management.isInitialized){
      res.render(base+'/index', { title: '採点登録' });
    }else{
      res.render('index', { title: 'システムオープン前' });
    }
  }else{
    throw new SystemInitializeError();
  }
});

module.exports = router;
