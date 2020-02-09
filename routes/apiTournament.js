const express = require('express');
const router = express.Router();
const { InternalServerError } = require(global.base_path+'/lib/error');

/* ************************************************************* *
   *                    API処理                             
   ************************************************************* */
// composition
router.get('/composition/tournamentEvent', (req, res, next) => {
  res.json(global.tournament.composition.tournament_event);
});
router.get('/composition/entryPlayer/bibs/:gender/:bibs', (req, res, next) => {
});
router.get('/composition/participatingPlayers/:gender/:subdivision', (req, res, next) => {
  global.tournament.composition.getParticipatingPlayers(
    parseInt(req.params.gender),
    parseInt(req.params.subdivision)
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});
router.get('/composition/participatingPlayers/:gender/:subdivision/:group', (req, res, next) => {
  global.tournament.composition.getParticipatingPlayers(
    parseInt(req.params.gender),
    parseInt(req.params.subdivision),
    parseInt(req.params.group)
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});

// management
router.get('/management/day', (req, res, next) => {
  res.json({ day: global.tournament.management.day });
});
router.get('/management/subdivisions/:gender/:classification/:event', (req, res, next) => {
  global.tournament.management.getParticipatingPlayerEventOrder(
    global.tournament.management.day,
    parseInt(req.params.gender),
    parseInt(req.params.classification),
    parseInt(req.params.event)
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});

module.exports = router;
