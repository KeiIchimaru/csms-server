const {
  MEASUREMENT_TIME,
  MEASUREMENT_SCORE,
  setTournamentId,
} = require("../../lib/database/utils");
const { copyDict } = require("../../lib/utils");

async function _getTournament(conn) {
  let sql = 'SELECT * FROM viewTournament';
  const results = await conn.query(sql);
  return results[0];
}
async function _getTournamentEvent(conn) {
  let sql = 'SELECT * FROM viewTournamentEvent';
  const results = await conn.query(sql);
  return results;
}
async function _getEntryOrganization(conn) {
  let sql = 'SELECT * FROM viewEntryOrganization';
  const results = await conn.query(sql);
  return results;
}
async function _getEntryPlayer(conn) {
  let sql = 'SELECT * FROM viewEntryPlayer';
  const results = await conn.query(sql);
  return results;
}
async function _getTournamentEventResult(conn, tournamentId, playerId, eventId, classificationId) {
  let sql = 'SELECT * FROM tournament_event_result WHERE tournament_id = ? AND player_id = ? AND event_id = ? AND classification = ?';
  let params = [ tournamentId, playerId, eventId, classificationId ];
  const results = await conn.query(sql, params);
  return results;
}
async function _getParticipatingPlayers(conn, { gender, subdivision, group, bibs } = {}) {
  // 対象選手の抽出
  let sql = 'SELECT * FROM viewParticipatingPlayer WHERE s_gender = ?';
  let order = ' ORDER BY s_number ASC, c_number ASC, p_bibs ASC';
  let params = [ gender, ];
  if(!(subdivision === undefined) && subdivision) {
    sql += ' AND s_id = ?';
    params.push(subdivision);
  }
  if(!(group === undefined) && group) {
    sql += ' AND c_id = ?';
    params.push(group);    
  }
  if(!(bibs === undefined) && bibs) {
    sql += ' AND p_bibs = ?';
    params.push(bibs);    
  }
  sql += order;
  const participatingPlayers = await conn.query(sql, params);
  // 選手情報の取得
  let participatingPlayersBibs = [];
  participatingPlayers.forEach((row) => {
    participatingPlayersBibs.push(row.p_bibs);
  });
  sql = 'SELECT * FROM viewEntryPlayer WHERE gender = ? AND bibs in (?) ORDER BY player_id';
  params = [ gender, participatingPlayersBibs ];
  const entryPlayers = await conn.query(sql, params);
  // 現在の採点結果の取得
  let results = {};
  for(let i = 0; i < entryPlayers.length; i++) {
    let row = entryPlayers[i];
    sql = 'SELECT * FROM viewTournamentEventResult WHERE player_id = ? ORDER BY event_id';
    params = [ row.player_id, ];
    const eventResult = await conn.query(sql, params);
    scores = {};
    for(let j = 0; j < eventResult.length; j++) {
      scores[eventResult[j].event_id] = copyDict(eventResult[j]);
    }
    let data = copyDict(row);
    data['scores'] = scores;
    results[row.bibs] = data;
  };
  return results;
}

class Composition {
  static async getInstance(obj=null) {
    if(!obj) { obj = new Composition(); }
    let conn = await global.pool.getConnection();
    await setTournamentId(conn);
    obj._tournament = await _getTournament(conn);
    obj._tournament.notices = (obj._tournament.notices ? JSON.parse(obj._tournament.notices) : {});
    obj._tournament_event = await _getTournamentEvent(conn);
    obj._entry_organization = await _getEntryOrganization(conn);
    obj._entry_player = await _getEntryPlayer(conn);
    await global.pool.releaseConnection(conn);
    return obj;
  }
  // getter/setter
  get tournament() {
    return this._tournament;
  }
  get tournament_event() {
    return this._tournament_event;
  }
  get entry_organization() {
    return this._entry_organization;
  }
  get entry_player() {
    return this._entry_player;
  }
  get days() {
    return this._tournament.days;
  }
  // DBアクセスメソッド
  async getParticipatingPlayers({ gender, subdivision, group, bibs } = {}) {
    let conn = await global.pool.getConnection();
    await setTournamentId(conn);
    const results = await _getParticipatingPlayers(conn, { gender, subdivision, group, bibs });
    await global.pool.releaseConnection(conn);
    return results;
  }
  async registerTournamentEventResult(body) {
    let h = body.header;
    let conn = await global.pool.getConnection();
    const results = await _getTournamentEventResult(conn, this._tournament.id, h.player, h.event, h.classification);
    let sql;
    let params;
    let event_time =  (h.measurement == MEASUREMENT_TIME  ? body.input.score : null);
    let event_score = (h.measurement == MEASUREMENT_SCORE ? body.input.score : null);
    let remarks = null;
    if(results.length == 0) {
      sql = 'INSERT INTO tournament_event_result (\
        tournament_id,\
        player_id,\
        event_id,\
        classification,\
        gender,\
        bibs,\
        event_time,\
        event_score,\
        constitution,\
        remarks\
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      params = [
        this._tournament.id,
        h.player,
        h.event,
        h.classification,
        h.gender,
        h.bibs,
        event_time,
        event_score,
        JSON.stringify(body.input),
        remarks
      ];
    } else {
      sql = 'UPDATE tournament_event_result SET \
        bibs = ?,\
        event_time = ?,\
        event_score= ?,\
        constitution = ?,\
        remarks = ?\
       WHERE\
        tournament_id = ? AND\
        player_id = ? AND\
        event_id = ? AND\
        classification = ?\
      ';
      params = [
        h.bibs,
        event_time,
        event_score,
        JSON.stringify(body.input),
        remarks,
        this._tournament.id,
        h.player,
        h.event,
        h.classification
      ];
    }
    await conn.query(sql, params);
    await global.pool.releaseConnection(conn);
  }
  async confirmTournamentEventResult(address, user, body) {
    let h = body.header;
    let now = new Date();
    let conn = await global.pool.getConnection();
    let sql = '\
    UPDATE tournament_event_result SET \
      confirmed_user = ?,\
      confirmed_time = ?,\
      confirmed_device = ? \
    WHERE \
      tournament_id = ? AND\
      event_id = ? AND\
      classification = ? AND\
      player_id in (?) AND\
      (event_time is NOT null OR event_score is NOT null) AND\
      confirmed_user is null\
    ';
    let params = [
      user.id,
      now,
      address,
      this._tournament.id,
      h.event,
      h.classification,
      body.players
    ];
    await conn.query(sql, params);
    await global.pool.releaseConnection(conn);
  }
};

module.exports = Composition;