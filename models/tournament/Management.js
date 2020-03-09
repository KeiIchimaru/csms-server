const {
  setTournamentId,
  CLASSIFICATION_INDIVIDUAL_EVENT,
  CLASSIFICATION_INDIVIDUAL_ALLROUND,
  CLASSIFICATION_TEAM_COMPETITION,
  CLASSIFICATION_TEAM_COMPETITION_30,
  MEASUREMENT_TIME,
  MEASUREMENT_SCORE
} = require("../../lib/database/utils");
const { round, isArray } = require("../../lib/utils");
const {
  InternalServerError,
  KeyError
} = require("../../lib/error");

async function _getParticipatingPlayerEventOrder(conn, day, gender, classification, event) {
  let sql = 'SELECT * FROM viewParticipatingPlayerEventOrder where s_acting_day = ? and s_gender = ? and s_classification = ? and a_event_id = ?';
  sql += ' order by s_number ASC, a_sequence ASC, c_number ASC, p_sequence ASC';
  let params = [ day, gender, classification, event ];
  const results = await conn.query(sql, params);
  return results;
}
async function _getTournamentEvents(conn, { gender, classification, event } = {}) {
  let sql_where = null;
  let params = [];
  if(!(gender === undefined) && gender) {
    sql_where = ' WHERE gender_id = ?';
    params.push(gender);
  }
  if(!(classification === undefined) && classification) {
    sql_where += (sql_where ? ' AND ' : ' WHERE ');
    sql_where += 'classification_id = ?'
    params.push(classification);
  }
  if(!(event === undefined) && event) {
    sql_where += (sql_where ? ' AND ' : ' WHERE ');
    if(isArray(event)) {
      sql_where += 'event_id IN (?)'
    } else {
      sql_where += 'event_id = ?'
    }
    params.push(event);
  }
  let sql = 'SELECT * FROM viewTournamentEvent' + (sql_where ? sql_where : '');
  sql += ' ORDER BY gender_id, classification_id, sequence';
  const results = await conn.query(sql, params);
  return results;
}
function _getEvent(tournamentEvents, event_id) {
  for(let j = 0; j < tournamentEvents.length; j++) {
    if(tournamentEvents[j].event_id == event_id) return tournamentEvents[j];
  }
  throw new InternalServerError(`Not fund event(${event_id})`);
}
// 個人種目別
async function _standingsIndividualEvent(conn, event) {
  const t = global.tournament.composition.tournament;
  // 現在のデータ削除
  let sql = 'DELETE FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ?';
  let params = [ t.id, CLASSIFICATION_INDIVIDUAL_EVENT, event.gender_id, event.event_id ];
  await conn.query(sql, params);
  // 採点結果の取得
  sql = 'SELECT * FROM tournament_event_result WHERE tournament_id = ? AND classification = ? AND gender = ? AND event_id = ?';
  params = [ t.id, event.classification_id, event.gender_id, event.event_id ];
  const results = await conn.query(sql, params);
  for(let j = 0; j < results.length; j++) {
    const row = results[j];
    sql = 'INSERT INTO standings(\
      tournament_id,\
      classification,\
      gender,\
      event,\
      player_or_organization_id,\
      constitution,';
    params = [row.tournament_id, CLASSIFICATION_INDIVIDUAL_EVENT, row.gender, row.event_id, row.player_id, row.constitution];
    switch(event.measurement) {
      case MEASUREMENT_TIME:
        sql += 'event_time';
        params.push(row.event_time);
        break;
      case MEASUREMENT_SCORE:
        sql += 'event_score';
        params.push(row.event_score);
        break;
      default:
        throw new InternalServerError(`Unsupported measurement(${event.measurement})`);
    }
    sql += ') VALUES (?, ?, ?, ?, ?, ?, ?)';
    await conn.query(sql, params);
  }
  // 順位の決定
  sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ?';
  switch(event.measurement) {
    case MEASUREMENT_TIME:
      sql += ' ORDER BY event_time DESC';
      break;
    case MEASUREMENT_SCORE:
      sql += ' ORDER BY event_score DESC';
      break;
  }
  params = [ t.id, CLASSIFICATION_INDIVIDUAL_EVENT, event.gender_id, event.event_id ];
  const standings = await conn.query(sql, params);
  let rank = 0;
  let old_value = null;
  let val;
  for(let j = 0; j < standings.length; j++) {
    const row = standings[j];
    switch(event.measurement) {
      case MEASUREMENT_TIME:
        val = row.event_time;
        break;
      case MEASUREMENT_SCORE:
        val = row.event_score;
        break;
      }  
    if(old_value == null || old_value != val) {
      rank = j + 1;
      old_value = val;
    }
    sql = 'UPDATE standings SET rank = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
    params = [ rank, row.tournament_id, row.classification, row.gender, row.event, row.player_or_organization_id ];
    await conn.query(sql, params);
  }
}
// 個人総合
async function _standingsIndividualAllRound(conn, { gender, classification, events } = {} ) {
  let event_time;
  let lowest_time;
  let event_score;
  let lowest_score;
  let constitution;
  function __initializePlayer() {
    event_time = null;
    lowest_time = null;
    event_score = null;
    lowest_score = null;
    constitution = {};
  }
  async function __insertStandings(params) {
    params[5] = round(params[5], 10**4);
    let sql = 'INSERT INTO standings(\
      tournament_id,\
      classification,\
      gender,\
      event,\
      player_or_organization_id,\
      event_score, lowest_score,\
      event_time, lowest_time,\
      constitution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    await conn.query(sql, params);  
  }
  const t = global.tournament.composition.tournament;
  // 現在のデータ削除
  let sql = 'DELETE FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  let params = [ t.id, classification, gender ];
  await conn.query(sql, params);
  // 競技情報の取得
  const tournamentEvents = await _getTournamentEvents(conn, gender, classification, events);
  // 採点結果の取得(個人種目別の処理が終わっていること)
  sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ? AND event IN (?)';
  sql += ' ORDER BY player_or_organization_id';
  params = [ t.id, CLASSIFICATION_INDIVIDUAL_EVENT, gender, events ];
  const results = await conn.query(sql, params);
  if(results.length > 0) {
    // 選手別総合得点の計算
    let player_id = results[0].player_or_organization_id;
    __initializePlayer();
    for(let j = 0; j < results.length; j++) {
      const row = results[j];
      if(player_id != row.player_or_organization_id) {
        params = [ t.id, classification, gender, 0, player_id, event_score, lowest_score, event_time, lowest_time, JSON.stringify(constitution) ];
        await __insertStandings(params);
        player_id = row.player_or_organization_id;
        __initializePlayer();
      }
      switch(_getEvent(tournamentEvents, row.event).measurement) {
        case MEASUREMENT_TIME:
          if(event_time == null) {
            event_time = lowest_time = row.event_time;
          } else {
            event_time += row.event_time;
            if(row.event_time > lowest_time) {
              lowest_time = row.event_time;
            }
          }        
          constitution[row.event] = [ row.event_time, row.rank ];
          break;
        case MEASUREMENT_SCORE:
          if(event_score == null) {
            event_score = lowest_score = row.event_score;
          } else {
            event_score += row.event_score;
            if(row.event_score < lowest_score) {
              lowest_score = row.event_score;
            }
          }
          constitution[row.event] = [ row.event_score, row.rank ];
          break;
        default:
          throw new InternalServerError(`Unsupported measurement(${_getEvent(tournamentEvents, row.event).measurement})`);
      }
    }
    params = [ t.id, classification, gender, 0, player_id, event_score, lowest_score, event_time, lowest_time, JSON.stringify(constitution) ];
    await __insertStandings(params);  
  }
  // 順位の決定
  sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  sql += ' ORDER BY event_time ASC, lowest_time DESC,  event_score DESC, lowest_score ASC';
  params = [ t.id, classification, gender ];
  const standings = await conn.query(sql, params);
  if(standings.length > 0) {
    let rank = 1;
    event_time = standings[0].event_time;
    lowest_time = standings[0].lowest_time;
    event_score = standings[0].event_score;
    lowest_score = standings[0].lowest_score;
    for(let j = 0; j < standings.length; j++) {
      const row = standings[j];
      if(event_time != row.event_time || lowest_time != row.lowest_time || event_score != row.event_score || lowest_score != row.lowest_score) {
        rank = j + 1;
        event_time = standings[j].event_time;
        lowest_time = standings[j].lowest_time;
        event_score = standings[j].event_score;
        lowest_score = standings[j].lowest_score;
      }
      sql = 'UPDATE standings SET rank = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
      params = [ rank, row.tournament_id, row.classification, row.gender, row.event, row.player_or_organization_id ];
      await conn.query(sql, params);
    }  
  }
}
// 団体総合
async function _standingsTeamCompetition(conn) {

  /*
    SELECT affiliation_organization_name, event_name, player_name, event_score 
    FROM viewStandingsIndividualEvent 
    WHERE gender_id = 1 AND entry_organization_type_id < 90 
    ORDER BY entry_organization_id, event_id, event_score DESC;
  */
}
// 団体総合(国体選出)
async function _standingsTeamCompetition30(conn) {

}
class Management {
  static async getInstance(obj=null) {
    if(!obj) { obj = new Management(); }
    obj._initialized = false;
    obj._day = 0;
    return obj;
  }
  // getter/setter
  get day() {
    return this._day;
  }
  set day(day) {
    this._initialized = true;
    this._day = day;
  }
  get isInitialized() {
    return this._initialized;
  }
  // DBアクセスメソッド
  async getParticipatingPlayerEventOrder(day, gender, classification, event) {
    let conn = await global.pool.getConnection();
    await setTournamentId(conn);
    const results = await _getParticipatingPlayerEventOrder(conn, day, gender, classification, event);
    await global.pool.releaseConnection(conn);
    return results;
  }
  // 順位表作成
  async standingsIndividualEvent({ gender, event } = {}) {
    const conn = await global.pool.getConnection();
    const t = global.tournament.composition.tournament;
    await setTournamentId(conn);
    // 対象競技の抽出
    // performance_type(1:個人総合から種目別、団体順位を決定)
    let classification = (t.performance_type == 1 ? CLASSIFICATION_INDIVIDUAL_ALLROUND : CLASSIFICATION_INDIVIDUAL_EVENT);
    const events = await _getTournamentEvents(conn, gender, classification, event);
    // 順位表作成
    for(let j = 0; j < events.length; j++) {
      await _standingsIndividualEvent(conn, events[j]);
    }
    await global.pool.releaseConnection(conn);  
  }
  async standingsIndividualAllRound({ gender } = {}) {
    let conn = await global.pool.getConnection();
    await setTournamentId(conn);
    // 対象競技の抽出
    const events = await _getTournamentEvents(conn, gender, CLASSIFICATION_INDIVIDUAL_ALLROUND);
    let target = [];
    if(events.length > 0) {
      let g = events[0].gender_id;
      let c = events[0].classification_id;
      let e = [];
      for(let j = 0; j < events.length; j++) {
        if(g != events[j].gender_id || c != events[j].classification_id) {
          target.push({ gender: g, classification: c, events: e });
          g = events[j].gender_id;
          c = events[j].classification_id;
          e = [];
        }
        e.push(events[j].event_id);
      }
      if(events.length > 0) {
        target.push({ gender: g, classification: c, events: e });
      }
    }
    for(let j = 0; j < target.length; j++) {
      await _standingsIndividualAllRound(conn, target[j]);
    }
    await global.pool.releaseConnection(conn);
  }
};

module.exports = Management;