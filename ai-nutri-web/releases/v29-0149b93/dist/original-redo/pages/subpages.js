'use strict';
const OFFLINE='沈先生 · 7天合成预设演示 · 非真实测量、非大模型';
// Precomputed from the existing synthetic health seed; isolated page memory only.
const NutriPresetDemo=(()=>{
 const initial={"demoDate":"2026-10-22","meals":[{"id":"seed-meal-2026-10-16-breakfast","date":"2026-10-16","slot":"breakfast","time":"08:00","name":"燕麦牛奶、鸡蛋","grams":null,"kcal":390,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-16-lunch","date":"2026-10-16","slot":"lunch","time":"12:20","name":"鸡肉糙米饭、清炒蔬菜","grams":null,"kcal":620,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-16-dinner","date":"2026-10-16","slot":"dinner","time":"18:30","name":"蔬菜豆腐汤、杂粮饭","grams":null,"kcal":510,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-17-breakfast","date":"2026-10-17","slot":"breakfast","time":"08:00","name":"全麦面包、酸奶","grams":null,"kcal":395,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-17-lunch","date":"2026-10-17","slot":"lunch","time":"12:20","name":"鲜虾藜麦沙拉、米饭","grams":null,"kcal":625,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-17-dinner","date":"2026-10-17","slot":"dinner","time":"18:30","name":"蒸鱼、青菜、米饭","grams":null,"kcal":515,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-18-breakfast","date":"2026-10-18","slot":"breakfast","time":"08:00","name":"小米粥、鸡蛋","grams":null,"kcal":400,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-18-lunch","date":"2026-10-18","slot":"lunch","time":"12:20","name":"三文鱼牛油果碗","grams":null,"kcal":630,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-18-dinner","date":"2026-10-18","slot":"dinner","time":"18:30","name":"香菇鸡肉、杂粮饭","grams":null,"kcal":520,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-19-breakfast","date":"2026-10-19","slot":"breakfast","time":"08:00","name":"燕麦牛奶、鸡蛋","grams":null,"kcal":405,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-19-lunch","date":"2026-10-19","slot":"lunch","time":"12:20","name":"鸡肉糙米饭、清炒蔬菜","grams":null,"kcal":635,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-19-dinner","date":"2026-10-19","slot":"dinner","time":"18:30","name":"蔬菜豆腐汤、杂粮饭","grams":null,"kcal":525,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-20-breakfast","date":"2026-10-20","slot":"breakfast","time":"08:00","name":"全麦面包、酸奶","grams":null,"kcal":410,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-20-lunch","date":"2026-10-20","slot":"lunch","time":"12:20","name":"鲜虾藜麦沙拉、米饭","grams":null,"kcal":640,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-20-dinner","date":"2026-10-20","slot":"dinner","time":"18:30","name":"蒸鱼、青菜、米饭","grams":null,"kcal":530,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-21-breakfast","date":"2026-10-21","slot":"breakfast","time":"08:00","name":"小米粥、鸡蛋","grams":null,"kcal":415,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-21-lunch","date":"2026-10-21","slot":"lunch","time":"12:20","name":"三文鱼牛油果碗","grams":null,"kcal":645,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-21-dinner","date":"2026-10-21","slot":"dinner","time":"18:30","name":"香菇鸡肉、杂粮饭","grams":null,"kcal":535,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-22-breakfast","date":"2026-10-22","slot":"breakfast","time":"08:00","name":"燕麦牛奶、鸡蛋","grams":null,"kcal":420,"protein":18,"carb":52,"fat":13,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-22-lunch","date":"2026-10-22","slot":"lunch","time":"12:20","name":"鸡肉糙米饭、清炒蔬菜","grams":null,"kcal":650,"protein":34,"carb":74,"fat":21,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"},{"id":"seed-meal-2026-10-22-dinner","date":"2026-10-22","slot":"dinner","time":"18:30","name":"蔬菜豆腐汤、杂粮饭","grams":null,"kcal":540,"protein":27,"carb":65,"fat":17,"source":"synthetic-fixture","synthetic":true,"note":"编写的展示数值，非测量、非营养数据库计算"}],"metrics":[{"id":"seed-weight-2026-10-16","date":"2026-10-16","metric":"weight","value":75.4,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-16","date":"2026-10-16","metric":"systolic","value":132,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-16","date":"2026-10-16","metric":"diastolic","value":84,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-16","date":"2026-10-16","metric":"glucose","value":5.8,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-16","date":"2026-10-16","metric":"sleep","value":6.5,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true},{"id":"seed-weight-2026-10-17","date":"2026-10-17","metric":"weight","value":75.3,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-17","date":"2026-10-17","metric":"systolic","value":130,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-17","date":"2026-10-17","metric":"diastolic","value":82,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-17","date":"2026-10-17","metric":"glucose","value":5.7,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-17","date":"2026-10-17","metric":"sleep","value":7,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true},{"id":"seed-weight-2026-10-18","date":"2026-10-18","metric":"weight","value":75.2,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-18","date":"2026-10-18","metric":"systolic","value":134,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-18","date":"2026-10-18","metric":"diastolic","value":85,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-18","date":"2026-10-18","metric":"glucose","value":5.9,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-18","date":"2026-10-18","metric":"sleep","value":6.8,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true},{"id":"seed-weight-2026-10-19","date":"2026-10-19","metric":"weight","value":75.1,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-19","date":"2026-10-19","metric":"systolic","value":129,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-19","date":"2026-10-19","metric":"diastolic","value":81,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-19","date":"2026-10-19","metric":"glucose","value":5.6,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-19","date":"2026-10-19","metric":"sleep","value":7.2,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true},{"id":"seed-weight-2026-10-20","date":"2026-10-20","metric":"weight","value":75,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-20","date":"2026-10-20","metric":"systolic","value":131,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-20","date":"2026-10-20","metric":"diastolic","value":83,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-20","date":"2026-10-20","metric":"glucose","value":5.8,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-20","date":"2026-10-20","metric":"sleep","value":6.9,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true},{"id":"seed-weight-2026-10-21","date":"2026-10-21","metric":"weight","value":74.9,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-21","date":"2026-10-21","metric":"systolic","value":128,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-21","date":"2026-10-21","metric":"diastolic","value":80,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-21","date":"2026-10-21","metric":"glucose","value":5.7,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-21","date":"2026-10-21","metric":"sleep","value":7.3,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true},{"id":"seed-weight-2026-10-22","date":"2026-10-22","metric":"weight","value":74.8,"unit":"kg","context":"合成晨间记录","source":"synthetic-fixture","synthetic":true},{"id":"seed-sys-2026-10-22","date":"2026-10-22","metric":"systolic","value":130,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-dia-2026-10-22","date":"2026-10-22","metric":"diastolic","value":82,"unit":"mmHg","context":"合成静坐记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-glucose-2026-10-22","date":"2026-10-22","metric":"glucose","value":5.6,"unit":"mmol/L","context":"合成空腹记录，不做诊断","source":"synthetic-fixture","synthetic":true},{"id":"seed-sleep-2026-10-22","date":"2026-10-22","metric":"sleep","value":7,"unit":"小时","context":"合成自述时长","source":"synthetic-fixture","synthetic":true}],"water":[{"id":"seed-water-2026-10-16","date":"2026-10-16","ml":1500,"source":"synthetic-fixture","synthetic":true},{"id":"seed-water-2026-10-17","date":"2026-10-17","ml":1550,"source":"synthetic-fixture","synthetic":true},{"id":"seed-water-2026-10-18","date":"2026-10-18","ml":1600,"source":"synthetic-fixture","synthetic":true},{"id":"seed-water-2026-10-19","date":"2026-10-19","ml":1650,"source":"synthetic-fixture","synthetic":true},{"id":"seed-water-2026-10-20","date":"2026-10-20","ml":1700,"source":"synthetic-fixture","synthetic":true},{"id":"seed-water-2026-10-21","date":"2026-10-21","ml":1750,"source":"synthetic-fixture","synthetic":true},{"id":"seed-water-2026-10-22","date":"2026-10-22","ml":750,"source":"synthetic-fixture","synthetic":true}],"dailyNotes":[{"id":"seed-note-2026-10-16","date":"2026-10-16","appearance":"清晨稍困（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"6.5 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"工作较忙，希望简化记录（合成）","source":"synthetic-fixture","synthetic":true},{"id":"seed-note-2026-10-17","date":"2026-10-17","appearance":"精神尚可（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"7 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"想保持规律记录（合成）","source":"synthetic-fixture","synthetic":true},{"id":"seed-note-2026-10-18","date":"2026-10-18","appearance":"清晨稍困（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"6.8 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"工作较忙，希望简化记录（合成）","source":"synthetic-fixture","synthetic":true},{"id":"seed-note-2026-10-19","date":"2026-10-19","appearance":"精神尚可（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"7.2 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"想保持规律记录（合成）","source":"synthetic-fixture","synthetic":true},{"id":"seed-note-2026-10-20","date":"2026-10-20","appearance":"清晨稍困（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"6.9 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"工作较忙，希望简化记录（合成）","source":"synthetic-fixture","synthetic":true},{"id":"seed-note-2026-10-21","date":"2026-10-21","appearance":"精神尚可（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"7.3 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"想保持规律记录（合成）","source":"synthetic-fixture","synthetic":true},{"id":"seed-note-2026-10-22","date":"2026-10-22","appearance":"清晨稍困（合成自述）","voice":"未记录声音或呼吸变化；无检测","sleep":"7 小时合成自述","appetite":"三餐示例已记录，份量未称量","feeling":"工作较忙，希望简化记录（合成）","source":"synthetic-fixture","synthetic":true}]};
 const records=[];let generation=0;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function snapshot(){return {...clone(initial),records:clone(records)};}
 function plan(key){const meal=initial.meals.filter(m=>m.date===initial.demoDate)[generation++%3];return '沈先生 · '+initial.demoDate+' 预设演示方案 '+generation+'：回看'+meal.name+'的合成记录，下一餐先记录菜名、时间与实际份量；搭配不同种类蔬菜，并核对过敏原和已有医嘱。此方案由本机预设提供，不是 AI 大模型生成、个体诊断或处方。';}
 function record(key){const item={id:'preset-click-'+(records.length+1),region:typeof key==='string'?key:'self',date:initial.demoDate,note:'沈先生记录一次演示状态（仅当前页面合成记录，不代表已查看计划）',synthetic:true,source:'preset-demo-click'};records.push(item);return clone(item);}
 function exportData(){return JSON.stringify({format:'nutri-preset-page-demo-v1',synthetic:true,scope:'page-memory-only; not account backup',...snapshot()},null,2);}
 return Object.freeze({snapshot,plan,record,exportData});
})();
if(typeof window!=='undefined')window.NutriPresetDemo=NutriPresetDemo;

const ORGANS=[["brain", "大脑", "🧠"], ["heart", "心脏", "🫀"], ["liver", "肝脏", "🧬"], ["stomach", "胃", "🍲"], ["intestine", "肠道", "🥬"], ["pancreas", "胰腺", "🍯"], ["kidney", "肾脏", "💧"], ["lungs", "肺部", "🫁"], ["eyes", "眼睛", "👁️"], ["muscle", "肌肉", "💪"], ["bone", "骨骼", "🦴"], ["skin", "皮肤", "✋"]];
const BODY_KNOWLEDGE={
  "brain": {
    "intro": "大脑负责思维、记忆与情绪。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "Omega-3 与脂肪",
        "description": "认识不同种类的脂肪，以及鱼类、坚果等食物在日常饮食中的位置。不能据此判断个人是否缺乏某种脂肪酸。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "含糖食物",
        "description": "区分食物天然含有的糖与加工时添加的糖；查看饮料、甜点的配料表和营养标签。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "蔬菜与饮食多样性",
        "description": "认识不同颜色和种类的蔬菜。单一食物不能代替多样的日常饮食。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "鱼类、核桃",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "水果与蔬菜",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "heart": {
    "intro": "心脏是循环系统核心。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "食盐与钠",
        "description": "食盐和一些调味品含有钠。营养标签中的钠信息可以帮助认识食物成分。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "Omega-3 与脂肪",
        "description": "认识不同种类的脂肪，以及鱼类、坚果等食物在日常饮食中的位置。不能据此判断个人是否缺乏某种脂肪酸。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食中的能量",
        "description": "能量来自日常食物。个体需要量与年龄、活动和健康情况有关，本页不估算您的目标。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "鱼类、豆类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "蔬菜、全谷物",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "liver": {
    "intro": "肝脏参与代谢与营养储存。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "含糖食物",
        "description": "区分食物天然含有的糖与加工时添加的糖；查看饮料、甜点的配料表和营养标签。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "膳食纤维",
        "description": "全谷物、豆类、蔬菜和水果是膳食纤维的常见食物来源。这里介绍食物类别，不评估个人摄入是否充足。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食中的能量",
        "description": "能量来自日常食物。个体需要量与年龄、活动和健康情况有关，本页不估算您的目标。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "全谷物、豆类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "蔬菜与水果",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "stomach": {
    "intro": "胃负责食物的初步消化。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "餐次与加餐",
        "description": "把正餐与加餐一起放入饮食记录，才能看见完整的一天。页面尚未读取您的记录。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食刺激与个人感受",
        "description": "记录进食后的实际感受，有助于与专业人员讨论。相同食物在不同人身上的耐受情况可能不同。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食中的能量",
        "description": "能量来自日常食物。个体需要量与年龄、活动和健康情况有关，本页不估算您的目标。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "主食与蛋白质食物",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "蔬菜与水果",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "intestine": {
    "intro": "肠道承担营养吸收，并与肠道菌群共同参与消化过程。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "膳食纤维",
        "description": "全谷物、豆类、蔬菜和水果是膳食纤维的常见食物来源。这里介绍食物类别，不评估个人摄入是否充足。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "食物多样性",
        "description": "不同食物提供不同营养成分。这里按类别认识食物，不给某一种食物赋予修复器官的功效。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "含糖食物",
        "description": "区分食物天然含有的糖与加工时添加的糖；查看饮料、甜点的配料表和营养标签。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "全谷物、豆类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "蔬菜与水果",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "pancreas": {
    "intro": "胰腺参与血糖调节。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "碳水化合物",
        "description": "谷物、薯类、水果等含有碳水化合物；它与蛋白质、脂肪共同构成饮食。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "膳食纤维",
        "description": "全谷物、豆类、蔬菜和水果是膳食纤维的常见食物来源。这里介绍食物类别，不评估个人摄入是否充足。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "含糖食物",
        "description": "区分食物天然含有的糖与加工时添加的糖；查看饮料、甜点的配料表和营养标签。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "谷薯类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "豆类、蔬菜",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "kidney": {
    "intro": "肾脏参与体液与电解质平衡。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "食盐与钠",
        "description": "食盐和一些调味品含有钠。营养标签中的钠信息可以帮助认识食物成分。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "蛋白质食物",
        "description": "鱼、肉、蛋、奶和豆类是常见的蛋白质食物类别；本页不计算个人所需克数。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "个体饮食方案",
        "description": "已有肾脏疾病时，饮食与饮水安排需要结合实际情况由专业人员制定；不能直接套用通用食物列表。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "按个人饮食方案选择",
        "note": "肾脏疾病相关饮食需结合专业方案。",
        "emoji": "🥗"
      },
      {
        "name": "查看食物营养标签",
        "note": "肾脏疾病相关饮食需结合专业方案。",
        "emoji": "🥗"
      }
    ]
  },
  "lungs": {
    "intro": "肺部进行气体交换。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "食物多样性",
        "description": "不同食物提供不同营养成分。这里按类别认识食物，不给某一种食物赋予修复器官的功效。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "蔬菜与水果",
        "description": "认识蔬菜、水果的种类与日常搭配；这些食物不具有治疗器官疾病的作用。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食中的能量",
        "description": "能量来自日常食物。个体需要量与年龄、活动和健康情况有关，本页不估算您的目标。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "蔬菜与水果",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "主食、豆类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "eyes": {
    "intro": "眼睛接收光线，帮助我们感知形状与色彩。",
    "sourceNote": "依据原项目器官资料和营养主题整理；静态科普，不是个人健康评估。",
    "nutrition": [
      {
        "title": "Omega-3 与脂肪",
        "description": "认识不同种类的脂肪，以及鱼类、坚果等食物在日常饮食中的位置。不能据此判断个人是否缺乏某种脂肪酸。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "蔬菜与饮食多样性",
        "description": "认识不同颜色和种类的蔬菜。单一食物不能代替多样的日常饮食。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "含糖食物",
        "description": "区分食物天然含有的糖与加工时添加的糖；查看饮料、甜点的配料表和营养标签。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "鱼类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "深绿色蔬菜",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "muscle": {
    "intro": "肌肉通过收缩参与身体活动。骨骼肌与日常动作、姿势维持密切相关。",
    "sourceNote": "沿用原版详情模板扩展的科普内容；原项目未提供该部位的独立详情。",
    "nutrition": [
      {
        "title": "蛋白质食物",
        "description": "鱼、肉、蛋、奶和豆类是常见的蛋白质食物类别；本页不计算个人所需克数。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食中的能量",
        "description": "能量来自日常食物。个体需要量与年龄、活动和健康情况有关，本页不估算您的目标。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食与日常活动",
        "description": "饮食与身体活动是两个相互关联的话题，本页不生成训练计划或个人营养处方。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "鱼、肉、蛋、奶",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "豆类与豆制品",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "bone": {
    "intro": "骨骼支撑身体、保护器官，并与肌肉共同完成运动。骨组织也在不断更新。",
    "sourceNote": "沿用原版详情模板扩展的科普内容；原项目未提供该部位的独立详情。",
    "nutrition": [
      {
        "title": "钙",
        "description": "钙是骨组织的重要组成成分。可以从奶类、豆制品等食物的营养信息开始了解。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "维生素 D",
        "description": "维生素 D 与钙的吸收利用有关；本页不判断是否缺乏，也不提供补充剂剂量。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食与日常活动",
        "description": "饮食与身体活动是两个相互关联的话题，本页不生成训练计划或个人营养处方。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "奶类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "豆制品与深绿色蔬菜",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  },
  "skin": {
    "intro": "皮肤覆盖身体表面，是人体与外界之间的重要屏障，也参与体温调节。",
    "sourceNote": "沿用原版详情模板扩展的科普内容；原项目未提供该部位的独立详情。",
    "nutrition": [
      {
        "title": "蛋白质食物",
        "description": "鱼、肉、蛋、奶和豆类是常见的蛋白质食物类别；本页不计算个人所需克数。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "食物多样性",
        "description": "不同食物提供不同营养成分。这里按类别认识食物，不给某一种食物赋予修复器官的功效。",
        "emoji": "◦",
        "type": "food"
      },
      {
        "title": "饮食与日常防护",
        "description": "饮食、清洁和日常防护是不同的生活话题；食物不能代替皮肤疾病的诊断或治疗。",
        "emoji": "◦",
        "type": "food"
      }
    ],
    "foods": [
      {
        "name": "蔬菜与水果",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      },
      {
        "name": "蛋、奶、豆类",
        "note": "认识食物类别，不表示个人摄入建议。",
        "emoji": "🥗"
      }
    ]
  }
};
function bodyData(key){key=({gut:'intestine',kidneys:'kidney'})[key]||key;const found=ORGANS.find(x=>x[0]===key)||['','请选择身体部位','◯'];const knowledge=BODY_KNOWLEDGE[found[0]]||{intro:'请从上方选择部位，查看相关的身体与营养信息。',sourceNote:'没有选择部位时，不显示任何个人评估。',nutrition:[],foods:[]};return {statusBarHeight:0,navBarHeight:56,safeAreaBottom:24,regionKey:found[0],organTabs:ORGANS.map(([key,name,emoji])=>({key,name,emoji,score:'科普信息',scoreClass:''})),scoreClass:'score-unavailable',statusText:'未评估',trendMin:'—',trendMax:'—',trendAvg:'—',organEmoji:found[2],dietImpactText:OFFLINE,organ:{key:found[0],name:found[1],...knowledge,score:'—',summary:'沈先生近7天合成记录，不是器官评估',metrics:NutriPresetDemo.snapshot().metrics.filter(m=>m.date==='2026-10-22').map(m=>({name:({weight:'体重',systolic:'收缩压',diastolic:'舒张压',glucose:'血糖',sleep:'睡眠'})[m.metric],value:m.value,unit:m.unit,status:'demo',percentage:0,detail:m.context+'；编写的展示值，非检测结果'})),suggestions:[],recommendations:[],dailyTip:'本页帮助认识身体与食物，不判断器官健康、营养缺乏或治疗效果。',aiPlan:'点击生成，查看基于沈先生合成记录的本机预设方案（非大模型）。',achievements:['已准备7天合成记录','21条预设餐食','本机演示，不同步账户']},history:NutriPresetDemo.snapshot().metrics.filter(m=>m.metric==='weight'),expandedMetric:null,cardAnimated:true,showSuccess:false};}
function monthData(date=new Date(),day=date.getDate()){const year=date.getFullYear(),month=date.getMonth(),days=new Date(year,month+1,0).getDate();return {calendarYear:year,calendarMonth:month,selectedDay:day,currentMonthText:`${year}年${month+1}月`,monthPickerValue:`${year}-${String(month+1).padStart(2,'0')}`,monthDays:Array.from({length:days},(_,i)=>({day:i+1,week:['日','一','二','三','四','五','六'][new Date(year,month,i+1).getDay()],selected:i+1===day})),dateScrollLeft:0,dateTopLineW:0};}
function intakePreset(date){const rows=NutriPresetDemo.snapshot().meals.filter(m=>m.date===date),sum=k=>rows.reduce((n,m)=>n+m[k],0),food=slot=>rows.filter(m=>m.slot===slot).map(m=>({...m,img:'',unit:'合成份量示例',nutrient:m.kcal+' kcal · 编写的展示值'}));return {presetDate:date,presetHasRows:rows.length>0,calorieConsumed:rows.length?sum('kcal'):'—',calorieTarget:'2000（示例）',macroItems:[['carb','碳水',250],['fat','脂肪',65],['protein','蛋白',90]].map(([key,name,target])=>({key,name,value:rows.length?sum(key)+'g（合成）':'选择10月16—22日预设',percent:rows.length?Math.round(sum(key)/target*100):0})),breakfastFoods:food('breakfast'),lunchFoods:food('lunch'),dinnerFoods:food('dinner')};}
function subpageData(page,params){if(page==='body')return bodyData(params.get('key'));
 if(page==='intake')return {...monthData(new Date(2026,9,22)),...intakePreset('2026-10-22'),organImpacts:[],snackCards:[],familyDrawerOpen:false,familyMembers:[],selectedMemberKey:'',familyAddLocked:false,addFoodModalOpen:false,deleteConfirmOpen:false};
 if(page==='record')return {keyword:'',targetLabel:'沈先生合成餐食预设 · 当前页演示',filteredRecentFoods:NutriPresetDemo.snapshot().meals.slice(-3).map(m=>({...m,calorie:m.kcal,unit:'合成份'})),filteredCommonFoods:NutriPresetDemo.snapshot().meals.slice(-3).map(m=>({...m,calorie:m.kcal,unit:'合成份'})),form:{name:'',calorie:'',unit:'',nutrient:'',carb:'',protein:'',fat:'',fiber:'',img:'',note:''}};
 if(page==='recognition')return {navHeightPx:56,statusBarHeightPx:0,navContentHeightPx:56,cameraHeightPx:340,resultScrollHeightPx:160,previewImage:'',recognizing:false,showResult:false,showWheel:false,addPromptVisible:false,mealPickerVisible:false,mealItems:[],nutritionFolded:true,notesFolded:true,impactFolded:true};
 return null;}
const ROUTES={navigateToRecipePage:'recipes.html',navigateToDataPage:'intake.html',navigateToFoodRecordPage:'record.html',navigateToDetail:'body.html',navigateToRecognitionPage:'recognition.html',goToBrochure:'book.html',onAddBySelect:'record.html',onAddByCamera:'recognition.html',onAddByAlbum:'recognition.html'};
const UNAVAILABLE={onSyncTodayTap:'独立家庭演示页提供本机成员记录；此页不进行跨设备同步。',onFamilyCellTap:'请前往家庭演示页查看本机成员记录。',onMemberDeleteTap:'此预设页不删除账户成员。',confirmDeleteFood:'预设种子保留不删除，可在饮食演示页管理合成记录。',onFoodTap:'当前显示沈先生合成餐食预设。',onSnackCardTap:'当前显示合成加餐预设。'};
