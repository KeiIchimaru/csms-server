const mysql  = require('promise-mysql');
const conf = require('config');

module.exports.CLASSIFICATION_INDIVIDUAL_EVENT = 1;
module.exports.CLASSIFICATION_INDIVIDUAL_ALLROUND = 2;
module.exports.CLASSIFICATION_TEAM_COMPETITION = 3;
module.exports.CLASSIFICATION_TEAM_COMPETITION_30 = 30;

module.exports.MEASUREMENT_TIME = 1;
module.exports.MEASUREMENT_SCORE = 2;

module.exports.getPool = async function() {
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
module.exports.setTournamentId = async function(conn) {
    await conn.query(`set @tournamentId = ${global.tournamentId}`); 
}
