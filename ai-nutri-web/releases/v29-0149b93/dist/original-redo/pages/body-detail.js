'use strict';
// Shared-template additions are educational and never compute account health scores.
function normalizeBodyKey(key){return ({gut:'intestine',kidneys:'kidney'})[key]||key;}
function bodyReturnURL(){const q=new URLSearchParams(location.search);if(q.get('from')==='intake')return 'intake.html';const aliases={intestine:'gut',kidneys:'kidney'};const selected=normalizeBodyKey(q.get('key'));const mainKeys=['brain','heart','liver','gut','muscle','bone','eyes','lungs','kidney','skin','stomach','pancreas'];const key=aliases[selected]||selected;const result=new URLSearchParams();if(mainKeys.includes(key))result.set('part',key);else if(mainKeys.includes(q.get('part')))result.set('part',q.get('part'));if(document.body.classList.contains('large-mode')||q.get('large')==='1')result.set('large','1');if(['metabolism','repair','disease','beauty','mental','specific','organ'].includes(q.get('topic'))){result.set('topic',q.get('topic'));if(/^[0-2]$/.test(q.get('group')||''))result.set('group',q.get('group'));if(['0','1'].includes(q.get('open')))result.set('open',q.get('open'));}return '../nutrition-booklet.html?'+result;}
function enhanceBodyDetail(){
 const info=data.organ;if(!info)return;
 document.title=info.name+' · 身体与营养';
 const noticeBack=document.querySelector('.adapt-notice a');if(noticeBack){noticeBack.href=bodyReturnURL();noticeBack.textContent=new URLSearchParams(location.search).get('from')==='intake'?'饮食记录':'营养册';}
 document.body.classList.toggle('large-mode',new URLSearchParams(location.search).get('large')==='1');
 document.querySelector('.organ-subtitle').textContent='身体与营养';
 const back=document.querySelector('[data-tap="goBack"]');back.setAttribute('aria-label',new URLSearchParams(location.search).get('from')==='intake'?'返回饮食记录':'返回营养册，保留部位选择');
 document.querySelectorAll('.suggestions-list > .empty-state,.foods-list > .empty-state').forEach(el=>el.remove());
 document.querySelectorAll('.organ-tab').forEach(el=>el.setAttribute('aria-label',el.querySelector('.organ-tab-name').textContent+'，查看详情'));
 compactBodyReading(info);
 const active=document.querySelector('.organ-tab.active');if(active){const tabs=document.querySelector('.organ-tabs');tabs.scrollLeft=Math.max(0,active.offsetLeft-tabs.clientWidth/2+active.clientWidth/2);}
}

function compactBodyReading(info){
 const node=(tag,text,cls)=>NutriCare.node(tag,text,cls);
 const scroll=document.querySelector('.main-scroll');
 const intro=document.querySelector('.info-card');
 const provenance=document.querySelector('.body-provenance');
 if(provenance)provenance.remove();
 document.querySelector('.header-title').textContent='身体与营养';
 const goalFor={brain:'mental',heart:'disease',liver:'organ',intestine:'disease',muscle:'repair',bone:'repair',eyes:'beauty',skin:'beauty',lungs:'disease',kidney:'organ',stomach:'metabolism',pancreas:'metabolism'};
 const guide=window.NUTRI_GOALS[goalFor[info.key]||'metabolism'];
 const knowledge=document.querySelector('.suggestions-card');
 const foods=document.querySelector('.foods-card');
 const tip=document.querySelector('.tip-card');
 knowledge.remove();foods.remove();
 knowledge.querySelector('.card-header-simple').remove();foods.querySelector('.card-header-simple').remove();
 const items=Array.from(knowledge.querySelectorAll('.suggestion-item'));
 if(items.length>2){const extra=node('details','','care-extra');extra.append(node('summary','再看一条'));items.slice(2).forEach(item=>extra.append(item));knowledge.querySelector('.suggestions-list').append(extra);}
 // A single page-wide boundary replaces repeated disclaimers on each food tile.
 foods.querySelectorAll('.food-benefit').forEach(el=>el.hidden=true);
 const groupHost=node('div','','body-care-card');intro.after(groupHost);
 NutriCare.mount(groupHost,[
  {label:'营养',render:()=>knowledge},
  {label:'食物',render:()=>foods},
  {label:'养护',render:()=>NutriCare.actions(guide.habits)},
  {label:'更多',render:()=>{const box=node('div');box.append(node('p',guide.note,'care-note'));if(provenance)box.append(provenance);box.append(NutriCare.sources(guide.sources));return box;}}
 ],'body-care');
 tip.remove();
 // Replace unavailable account cards with a visibly labelled, read-only demo journey.
 ['.hero-card','.trend-card','.metrics-card','.ai-card','.achievements-card','.footer-actions'].forEach(selector=>{const el=document.querySelector(selector);if(el)el.remove();});
 const records=mountBodyNutrition(info,node);intro.before(records);
 const notice=document.querySelector('.adapt-notice');notice.firstChild.textContent='沈先生 · 固定演示样本';
 const boundary=node('p','数值为编写的合成示例，目标仅用于演示比较，不是您的实测或个体营养建议；低于示例目标不等于营养缺乏。计划不会自动记为已食用。','body-reading-note');records.after(boundary);
 const share=document.querySelector('[data-tap="shareOrgan"]');if(share){share.dataset.unavailableAction='shareOrgan';share.removeAttribute('data-tap');share.setAttribute('aria-disabled','true');share.setAttribute('aria-label','分享尚未连接');}
}

