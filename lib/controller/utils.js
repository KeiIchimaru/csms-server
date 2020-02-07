
exports.getInputValues = (body) => {
    if(typeof body === 'undefined'){
        return {};
    }
    let val ={};
    for (let key in body) {
        if(key != '_csrf'){
            val[key] = body[key];
        }
    }
    return val;
}
exports.isExist = (obj) => {
    return !(typeof obj === 'undefined' || obj == null);
}
exports.setValues = (req, key, values) => {
    if(!exports.isExist(req.session)){
        throw new Error("controller.utils>setValues: session does not exist.");
    }
    if(!exports.isExist(req.session.inputValues)){
        req.session.inputValues = {};
    }
    req.session.inputValues[key] = values;
}
exports.getValues = (req, key) => {
    if(!exports.isExist(req.session)){
        throw new Error("controller.utils>getValues: session does not exist.");
    }
    if(exports.isExist(req.session.inputValues)){
        if(key in req.session.inputValues){
            return req.session.inputValues[key];
        }
    }
    return {};
}
exports.deleteValues = (req, key) => {
    if(!exports.isExist(req.session)){
        throw new Error("controller.utils>deleteValues: session does not exist.");
    }
    if(exports.isExist(req.session.inputValues)){
        if(key in req.session.inputValues){
            delete req.session.inputValues[key];
        }
    }
}
