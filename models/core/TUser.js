const User = require(global.base_path+'/models/core/User')
const Role = require(global.base_path+'/models/core/Role')


class TUser extends User {
    static async getInstance(id) {
        let obj = new TUser();
        obj = await User.getInstance(id, obj=obj);
        return obj;
    }

    isAdmin() {
        return this._roles.includes(Role.USER_MANAGER);
    }
};

module.exports = TUser;