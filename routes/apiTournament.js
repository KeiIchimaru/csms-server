const express = require('express');
const router = express.Router();
const { InternalServerError } = require(global.base_path+'/lib/error');

/* ************************************************************* *
   *                    API処理                             
   ************************************************************* */
// composition
router.get('/composition/tournament', (req, res, next) => {
  let t = global.tournament.composition.tournament;
  res.json({
    performanceType: t.performance_type,
    bibsType: t.bibs_type,
    notices: JSON.parse(t.notices)
  });
});
router.get('/composition/tournamentEvent', (req, res, next) => {
  res.json(global.tournament.composition.tournament_event);
});
router.get('/composition/participatingPlayers/:gender', (req, res, next) => {
  global.tournament.composition.getParticipatingPlayers({
    gender: parseInt(req.params.gender),
  }
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});
router.get('/composition/participatingPlayers/:gender/:subdivision', (req, res, next) => {
  global.tournament.composition.getParticipatingPlayers({
    gender: parseInt(req.params.gender),
    subdivision: parseInt(req.params.subdivision)
  }
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});
router.get('/composition/participatingPlayers/:gender/:subdivision/:group', (req, res, next) => {
  global.tournament.composition.getParticipatingPlayers({
    gender: parseInt(req.params.gender),
    group: parseInt(req.params.group)

  }
  ).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});
router.get('/composition/participatingPlayers/:gender/:subdivision/:group/:bibs', (req, res, next) => {
  global.tournament.composition.getParticipatingPlayers({
    gender: parseInt(req.params.gender),
    bibs: parseInt(req.params.bibs)
  }).then(results => {
    res.json(results);
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});
router.post('/composition/result/register', (req, res, next) => {
  global.tournament.composition.registerTournamentEventResult(req.body)
  .then(() => {
    res.status(200).send('OK');
  }).catch(err => {
    console.log(req.originalUrl, err.name == InternalServerError.name ? err : err.message);
    // ここでレスポンスを返さないとUnhandledPromiseRejectionWarningとなります。
    res.status(err.status || 500).json({ error: err.message });
  });
});
router.post('/composition/result/confirm', (req, res, next) => {
  global.tournament.composition.confirmTournamentEventResult(req._remoteAddress, req.user, req.body)
  .then(() => {
    res.status(200).send('OK');
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
