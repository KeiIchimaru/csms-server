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
async function _getParticipatingPlayers(conn, gender, { subdivision, group, bibs } = {}) {
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
    sql = 'SELECT * FROM viewTournamentEventResult WHERE bibs = ? ORDER BY event_id';
    params = [ row.bibs, ];
    const eventResult = await conn.query(sql, params);
    scores = {};
    for(let j = 0; j < eventResult.length; j++) {
      scores[scores[j].event_id] = copyDict(scores[j]);
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
    obj._tournament = await _getTournament(conn);
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
  async getParticipatingPlayers(gender, { subdivision, group, bibs } = {}) {
    let conn = await global.pool.getConnection();
    const results = await _getParticipatingPlayers(conn, gender, subdivision=subdivision, group=group, bibs=bibs);
    await global.pool.releaseConnection(conn);
    return results;
  }
};

module.exports = Composition;