const {
  setTournamentId,
  KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION,
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
  let sql_where = '';
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
  let sql = 'SELECT * FROM viewTournamentEvent' + sql_where;
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
async function _insertStandings(conn, params) {
  if(params[5] != null) params[5] = round(params[5], 10**4);
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
async function _standingsIndividualEventRank(conn, standings, sql) {
  let rank = 1;
  let event_time = standings[0].event_time;
  let event_score = standings[0].event_score;
  for(let j = 0; j < standings.length; j++) {
    const row = standings[j];
    if(row.event_time != null || row.event_score != null) {
      if(event_time != row.event_time || event_score != row.event_score) {
        rank = j + 1;
        event_time = standings[j].event_time;
        event_score = standings[j].event_score;
      }
      params = [ rank, row.tournament_id, row.classification, row.gender, row.event, row.player_or_organization_id ];
      await conn.query(sql, params);
    }
  }  

}
async function _standingsIndividualAllRoundRank(conn, standings, sql) {
  let rank = 1;
  let event_time = standings[0].event_time;
  let lowest_time = standings[0].lowest_time;
  let event_score = standings[0].event_score;
  let lowest_score = standings[0].lowest_score;
  for(let j = 0; j < standings.length; j++) {
    const row = standings[j];
    if(row.event_time != null || row.event_score != null) {
      if(event_time != row.event_time || lowest_time != row.lowest_time || event_score != row.event_score || lowest_score != row.lowest_score) {
        rank = j + 1;
        event_time = standings[j].event_time;
        lowest_time = standings[j].lowest_time;
        event_score = standings[j].event_score;
        lowest_score = standings[j].lowest_score;
      }
      params = [ rank, row.tournament_id, row.classification, row.gender, row.event, row.player_or_organization_id ];
      await conn.query(sql, params);
    }
  }  
}
/***************************************************************************
  個人種目別順位
****************************************************************************/
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
  sql += ' ORDER BY event_time ASC, event_score DESC';
  params = [ t.id, CLASSIFICATION_INDIVIDUAL_EVENT, event.gender_id, event.event_id ];
  const standings = await conn.query(sql, params);
  if(standings.length > 0) {
    sql = 'UPDATE standings SET rank = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
    await _standingsIndividualEventRank(conn, standings, sql);
  }
}
/***************************************************************************
  個人総合順位
****************************************************************************/
async function _standingsIndividualAllRound(conn, { gender, classification, events } = {} ) {
  const t = global.tournament.composition.tournament;
  // 現在のデータ削除
  let sql = 'DELETE FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  let params = [ t.id, CLASSIFICATION_INDIVIDUAL_ALLROUND, gender ];
  await conn.query(sql, params);
  // 競技情報の取得
  const tournamentEvents = await _getTournamentEvents(conn, { gender, classification, event: events });
  // 採点結果の取得
  if(t.performance_type == KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION) {
    sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ? AND event IN (?)';
    sql += ' ORDER BY player_or_organization_id';
    params = [ t.id, CLASSIFICATION_INDIVIDUAL_EVENT, gender, events ];  
  } else {
    sql = 'SELECT \
      tournament_id,\
      classification,\
      gender,\
      event_id AS event,\
      player_id AS player_or_organization_id,\
      event_score,\
      event_time\
      FROM tournament_event_result WHERE tournament_id = ? AND classification = ? AND gender = ? AND event_id IN (?)';
    sql += ' ORDER BY player_id';
    params = [ t.id, classification, gender, events ];  
  }
  const results = await conn.query(sql, params);
  if(results.length > 0) {
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
    // 選手別総合得点の計算
    let player_id = results[0].player_or_organization_id;
    __initializePlayer();
    for(let j = 0; j < results.length; j++) {
      const row = results[j];
      if(player_id != row.player_or_organization_id) {
        params = [ t.id, classification, gender, 0, player_id, event_score, lowest_score, event_time, lowest_time, JSON.stringify(constitution) ];
        await _insertStandings(conn, params);
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
          constitution[row.event] = [ row.event_time, row.rank ? row.rank : null ];
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
          constitution[row.event] = [ row.event_score, row.rank ? row.rank : null ];
          break;
        default:
          throw new InternalServerError(`Unsupported measurement(${_getEvent(tournamentEvents, row.event).measurement})`);
      }
    }
    params = [
      t.id,
      CLASSIFICATION_INDIVIDUAL_ALLROUND,
      gender,
      0,
      player_id,
      event_score,
      lowest_score,
      event_time,
      lowest_time,
      JSON.stringify(constitution)
    ];
    await _insertStandings(conn, params);  
  }
  // 順位の決定
  sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  sql += ' ORDER BY event_time ASC, lowest_time DESC,  event_score DESC, lowest_score ASC';
  params = [ t.id, CLASSIFICATION_INDIVIDUAL_ALLROUND, gender ];
  const standings = await conn.query(sql, params);
  if(standings.length > 0) {
    sql = 'UPDATE standings SET rank = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
    await _standingsIndividualAllRoundRank(conn, standings, sql);
  }
}
/***************************************************************************
  団体総合順位
****************************************************************************/
async function _standingsTeamCompetition(conn, classification, gender, events) {
  const t = global.tournament.composition.tournament;
  // 現在のデータ削除
  let sql = 'DELETE FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  let params = [ t.id, classification, gender ];
  await conn.query(sql, params);
  // 競技情報の取得
  let c;
  switch(t.performance_type) {
    case KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION:
      c = CLASSIFICATION_INDIVIDUAL_ALLROUND;
      break;
    default:
      c = CLASSIFICATION_TEAM_COMPETITION;
  }
  const tournamentEvents = await _getTournamentEvents(conn, { gender, classification: c, event: events });
  if(tournamentEvents.length != events.length) {
    throw new InternalServerError(`Some event do not exist in tournament_event. (gender:${gender}, classification:${c}, event:${events})`);
  }
  // 採点結果の取得
  if(t.performance_type == KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION) {
    sql = 'SELECT * FROM viewStandingsIndividualEvent WHERE gender_id = ? AND entry_organization_type_id < 90 AND event_id IN (?)';
    sql += ' ORDER BY entry_organization_id ASC, event_id ASC, event_score DESC, event_time ASC';
    params = [ gender, events ];
  } else {
    sql = '';
    params = [];
  }
  const results = await conn.query(sql, params);
  if(results.length > 0) {
    // 団体別総合得点の計算
    let entry_organization_id;
    let event_score;
    let event_time;
    let event_players;
    let numbers;
    let team_score;
    let team_lowest_score;
    let team_time;
    let team_lowest_time;
    let constitution;
    function __initializeOrganization() {
      event_score = null;
      event_time = null;
      event_players = {};
      numbers = {};
      team_score = null;
      team_lowest_score = null;
      team_time = null;
      team_lowest_time = null;
    }
    async function __insertStandingsTeamCompetition() {
      let check = true;
      // 全ての競技で演技を行なっていること
      for (let j = 0; j < tournamentEvents.length; j++) {
        if(!numbers[tournamentEvents[j].event_id]) {
          check = false;
          console.log(`tournamentEvents check error (organization:${entry_organization_id}, event:${tournamentEvents[j].event_id})`);
          break;
        }
      }
      // 全ての競技で団体規程人数の選手が演技を行なっていること
      for (let key in numbers) {
        if(numbers[key] <  t.notices.minimumNumberOfOrganization) {
          check = false;
          console.log(`minimumNumberOfOrganization check error (organization:${entry_organization_id}, event:${key})`);
          break;
        }
      }
      if(check) {
        if(event_score && Object.keys(event_score).length > 0) {
          for (let key in event_score) {
            team_score = (team_score ? team_score : 0) + event_score[key];
            if(team_lowest_score == null || team_lowest_score > event_score[key]) {
              team_lowest_score = event_score[key];
            }
          }
          team_score = round(team_score, 10**4);
          team_lowest_score = round(team_lowest_score, 10**4);
        }
        if(event_time && Object.keys(event_time).length > 0) {
          for (let key in event_time) {
            team_time = (team_time ? team_time : 0) + event_time[key];
            if(team_lowest_time == null || team_lowest_time < event_time[key]) {
              team_lowest_time = event_time[key];
            }
          }
        }
      }
      constitution = { numbers, event_score, event_time, event_players };
      params = [ t.id, classification, gender, 0, entry_organization_id, team_score, team_lowest_score, team_time, team_lowest_time, JSON.stringify(constitution) ];
      await _insertStandings(conn, params);
    }
    __initializeOrganization();
    entry_organization_id = results[0].entry_organization_id;
    for(let j = 0; j < results.length; j++) {
      let row = results[j];
      if(entry_organization_id != row.entry_organization_id) {
        await __insertStandingsTeamCompetition();
        __initializeOrganization();
        entry_organization_id = results[j].entry_organization_id;
      }
      numbers[row.event_id] = (numbers[row.event_id] ? numbers[row.event_id] + 1 : 1);
      if(numbers[row.event_id] <= t.notices.minimumNumberOfOrganization) {
        let val;
        switch(_getEvent(tournamentEvents, row.event_id).measurement) {
          case MEASUREMENT_TIME:
            if(event_time == null) event_time = {}
            event_time[row.event_id] = (event_time[row.event_id] ?  event_time[row.event_id] + row.event_time : row.event_time);
            val = row.event_time;
            break;
          case MEASUREMENT_SCORE:
            if(event_score == null) event_score = {}
            event_score[row.event_id] = round((event_score[row.event_id] ? event_score[row.event_id] : 0) + row.event_score, 10**4);
            val = row.event_score;
            break;
          default:
            throw new InternalServerError(`Unsupported measurement(${_getEvent(tournamentEvents, row.event_id).measurement})`);
        }
        const player = [row.player_id, val, row.rank];
        if(event_players[row.event_id]) {
          event_players[row.event_id].push(player);
        } else {
          event_players[row.event_id] = [ player ];  
        }
      }
    }
    await __insertStandingsTeamCompetition();
  }
  // 順位の決定
  sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  sql += ' ORDER BY event_time ASC, lowest_time DESC,  event_score DESC, lowest_score ASC';
  params = [ t.id, classification, gender ];
  const standings = await conn.query(sql, params);
  if(standings.length > 0) {
    sql = 'UPDATE standings SET rank = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
    await _standingsIndividualAllRoundRank(conn, standings, sql);
  }
}
/***************************************************************************
  団体(3種目)上位３チームを除く個人順位
****************************************************************************/
async function _standingsExcludingTop3Teams(conn, gender) {
  const t = global.tournament.composition.tournament;
  // 団体(3種目)上位３チームの所属を取得する
  let sql = 'SELECT * FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ?';
  sql += ' ORDER BY rank LIMIT 0, 3;'
  let params = [ t.id, CLASSIFICATION_TEAM_COMPETITION_30, gender ];
  const results = await conn.query(sql, params);
  let top3 = [];
  results.forEach(element => top3.push(element.player_or_organization_id));
  // 対象競技の抽出
  let classification;
  switch(t.performance_type) {
    case KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION:
      classification = CLASSIFICATION_INDIVIDUAL_ALLROUND;
      break;
    default:
      classification = CLASSIFICATION_INDIVIDUAL_EVENT;
  }
  const events = await _getTournamentEvents(conn, { gender, classification });
  // 団体(3種目)上位３チーム所属選手を除く順位の決定
  for(let j = 0; j < events.length; j++) {
    // 種目別：現在のrank1クリア
    sql = 'UPDATE standings SET rank1 = null WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ?';
    params = [ t.id, CLASSIFICATION_INDIVIDUAL_EVENT, gender, events[j].event_id ];
    await conn.query(sql, params);
    // 種目別：順位の決定
    sql = 'SELECT \
      tournament_id,\
      classification,\
      gender_id AS gender,\
      event_id AS event,\
      player_id AS player_or_organization_id,\
      event_score,\
      lowest_score,\
      event_time,\
      lowest_time\
    FROM viewStandingsIndividualEvent\
    WHERE gender_id = ? AND event_id = ? AND entry_organization_id NOT IN (?)';
    sql += ' ORDER BY event_time ASC, event_score DESC';
    params = [ gender, events[j].event_id, top3 ];
    const standings = await conn.query(sql, params);
    if(standings.length > 0) {
      sql = 'UPDATE standings SET rank1 = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
      await _standingsIndividualEventRank(conn, standings, sql);
    }
  }
  // 個人総合：現在のrank1クリア
  sql = 'UPDATE standings SET rank1 = null WHERE tournament_id = ? AND classification = ? AND gender = ?';
  params = [ t.id, CLASSIFICATION_INDIVIDUAL_ALLROUND, gender ];
  await conn.query(sql, params);
  // 個人総合：順位の決定
  sql = 'SELECT \
    tournament_id,\
    classification,\
    gender_id AS gender,\
    0 AS event,\
    player_id AS player_or_organization_id,\
    event_score,\
    lowest_score,\
    event_time,\
    lowest_time\
  FROM viewStandingsIndividualAllRound\
  WHERE gender_id = ? AND entry_organization_id NOT IN (?)';
  sql += ' ORDER BY event_time ASC, lowest_time DESC, event_score DESC, lowest_score ASC';
  params = [ gender, top3 ];
  const standings = await conn.query(sql, params);
  if(standings.length > 0) {
    sql = 'UPDATE standings SET rank1 = ? WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ? AND player_or_organization_id = ?';
    await _standingsIndividualAllRoundRank(conn, standings, sql);
  }
}
/***************************************************************************
 *
 *      クラス定義：Management
 *
 ***************************************************************************/
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
    let classification;
    switch(t.performance_type) {
      case KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION:
        classification = CLASSIFICATION_INDIVIDUAL_ALLROUND;
        break;
      default:
        classification = CLASSIFICATION_INDIVIDUAL_EVENT;
    }
    const events = await _getTournamentEvents(conn, { gender, classification, event });
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
    const events = await _getTournamentEvents(conn, { gender, classification: CLASSIFICATION_INDIVIDUAL_ALLROUND });
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
  async standingsTeamCompetition() {
    const conn = await global.pool.getConnection();
    const t = global.tournament.composition.tournament;
    await setTournamentId(conn);
    // 対象とする性別、競技の設定
    let classification;
    switch(t.performance_type) {
      case KANTO_JUNIOR_HIGH_SCHOOL_GYMNASTICS_COMPETITION:
        classification = CLASSIFICATION_INDIVIDUAL_ALLROUND;
        break;
      default:
        classification = CLASSIFICATION_TEAM_COMPETITION;
    }
    const results = await _getTournamentEvents(conn, { classification });
    let genders = [];
    let events = {};
    for(let j = 0; j < results.length; j++) {
      if(genders.indexOf(results[j].gender_id) == -1) {
        genders.push(results[j].gender_id);
      }
      if(events[results[j].gender_id]) {
        events[results[j].gender_id].push(results[j].event_id);
      } else {
        events[results[j].gender_id] = [ results[j].event_id ];
      }
    }
    // 順位表作成
    for(let j = 0; j < genders.length; j++) {
      await _standingsTeamCompetition(conn, CLASSIFICATION_TEAM_COMPETITION, genders[j], events[genders[j]]);
    }
    await global.pool.releaseConnection(conn);  
  }
  async standingsTeamCompetition30() {
    const conn = await global.pool.getConnection();
    const t = global.tournament.composition.tournament;
    await setTournamentId(conn);
    // 対象とする性別、競技の設定
    const genders = await conn.query('SELECT DISTINCT gender_id FROM viewTournamentEvent');
    const events = t.notices.team3;
    console.log(events);
    // 順位表作成
    for(let j = 0; j < genders.length; j++) {
      await _standingsTeamCompetition(conn, CLASSIFICATION_TEAM_COMPETITION_30, genders[j].gender_id, events[genders[j].gender_id]);
    }
    await global.pool.releaseConnection(conn);  
  }
  async standingsExcludingTop3Teams() {
    const conn = await global.pool.getConnection();
    const t = global.tournament.composition.tournament;
    await setTournamentId(conn);
    // 対象とする性別の設定
    const genders = await conn.query('SELECT DISTINCT gender_id FROM viewTournamentEvent');
    // 順位表作成
    for(let j = 0; j < genders.length; j++) {
      await _standingsExcludingTop3Teams(conn, genders[j].gender_id);
    }
    await global.pool.releaseConnection(conn);  
  }
};

module.exports = Management;