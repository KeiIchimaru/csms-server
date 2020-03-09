module.exports.round = (value, ndigits) => Math.round(value * ndigits) / ndigits;

module.exports.isDict = (obj) => typeof obj === 'object' && obj !== null && !(obj instanceof Array) && !(obj instanceof Date);

module.exports.isArray = (obj) => typeof obj === 'object' && obj !== null && obj instanceof Array;

module.exports.copyDict = (obj) => {
  let val ={};
  for (let key in obj) {
      val[key] = obj[key];
  }
  return val;
}
module.exports.fmtDateYMD = (value) => {
  let y = value.getFullYear();
  let m = ("0" + (value.getMonth()+1)).slice(-2);
  let d = ("0" + value.getDate()).slice(-2);
  let result = y + "/" + m + "/" + d;
  return result;
};
module.exports.fmtDateYMDHMS = (value) => {
  let H = ("0" + value.getHours()).slice(-2);
  let M = ("0" + value.getMinutes()).slice(-2);
  let S = ("0" + value.getSeconds()).slice(-2);
  let result = fmtDateYMD(value) + " " + H + ":" + M + ":" + S;
  return result;
};

