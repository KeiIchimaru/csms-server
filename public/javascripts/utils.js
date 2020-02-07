var fmtDateYMD = function (value) {
    let y = value.getFullYear();
    let m = ("00" + (value.getMonth()+1)).slice(-2);
    let d = ("00" + value.getDate()).slice(-2);
    let result = y + "/" + m + "/" + d;
    return result;
};
