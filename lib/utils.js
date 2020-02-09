exports.copyDict = (obj) => {
    let val ={};
    for (let key in obj) {
        val[key] = obj[key];
    }
    return val;
}
