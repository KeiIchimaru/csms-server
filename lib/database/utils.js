const mysql  = require('promise-mysql');
const conf = require('config');

exports.getPool = async function() {
    let pool = await mysql.createPool({
        connectionLimit : conf.connectionLimit,
        host: conf.host,
        user: conf.user,
        password: conf.password,
        database: conf.database,
        socketPath: conf.socketPath
    });
    return pool;
}
exports.setTournamentId = async function(conn) {
    await conn.query(`set @tournamentId = ${global.tournamentId}`); 
}
