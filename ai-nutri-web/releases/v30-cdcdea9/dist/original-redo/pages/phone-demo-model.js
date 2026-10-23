/* Pure offline call-preview state; no transport, microphone, audio or persistence. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NutriPhoneDemo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function create(health){if(!health||!/^\d{4}-\d{2}-\d{2}$/.test(health.demoDate)||!Array.isArray(health.meals))throw Error('合成预设未准备好');const date=health.demoDate,meals=health.meals.filter(m=>m.date===date&&m.synthetic===true).map(m=>String(m.name));if(!meals.length)throw Error('缺少当日合成餐食');let state='idle',epoch=0,seconds=0,messages=[],step=0;
const snapshot=()=>({state,epoch,seconds,date,messages:messages.map(m=>({...m})),step,synthetic:true,realCall:false,audio:false,persisted:false});
function start(){if(state==='ringing'||state==='demo')return snapshot();epoch++;state='ringing';seconds=0;messages=[];step=0;return snapshot();}
function ready(ticket){if(ticket!==epoch||state!=='ringing')return false;state='demo';messages.push({role:'assistant',text:'沈先生，你好。我是小禾。这是AI电话的文字演示，没有拨号、录音或语音服务。今天先回看 '+date+' 的合成饮食记录。'});return true;}
function tick(ticket){if(ticket!==epoch||state!=='demo')return false;seconds=Math.min(seconds+1,3599);return true;}
function next(){if(state!=='demo')return false;const rows=[['看看今天吃了什么','预设三餐是：'+meals.join('；')+'。这些是编写的合成记录，不是照片识别或真实测量。'],['下一餐怎么记录？','先记录菜名、时间和实际份量。份量不知道可以保留未知；不会因为演示计划而自动写成已吃。'],['帮我做一个回顾','演示回顾：今天有 '+meals.length+' 条合成餐食。建议先核对过敏原与已有医嘱；本页不能诊断或给出个体处方。']];if(step>=rows.length)return false;const row=rows[step++];messages.push({role:'user',text:row[0]+'（预设选择）'},{role:'assistant',text:row[1]});return true;}
function end(){if(state==='ringing'||state==='demo'){epoch++;state='ended';return true;}return false;}
return Object.freeze({snapshot,start,ready,tick,next,end});}
return Object.freeze({create});});
