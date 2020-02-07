const controllerUtils = require(global.base_path+'/lib/controller/utils');
const inputName = 'selectDay';
const confirmName = 'confirmDay';

class SelectDay {
    static inputViewName() {
        return '/' + inputName;
    }
    static confirmViewName() {
        return '/' + confirmName;
    }
    constructor(req) {
        if(typeof req === 'undefined'){
            this.req = null;
            return; 
        }
        this.req = req;
    }
    check(){
        if(!controllerUtils.isExist(this.req)){
            throw new Error("SelectDay>check: req does not exist.");
        }
        let req = this.req;
        if(!controllerUtils.isExist(req.body.day)){
            req.flash('error', '競技日を指定して下さい。');
            return false;
        }
        if(isNaN(req.body.day)) {
            req.flash('error', '正しい競技日を指定して下さい。');
            return false;
        }
        let day = Number(req.body.day);
        let tournament = global.tournament;
        if(day < 1 || day > tournament.days){
            req.flash('error', '正しい競技日を指定して下さい。');
            return false;
        }
        // 入力データをセッションに保存する。
        controllerUtils.setValues(req, SelectDay.inputViewName(), {
            day: day,
        });
        return true;
    }
    confirm() {
        if(!controllerUtils.isExist(this.req)){
            throw new Error("SelectDay>confirm: req does not exist.");
        }
        let req = this.req;
        // 入力データをセッションから取り出す。
        let values = controllerUtils.getValues(req, SelectDay.inputViewName());
        // 競技日の設定
        global.tournament.management.day = values.day;
        // セッションから入力データを削除する。
        controllerUtils.deleteValues(req, SelectDay.inputViewName());
    }
    get title() {
        return '競技日選択';
    }
    get locals() {
        let req = this.req;
        // 初期画面
        if(req == null){
            return {
                title: this.title,
                error: '',
                values: { day: 0 }
            };        
        }
        if(req.path == SelectDay.inputViewName()){
            if(req.method == 'POST'){
                // 入力画面=>確認画面
                return {
                    // 入力エラー、確認画面
                    title: this.title,
                    error: req.flash('error'),
                    values: controllerUtils.getInputValues(req.body)
                };        
            }
            if(req.method == 'GET'){
                // 確認画面(戻る)=>入力画面
                let values = controllerUtils.getValues(req, SelectDay.inputViewName());
                return {
                    title: this.title,
                    error: '',
                    values: values
                };        
            }
        }
        return {};
    }
};

module.exports = SelectDay;