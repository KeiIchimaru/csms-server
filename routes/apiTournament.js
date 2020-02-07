const express = require('express');
const router = express.Router();
const { InternalServerError } = require(global.base_path+'/lib/error');

/* ************************************************************* *
   *                    API処理                             
   ************************************************************* */
// get viewTournamentEvent
router.get('/composition/tournamentEvent', (req, res, next) => {
  res.json(global.tournament.composition.tournament_event);
});
router.get('/management/day', (req, res, next) => {
  res.json({ day: global.tournament.management.day });
});
router.get('/management/subdivisions/:gender/:classification', (req, res, next) => {
  global.tournament.management.getParticipatingPlayer(
    global.tournament.management.day,
    req.params.gender,
    req.params.classification
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});

module.exports = router;
