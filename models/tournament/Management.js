const { InternalServerError } = require(global.base_path+'/lib/error');

async function _getParticipatingPlayer(conn, day, gender, classification, event) {
  let sql = 'SELECT * FROM viewParticipatingPlayer where s_acting_day = ? and s_gender = ? and s_classification = ? and a_event_id = ?';
  sql += ' order by s_number ASC, a_sequence ASC, c_number ASC, p_sequence ASC';
  let params = [ day, parseInt(gender), parseInt(classification), parseInt(event) ];
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
  async getParticipatingPlayer(day, gender, classification, event) {
    let conn = await global.pool.getConnection();
    const results = await _getParticipatingPlayer(conn, day, gender, classification, event);
    await global.pool.releaseConnection(conn);
    return results;
  }
};

module.exports = Management;