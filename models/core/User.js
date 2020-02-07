const bcrypt = require('bcrypt');
const util = require('util');
const compareAsync = util.promisify(bcrypt.compare);

function getUser(conn, login_id) {
    return new Promise(async function(resolve, reject) {
        if(typeof(login_id) == 'number'){
            let sql = 'SELECT * FROM user WHERE id = ?';
            let params = [ login_id, ];
            const results = await conn.query(sql, params);
            resolve(results);
        }    
        if(typeof(login_id) == 'string'){
            let sql = 'SELECT * FROM user WHERE login_id = ?';
            let params = [ login_id, ];
            const results = await conn.query(sql, params);
            if(results.length > 2){
        
            }
            resolve(results);
        }
        resolve([]);
    });
}

function getRole(conn, id) {
    return new Promise(async function(resolve, reject) {
        let sql = 'SELECT * FROM viewUserRole WHERE id = ?';
        let params = [ id, ];
        const results = await conn.query(sql, params);
        resolve(results);
    });
}

class User {
    static async isAuthenticated(username, password, update=true) {
        let rc = false;
        let conn = await global.pool.getConnection();
        let users = await getUser(conn, username);
        if(users.length == 1) {
            let user = users[0];
            if(user.validity){
                // 有効なユーザのみログインチェックを行う
                rc = await compareAsync(password, user.password);
                if(update){
                    let sql;
                    let params;
                    if(rc){
                        let now = new Date();
                        sql = 'UPDATE user SET last_login_time = ?, login_error_count = 0 WHERE id = ?';
                        params = [ now, user.id ];
                    }else{
                        sql = 'UPDATE user SET login_error_count = ? WHERE id = ?';
                        params = [ user.login_error_count + 1, user.id ];
                    }
                    await conn.query(sql, params);
                }
            }
        }
        await global.pool.releaseConnection(conn);
        return rc;   
    }
    static async getInstance(login_id, obj=null) {
        if(!obj) { obj = new User(); }
        let conn = await global.pool.getConnection();
        let users = await getUser(conn, login_id);
        obj._user = users[0];
        let rows = await getRole(conn, obj._user.id);
        obj._roles =[];
        rows.forEach((row, index, array) => {
            obj._roles.push(row.name);
        });
        await global.pool.releaseConnection(conn);
        return obj;
    }
    // getter/setter
    get id() {
        return this._user.id;
    }
};

module.exports = User;