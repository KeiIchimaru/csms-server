const { setTournamentId } = require("../../lib/database/utils")

async function _getParticipatingPlayerEventOrder(conn, day, gender, classification, event) {
  let sql = 'SELECT * FROM viewParticipatingPlayerEventOrder where s_acting_day = ? and s_gender = ? and s_classification = ? and a_event_id = ?';
  sql += ' order by s_number ASC, a_sequence ASC, c_number ASC, p_sequence ASC';
  let params = [ day, gender, classification, event ];
  const results = await conn.query(sql, params);
  return results;
}
// 個人種目別
async function _standingsIndividualEvent(conn, classification, gender, event) {
  let t = global.tournament.composition.tournament;
  let sql = 'DELETE FROM standings WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ?';
  let params = [ global.tournamentId, classification, gender, event ];
  await conn.query(sql, params);
  sql = 'SELECT * FROM tournament_event_result WHERE tournament_id = ? AND classification = ? AND gender = ? AND event = ?';
  const results = await conn.query(sql, params);
  for(let j = 0; j < results.length; j++) {
    const row = results[j];
    sql = 'INSERT INTO standings (\
      tournament_id,\
      classification,\
      gender,\
      event,\
      player_or_organization_id,\
      constitution,';
    params = [ t.id, classification, gender, event, row.player_id, row.constitution];  
    sql += 'event_score,lowest_score,';
    sql += 'event_time,lowest_time,';
    sql += ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  }



}
// 個人総合
async function _standingsIndividualAllRound(conn) {

}
// 団体総合
async function _standingsTeamCompetition(conn) {

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
};

module.exports = Management;