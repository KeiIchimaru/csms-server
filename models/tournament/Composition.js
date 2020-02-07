
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
};

module.exports = Composition;