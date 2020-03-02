const { setTournamentId } = require("../../lib/database/utils")

async function _getParticipatingPlayerEventOrder(conn, day, gender, classification, event) {
  let sql = 'SELECT * FROM viewParticipatingPlayerEventOrder where s_acting_day = ? and s_gender = ? and s_classification = ? and a_event_id = ?';
  sql += ' order by s_number ASC, a_sequence ASC, c_number ASC, p_sequence ASC';
  let params = [ day, gender, classification, event ];
  const results = await conn.query(sql, params);
  return results;
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