'use strict';

// テンプレートリテラル
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/template_strings

const msgInternalServerError = 'Internal Server Error';
const msgAuthenticateError = 'システムの利用には認証が必要です。(Authentication is required.)';
const msgSystemInitializeError = 'システムの初期化でエラーが発生しました。(tournament was not found)';
const msgSystemBeforeOpeningError = 'システムはまだ利用できません。運営管理者にご確認ください。';

class AbstractError extends Error {
  constructor(message) {
    super(message);
    // 自身のクラス名をエラー名に指定
    this.name = this.constructor.name;
  }
};

module.exports.InternalServerError = class AuthenticateError extends Error {
  constructor(message) { super(message || msgInternalServerError); }
};
module.exports.AuthenticateError = class AuthenticateError extends Error {
  constructor(message) { super(message || msgAuthenticateError); }
};
module.exports.SystemInitializeError = class SystemInitializeError extends AbstractError {
  constructor(message) { super(message || msgSystemInitializeError); }
};
module.exports.SystemBeforeOpeningError = class SystemBeforeOpeningError extends AbstractError {
  constructor(message) { super(message || msgSystemBeforeOpeningError); }
};
