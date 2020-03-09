var fmtDateYMD = function (value) {
    let y = value.getFullYear();
    let m = ("0" + (value.getMonth()+1)).slice(-2);
    let d = ("0" + value.getDate()).slice(-2);
    let result = y + "/" + m + "/" + d;
    return result;
};
var fmtDateYMDHMS = function (value) {
    let H = ("0" + value.getHours()).slice(-2);
    let M = ("0" + value.getMinutes()).slice(-2);
    let S = ("0" + value.getSeconds()).slice(-2);
    let result = fmtDateYMD(value) + " " + H + ":" + M + ":" + S;
    return result;
};