// Existing seven-day health seed totals, not a second personal-account store.
// Fixture source: health-demo-model.js seed(), day i=6: 420+650+540 kcal.
function bodyNutritionSnapshot(){
 const fixture={name:'沈先生',source:'合成预设 · 非实测',meals:3,
  rows:[{key:'kcal',label:'能量',unit:'kcal',current:1610,target:2000,add:350},
   {key:'protein',label:'蛋白质',unit:'g',current:79,target:90,add:15},
   {key:'carb',label:'碳水化合物',unit:'g',current:191,target:250,add:45},
   {key:'fat',label:'脂肪',unit:'g',current:51,target:65,add:12}],
  unknown:['膳食纤维','钙','铁','维生素 C'],
  history:[1520,1535,1550,1565,1580,1595,1610]};
 const api=window.NutriPresetDemo;
 if(api&&typeof api.snapshot==='function'){
  const state=api.snapshot();
  if(state&&Array.isArray(state.meals)&&typeof state.demoDate==='string'){
   const today=state.meals.filter(m=>m.date===state.demoDate);fixture.meals=today.length;fixture.records=Array.isArray(state.records)?state.records.length:0;
   fixture.rows=fixture.rows.map(row=>{const known=today.filter(m=>typeof m[row.key]==='number'&&Number.isFinite(m[row.key])&&m[row.key]>=0);return {...row,current:known.length?Math.round(known.reduce((sum,m)=>sum+m[row.key],0)*10)/10:null,known:known.length,total:today.length};});
   const dates=[...new Set(state.meals.map(m=>m.date).filter(date=>typeof date==='string'))].sort().slice(-7);
   fixture.history=dates.map(date=>{const meals=state.meals.filter(m=>m.date===date&&typeof m.kcal==='number'&&Number.isFinite(m.kcal)&&m.kcal>=0);return meals.length?meals.reduce((sum,m)=>sum+m.kcal,0):null;});
   fixture.source='合成预设 · '+state.demoDate+' · 非实测';
  }
 }
 return fixture;
}
function bodyNutritionCompare(row,planned){
 const known=typeof row.current==='number'&&Number.isFinite(row.current)&&row.current>=0;
 const targetKnown=typeof row.target==='number'&&Number.isFinite(row.target)&&row.target>0;
 const value=known?Math.round((row.current+(planned&&Number.isFinite(row.add)&&row.add>=0?row.add:0))*10)/10:null;
 const gap=known&&targetKnown?Math.max(0,Math.round((row.target-value)*10)/10):null;
 return {value,gap,percent:known&&targetKnown?Math.max(0,Math.min(100,Math.round(value/row.target*100))):null,
  status:!known?'未记录，不能判断':!targetKnown?'未设置比较目标':gap>0?'距示例目标还差 '+gap+' '+row.unit:'已达到示例目标'};
}
const bodyNutritionGeneratedPlans=new Set();
function mountBodyNutrition(info,node){
 const snapshot=bodyNutritionSnapshot();
 const planKey=JSON.stringify([info.key,snapshot.source,snapshot.rows.map(row=>row.current)]);
 const section=node('section','','body-nutrition-demo');section.setAttribute('aria-label','沈先生的固定预设营养摄入');
 section.append(node('p',snapshot.name+' · '+snapshot.source,'nutrition-demo-eyebrow'));
 section.append(node('h2','沈先生预设摄入，离计划还差多少？'));
 section.append(node('p','固定演示样本 '+snapshot.meals+' 餐 · '+(snapshot.rows[0].current===null?'能量未记录':'已知能量 '+snapshot.rows[0].current+' kcal')+'。下面比较的是展示目标，不是身体缺乏检测。','nutrition-demo-note'));
 const relevant={muscle:'蛋白质',skin:'蛋白质',bone:'钙',eyes:'维生素',intestine:'膳食纤维'}[info.key];
 if(relevant)section.append(node('p',info.name+'关联关注：'+relevant+'；部位选择不会改变摄入记录或生成器官健康分数。','nutrition-demo-note'));
 const cards=node('div','','nutrition-demo-grid');
 snapshot.rows.forEach(row=>{
  const current=bodyNutritionCompare(row,false),card=node('article','','nutrition-demo-metric');
  card.append(node('h3',row.label),node('strong',current.value===null?'未记录':current.value+' '+row.unit),node('span',' / 示例目标 '+row.target+' '+row.unit,'nutrition-demo-note'));
  const progress=node('progress');progress.max=100;if(current.percent!==null){progress.value=current.percent;progress.setAttribute('aria-label',row.label+'达到示例目标的 '+current.percent+'%');card.append(progress);}
  card.append(node('p',current.status,'nutrition-demo-gap'));if(row.known!==undefined&&row.known<row.total)card.append(node('p','仅 '+row.known+'/'+row.total+' 餐有此字段，未记录部分不算零。','nutrition-demo-note'));cards.append(card);
 });section.append(cards);
 section.append(node('p','未记录字段：'+snapshot.unknown.join('、')+'。没有记录不等于摄入为零，也不能判断不足。','nutrition-demo-unknown'));
 const history=node('details','','nutrition-demo-history');history.append(node('summary','近 7 天预设摄入（不是健康评分）'));
 const list=node('ol');snapshot.history.forEach((value,i)=>list.append(node('li','示例第 '+(i+1)+' 天：'+(value===null?'未记录':value+' kcal'))));history.append(list);section.append(history);
 const plan=node('div','','nutrition-demo-plan');plan.append(node('h3','看看按计划吃后的变化'),node('p','离线也能生成预设方案。只演示摄入变化，不预测皮肤、器官或疾病改善。','nutrition-demo-note'));
 const button=node('button','生成我的预设计划','nutrition-demo-generate');button.type='button';
 const result=node('div','','nutrition-demo-result');result.hidden=true;result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 const showPlan=()=>{
  bodyNutritionGeneratedPlans.add(planKey);
  result.replaceChildren();
  result.append(node('h4','预设计划已生成 · 非 AI 实时生成'),node('p','备选加餐：燕麦酸奶杯与水果。先核对奶类、谷物等食材限制；这是未食用的组合示例。'),node('p','展示增量：350 kcal、蛋白质 15 g、碳水 45 g、脂肪 12 g。编写值，非食物数据库计算。','nutrition-demo-note'));
  snapshot.rows.forEach(row=>{const projected=bodyNutritionCompare(row,true);result.append(node('p',row.label+'：'+(row.current===null?'未记录':row.current)+' → '+(projected.value===null?'无法估算':projected.value+' '+row.unit)+'；'+projected.status,'nutrition-demo-projection'));});
  result.append(node('p','预计值 = 当前预设摄入 + 方案展示增量。只生成计划，没有新增饮食记录。','nutrition-demo-note'));
  result.hidden=false;button.textContent='重新生成预设计划';button.setAttribute('aria-expanded','true');
 };button.addEventListener('click',showPlan);button.setAttribute('aria-expanded','false');if(bodyNutritionGeneratedPlans.has(planKey))showPlan();plan.append(button,result);section.append(plan);
 const actions=node('div','','nutrition-demo-actions');[['saveRecord','记录一次演示状态'],['exportData','导出演示数据']].forEach(([action,label])=>{const control=node('button',label);control.type='button';control.dataset.tap=action;actions.append(control);});section.append(actions);if(snapshot.records)section.append(node('p','本页已记录 '+snapshot.records+' 次演示状态；不等于新增餐食。','nutrition-demo-note'));
 const link=node('a','去饮食册查看与记录 →','nutrition-demo-record-link');link.href='intake.html';section.append(link,node('p','本页为固定预设；饮食册编辑不会实时同步到本页。','nutrition-demo-note'));
 return section;
}
