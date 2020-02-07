const mysql  = require('promise-mysql');
const conf = require('config');

async function getPool() {
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

module.exports.getPool = getPool; // export the pools
