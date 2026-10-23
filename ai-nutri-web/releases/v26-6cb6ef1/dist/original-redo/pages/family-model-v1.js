(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NutriFamily=factory();})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),fields=['mode','accountId','protocolVersion','epoch','generation','revision'];
const stable=x=>x&&typeof x==='object'?(Array.isArray(x)?'['+x.map(stable).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}'):JSON.stringify(x);
const same=(a,b)=>stable(a)===stable(b);const lists=['messages','metrics','meals','water','reminders','reminderChecks','recipeSelections','dailyNotes','conditions'];
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00Z'))||new Date(s+'T12:00Z').toISOString().slice(0,10)!==s)throw Error('日期无效');return s;}
function name(s){if(typeof s!=='string'||!s.trim()||s.trim().length>40)throw Error('名称需为1—40字');return s.trim();}
function context(s){if(s?.meta?.mode!=='synthetic'||s.meta.accountId!=='demo-shen'||s.meta.protocolVersion!==3||!s.health)throw Error('仅支持当前合成账号');return Object.fromEntries(fields.map(k=>[k,s.meta[k]]));}
function healthOf(s){const h=clone(s.health);delete h.family;return h;}
function migration(h){date(h.demoDate);for(const k of lists){if(!Array.isArray(h[k]))throw Error('健康数据不完整');for(const r of h[k]){if(k==='recipeSelections'){if(typeof r!=='string')throw Error('备选数据无效');continue;}if(!r||typeof r!=='object'||('accountId'in r&&r.accountId!=='demo-shen')||('memberId'in r&&r.memberId!=='self'))throw Error('迁移成员归属不符');if(k!=='reminders'&&r.synthetic!==true)throw Error('拒绝非合成健康记录');}}return h;}
function init(s){context(s);if(s.health.family)throw Error('家庭资料已存在');const h=migration(healthOf(s));return {schema:1,selected:'self',date:h.demoDate,nextId:1,members:[{id:'self',name:'沈先生（合成本人）',active:true}],initialSelf:clone(h)};}
function family(s){context(s);const f=s.health.family;if(!f||f.schema!==1||!Array.isArray(f.members))throw Error('请先启用合成家庭');return f;}
function member(f,id){const m=f.members.find(m=>m.id===id&&m.active);if(!m)throw Error('成员已不可用');return m;}
// Read-only rule summary: missing or invalid values are unknown, never inferred.
function dailyReport(meals){
const slots=['breakfast','lunch','dinner','snack'],counts=Object.fromEntries(slots.map(k=>[k,0]));let unknownSlot=0;
for(const row of meals){if(slots.includes(row.slot))counts[row.slot]++;else unknownSlot++;}
const nutrients={};for(const key of ['kcal','protein','carb','fat','grams']){const values=meals.map(r=>r[key]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0),sum=values.reduce((a,b)=>a+b,0);nutrients[key]={value:values.length&&Number.isFinite(sum)?Number(sum.toFixed(1)):null,known:values.length,unknown:meals.length-values.length};}
return {entryCount:meals.length,slotCount:slots.filter(k=>counts[k]>0).length,slots:counts,unknownSlot,nutrients};
}
function projection(s){const f=family(s),m=member(f,f.selected),h=m.id==='self'?healthOf(s):clone(m.health);const meals=h.meals.filter(r=>r.date===f.date);return {context:context(s),memberId:m.id,name:m.name,date:f.date,meals:clone(meals),report:dailyReport(meals),members:f.members.map(m=>({id:m.id,name:m.name,active:m.active}))};}
function mutate(root,input){context(root);if(!same(root,input.base))throw Error('当前资料已变化，请刷新后重新填写');const c=input.command;
if(c.type==='init'){root.health.family=init(root);return;}
const f=family(root);
if(c.type==='add'){const id='member-'+f.nextId++;f.members.push({id,name:name(c.name),active:true,health:{demoDate:f.date,...Object.fromEntries(lists.map(k=>[k,[]]))}});}
else if(c.type==='rename')member(f,c.memberId).name=name(c.name);
else if(c.type==='select'){member(f,c.memberId);f.selected=c.memberId;}
else if(c.type==='date')f.date=date(c.date);
else if(c.type==='delete'){if(c.memberId==='self')throw Error('不能删除本人');member(f,c.memberId).active=false;if(f.selected===c.memberId)f.selected='self';}
else if(c.type==='restore'){const m=f.members.find(m=>m.id===c.memberId&&!m.active);if(!m)throw Error('无可恢复成员');m.active=true;}
else if(c.type==='meal'){const m=member(f,f.selected),h=m.id==='self'?root.health:m.health,r=clone(c.row);if(r.synthetic!==true||r.memberId!==m.id||r.accountId!=='demo-shen'||r.date!==f.date||typeof r.id!=='string'||!r.id||h.meals.some(x=>x.id===r.id))throw Error('餐食归属或标识已变化');name(r.name);if(!['breakfast','lunch','dinner','snack'].includes(r.slot)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))throw Error('餐次或时间无效');if(!['kcal','carb','protein','fat','grams'].every(k=>r[k]===null))throw Error('本页份量与营养须保持未知');h.meals.push(r);}
else throw Error('不支持的家庭操作');
}
function candidate(base,command){const input={base:clone(base),command:clone(command)},out=clone(base);mutate(out,input);return {input,state:out};}
function verify(base,expected,receipt){if(!receipt||receipt.committed!==true||!receipt.state)throw Error('提交回执未核实');const saved=clone(receipt.state),want=clone(expected);if(!same({...context(saved),revision:0},{...context(base),revision:0})||saved.meta.revision!==base.meta.revision+1)throw Error('回执版本不符');want.meta=clone(saved.meta);if(!same(saved,want))throw Error('回执内容不符');return clone(saved);}
return {clone,same,context,init,projection,dailyReport,mutate,candidate,verify};});
