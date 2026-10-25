/* Browser-only presentation over NutriDemo. Local synthetic records, no service simulation. */
(function(root){'use strict';
const M=root.NutriHealthDemo,E=root.NutriRegistrationEntry,D=root.NutriInquiryDrafts;
// Local immutable envelopes. The shared entry owns the single pending command.
const BUILD='registration-web-v3-c1',FIELDS=['mode','accountId','protocolVersion','epoch','generation','revision'];
const clone=value=>JSON.parse(JSON.stringify(value));
const stable=value=>value&&typeof value==='object'?(Array.isArray(value)?'['+value.map(stable).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'):JSON.stringify(value);
const same=(a,b)=>stable(a)===stable(b);
const contextOf=s=>Object.fromEntries(FIELDS.map(k=>[k,s.meta[k]]));
const sameContext=(a,b,revision=true)=>!!a&&!!b&&FIELDS.every(k=>!revision&&k==='revision'||a[k]===b[k]);
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function currentState(store,s){try{return !!s&&sameContext(contextOf(s),store.context());}catch(_){return false;}}
function rowMatches(rows,row,key='id'){const selected=rows.filter(r=>r[key]===row[key]);return selected.length===1&&same(selected[0],row);}
function healthPostcondition(h,input){
 if(input.type==='inquiry-draft')return !!D&&D.matches(h,input);
 if(input.type==='reminder')return rowMatches(h.reminders,input.row);
 if(input.type==='append'||input.type==='edit')return input.rows.every(row=>rowMatches(h[input.list]||[],row));
 if(input.type==='recipe')return h.recipeSelections.filter(id=>id===input.id).length===1;
 if(input.type==='check'){const rows=h.reminderChecks.filter(r=>r.reminderId===input.row.reminderId&&r.date===input.row.date);return rows.length===1&&same(rows[0],input.row);}
 if(input.type==='toggle'){const rows=h.reminders.filter(r=>r.id===input.id);return rows.length===1&&rows[0].enabled===input.enabled&&same(rows[0],input.row);}
 return false;
}
function reconcileHealth({state,input,context}){
 const changed={status:'changed',message:'当前记录或账号已变化；原操作回执未确认。请明确停止重试并重新核对，不能自动套用新版本。'};
 if(!state||!state.health||!sameContext(contextOf(state),context,false))return changed;
 if(sameContext(contextOf(state),context)&&same(state,input.base))return {status:'base',message:'当前根记录仍与本次原始版本一致，可明确重试原输入；尚未取得原操作回执。'};
 if(state.meta.revision!==context.revision+1||!healthPostcondition(state.health,input))return changed;
 return {status:'match',message:'当前记录与本次输入一致，原操作回执未确认'};
}
function reminderState(row){
 if(!row||row.enabled!==undefined&&typeof row.enabled!=='boolean'||row.withdrawn!==undefined&&typeof row.withdrawn!=='boolean')throw Error('提醒状态无效，请核对原记录');
 return {enabled:row.enabled!==false,withdrawn:row.withdrawn===true};
}
function reminderRecord(values,original,newId){
 const prior=original?reminderState(original):{enabled:true,withdrawn:false};
 const checked=M.validateReminder({kind:values.kind,time:values.time,label:values.label,enabled:prior.withdrawn?false:prior.enabled});
 if(checked.kind==='medication'&&!['user','instruction'].includes(values.enteredBy))throw Error('请选择用户自录或既有医嘱录入（合成、未验证）');
 return {...original,id:original?.id||newId,...checked,synthetic:true,withdrawn:false,enteredBy:checked.kind==='medication'?values.enteredBy:'user',source:checked.kind==='medication'?(values.enteredBy==='instruction'?'既有医嘱的合成录入；来源未验证；非处方':'用户自录的合成安排；来源未验证；非处方'):checked.source};
}
function applyHealth(h,input,tx){
 if(input.type==='inquiry-draft'){if(!D)throw Error('草稿模块未就绪，未保存');return D.apply(h,input,tx);}
 if(input.type==='reminder'){
  const rows=h.reminders.filter(r=>r.id===input.row.id);
  if(input.original){if(rows.length!==1||!same(rows[0],input.original))throw Error('提醒已变化，请重新打开核对');reminderState(rows[0]);}
  else if(rows.length)throw Error('提醒标识已存在，请核对原结果');
  reminderState(input.row);
  if(input.original)h.reminders[h.reminders.indexOf(rows[0])]=clone(input.row);else h.reminders.push(clone(input.row));return null;
 }

 if(input.type==='append'){
  if(input.list==='messages'&&h.messages.length+input.rows.length>120)throw Error('演示对话已达上限，请在设置中明确重置后继续。');
  const rows=h[input.list]||(h[input.list]=[]);if(input.rows.some(row=>rows.some(r=>r.id===row.id)))throw Error('原记录标识已存在，请核对原操作结果。');
  input.rows.forEach(row=>rows.push(clone(row)));return null;
 }
 if(input.type==='edit'){const rows=h[input.list];const targets=rows.filter(r=>r.id===input.rows[0].id);if(targets.length!==1)throw Error('原编辑目标已不存在或不唯一，不能自动新增。');rows[rows.indexOf(targets[0])]=clone(input.rows[0]);return null;}
 if(input.type==='recipe'){const n=h.recipeSelections.filter(id=>id===input.id).length;if(n>1)throw Error('备选记录重复，请核对。');if(n===1)return tx.noop(null);h.recipeSelections.push(input.id);return null;}
 if(input.type==='check'){const targets=h.reminders.filter(r=>r.id===input.row.reminderId);if(targets.length!==1)throw Error('提醒不存在或不唯一');const rs=reminderState(targets[0]);if(!rs.enabled||rs.withdrawn)throw Error('提醒已暂停或撤回，不能打卡');const rows=h.reminderChecks.filter(r=>r.reminderId===input.row.reminderId&&r.date===input.row.date);if(rows.length){if(rows.length===1&&same(rows[0],input.row))return tx.noop(null);throw Error('打卡记录已变化，请核对。');}h.reminderChecks.push(clone(input.row));return null;}
 if(input.type==='toggle'){const rows=h.reminders.filter(r=>r.id===input.id);if(rows.length!==1)throw Error('提醒不存在或不唯一');rows[0].enabled=input.enabled;return null;}
 throw Error('不支持的健康记录操作');
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Presentation-only mapping; existing recipe identities and records remain unchanged.
const RECIPE_ART=Object.freeze({
 'shrimp-quinoa':'../assets/recipes/shrimp-quinoa-original.png',
 'salmon-rice':'../assets/recipes/salmon-rice-original.png',
 'tofu-soup':'../assets/recipes/tofu-soup-original.png',
 'chicken-grain':'../assets/recipes/chicken-grain-original.png'
});
const ART_NOTICE='AI原创示意图，非实拍';
function recipeArt(r,detail=false){const src=RECIPE_ART[r.id];return `<span class="hd-food-art hd-recipe-art${detail?' hd-recipe-art-detail':''}"><span class="hd-recipe-art-fallback" aria-hidden="true">${esc(r.emoji)}</span>${src?`<img data-recipe-art="${esc(r.id)}" src="${src}" alt="${esc(r.name)} · ${ART_NOTICE}" width="1254" height="1254" loading="lazy" decoding="async">`:''}</span>`;}
function mealPresetPreview(health){
 const available=health.meals.filter(m=>m.synthetic===true&&M.validDate(m.date));
 let date=health.demoDate,rows=available.filter(m=>m.date===date),origin='当前演示日已有合成记录';
 if(!rows.length&&available.length){date=available.map(m=>m.date).sort().at(-1);rows=available.filter(m=>m.date===date);origin='当前演示日没有餐食记录；以下回看其他日期已有合成样例';}
 if(!rows.length){const preset=M.seed({localDate:'2026-10-22'});date=preset.demoDate;rows=preset.meals.filter(m=>m.date===date);origin='当前账户没有可展示餐食；以下为固定合成样例，未写入账户';}
 const number=(v,unit)=>Number.isFinite(v)&&v>=0?esc(v)+' '+unit:'未知';
 return `<p class="hd-alert">本机预设演示：未读取、上传或识别照片；不是图像识别结果、营养诊断或新增摄入。</p><p>当前合成演示日 ${esc(health.demoDate)} · ${esc(origin)}。</p><p>样例日期 ${esc(date)} · 展示 ${rows.length} 条</p><ul class="hd-list">${rows.map(m=>`<li><div><strong>${esc(m.name)}</strong><small>${esc(m.date)} ${esc(m.time||'')} · ${esc(({breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'})[m.slot]||'餐食')}</small><small>记录份量：${number(m.grams,'g')} · 记录热量：${number(m.kcal,'kcal')}</small><small>蛋白质：${number(m.protein,'g')} · 碳水：${number(m.carb,'g')} · 脂肪：${number(m.fat,'g')}</small></div></li>`).join('')}</ul><p class="hd-muted">数值只来自所展示的合成记录；未知不等于 0。请人工核对菜名、份量与营养值；只有在手工记录表单明确确认保存后，才会新增演示记录。</p>`;
}
function mountReady(host,options={}){
 const store=options.store||root.NutriDemo;if(!host||!store||!M)throw Error('演示核心未就绪');
 if(!E||E.buildId!=='registration-entry-v3-c1'||store.protocolVersion!==3)throw Error('注册演示入口版本不匹配');
 let foodCapture=null; let state=store.read(),health=state.health,view=options.initialView==='dashboard'?'dashboard':document.getElementById('ai-reference-home')?'home':'chat',sheet=null,seq=0,lastFocus=null,recipeReturn=null,recognitionReturn=null,unsub=null,sheetRevision=null,sheetContext=null,sheetState=null,busy=false,active=true,pageVersion=0,dirty=false,authority=true,deferred=false,sheetRetired=false,reminderReview=null;
 let selectedDraftId=null;
 let metricSelection={metric:'weight',range:'30'};
 const llmService=root.NutriLLMStatus.create();
 const avatar='images/nutrition-companion-photo-v2.png';
 const id=()=> 'demo-'+Date.now()+'-'+(++seq)+'-'+Math.random().toString(36).slice(2,10);
 const $=s=>host.querySelector(s);
 const time=()=>new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
 const status=t=>{const node=$('.hd-status');if(node)node.textContent=t;else E.report(t);};
 const pageGuard=()=>active&&(!options.guard||options.guard());
 const dirtyNow=()=>dirty||!!$('.hd-composer textarea')?.value;
 function setDisabled(value){host.querySelectorAll('.hd-sheet-panel input,.hd-sheet-panel select,.hd-sheet-panel textarea,.hd-composer textarea,button[type="submit"]').forEach(b=>b.disabled=value||sheetRetired);}
 function fail(error){if(!pageGuard())return;const stale=error.code==='STALE_REVISION'||error.message==='STALE_REVISION',message=stale?'其他页面更新了合成账号，本次保存未覆盖新记录。请先核对最新记录，再重新确认保存。':error.message||'操作结果尚未核对。';status(message+' 当前填写保留。');const panel=$('.hd-sheet-panel');if(sheet&&panel){let el=panel.querySelector('[data-save-error]');if(!el){el=document.createElement('p');el.dataset.saveError='';el.setAttribute('role','alert');panel.append(el);}el.textContent=message+' 当前填写保留。';if(stale&&sheet==='reminders'&&!E.hasPending()&&!panel.querySelector('[data-reminder-recover]')){const action=document.createElement('button');action.type='button';action.dataset.hd='review-reminder-latest';action.dataset.healthView=String(pageVersion);action.dataset.reminderRecover='';action.className='hd-primary';action.textContent='核对最新记录（保留填写）';panel.append(action);}}}
 function present(next,nextView=view){const previous={state,health,view};state=next;health=next.health;view=nextView;try{if(!renderStream())throw Error('最终显示未能核对，请刷新；写入结果请以回执与当前记录为准。');authority=true;const toggle=$('[data-hd="dashboard"]');if(toggle)toggle.textContent=view==='dashboard'?'聊天':'健康';return true;}catch(e){state=previous.state;health=previous.health;view=previous.view;authority=false;fail(e);return false;}}
 function fresh(){try{const next=store.read();if(!currentState(store,next))throw Error('记录再次变化，请明确刷新后核对。');return present(next);}catch(e){authority=false;fail(e);return false;}}
 function accept(receipt,success,nextView=view){if(!pageGuard()||!receipt?.state||typeof receipt.committed!=='boolean')return false;if(!currentState(store,receipt.state)){authority=false;fresh();status('已有更新的数据；旧操作结果未用于清空填写，请刷新核对。');return false;}if(!present(receipt.state,nextView)){status('操作回执已核验，最终显示未能核对。当前填写和原始版本保留，请刷新核对。');return false;}deferred=false;if(!E.hasPending()&&currentState(store,receipt.state))E.report('本次健康操作回执已核对 · 合成账号版本 '+receipt.state.meta.revision);success?.(receipt);return true;}
 async function mutate(command,context,success,base,nextView=view){
  if(busy||!pageGuard()||E.hasPending())return false;if(!currentState(store,state)){authority=false;fail(Error('当前显示版本不可核验，请刷新核对；填写保留。'));return false;}
  const ticket=pageVersion,input=freeze(clone({...command,base:base||state})),captured=freeze(clone(context||contextOf(state)));
  busy=true;setDisabled(true);
  try{return await E.execute({kind:'health:'+command.type+':'+(command.list||''),context:captured,input,guard:()=>pageGuard()&&ticket===pageVersion,
   run:({input,context})=>store.transact((s,tx)=>applyHealth(s.health,input,tx),{context,expectedRevision:context.revision,guard:()=>pageGuard()&&ticket===pageVersion,reason:'health:'+input.type,recoverAck:input.type==='inquiry-draft'||input.type==='append'&&input.list==='messages'}),
   onSuccess:result=>{if(command.type==='inquiry-draft'&&(!result?.state||!D.matches(result.state.health,input))){fail(Error('草稿保存回执不匹配，填写保留；请核对当前记录'));return false;}return accept(result,success,nextView);},onError:fail,reconcile:reconcileHealth});
  }finally{busy=false;if(pageGuard())setDisabled(E.hasPending());if(deferred&&!E.hasPending()){deferred=false;fresh();}}
 }
 function navigate(route){if(!E.confirmLeave(dirtyNow(),'离开会丢失本页填写和原操作重试身份；已发生的写入不会撤销。是否继续？'))return;if(options.navigate)options.navigate(route);else root.location.href=route;}
 function card(title,body,action=''){return `<section class="hd-card"><div class="hd-card-content"><div class="hd-card-head"><h2>${title}</h2>${action}</div>${body}</div></section>`;}
 function button(label,action,cls='hd-link',extra=''){return `<button type="button" class="${cls}" data-hd="${action}" ${extra}>${label}</button>`;}
 function recipeGrid(){return `<div class="hd-grid">${M.RECIPES.map(r=>`<button type="button" class="hd-recipe" data-hd="recipe" data-id="${r.id}">${recipeArt(r)}<strong>${esc(r.name)}</strong><small>${r.minutes} 分钟 · ${ART_NOTICE}</small></button>`).join('')}</div>`;}
 function nutritionCard(){const s=M.mealSummary(health,health.demoDate);return card('今日营养摄入',`<p>${health.demoDate} · 合成演示数值，非实际摄入</p>${[['carb','碳水','g'],['fat','脂肪','g'],['protein','蛋白','g']].map(([key,label,unit],i)=>`<div class="hd-metric-row"><div class="hd-metric-label"><strong>${['🟢','🟠','🟣'][i]} ${label}</strong><span>${s.totals[key].value??'未知'} ${unit}</span></div><div class="hd-track" aria-hidden="true"><div class="hd-fill" style="width:${s.totals[key].known/s.totals[key].total*100||0}%"></div></div><small class="hd-muted">有数值记录 ${s.totals[key].known}/${s.totals[key].total} · 条目覆盖，非目标达成率</small></div>`).join('')}${button('＋ 添加演示食物记录','meal','hd-primary hd-full')}`,button('查看详情 ›','records'));}
 function remindersCard(){const done=health.reminderChecks.filter(c=>c.date===health.demoDate),rows=health.reminders.filter(r=>r.enabled!==false&&!r.withdrawn);return `<section class="original-reminder-group" aria-label="今日合成提醒"><div class="sys-head"><h2 class="sys-title">今日提醒</h2>${button('设置 ›','reminders','sys-btn ghost')}</div><p class="reminder-sub">${esc(health.demoDate)} · 仅本页合成提醒；关闭后不会通知，用药安排仅来自明确自录。</p>${rows.map(r=>`<article class="sys-card reminder-card"><div class="reminder-head"><div class="reminder-head-left"><div class="reminder-icon"><img class="reminder-icon-img" src="static/aiAgentPage/clock.svg" alt=""></div><div class="reminder-head-text"><div class="reminder-title-row"><strong class="reminder-title">${esc(r.label)}</strong><span class="reminder-pill">${done.some(c=>c.reminderId===r.id)?'已打卡':'待演示打卡'}</span></div><small class="reminder-sub">${r.kind==='medication'?'非处方、无剂量建议':'本机演示安排'}</small></div></div><time class="reminder-time">${esc(r.time)}</time></div><p class="reminder-body">${r.kind==='medication'?'仅演示自录安排，打卡不证明真实服药或进餐。':'明确点击才记录本演示日打卡；不触发后台通知。'}</p><div class="sys-actions reminder-actions">${done.some(c=>c.reminderId===r.id)?'<span class="reminder-pill">本演示日已打卡</span>':button('打卡','check','sys-btn',`data-id="${esc(r.id)}"`)}</div></article>`).join('')}${rows.length?'':'<p class="reminder-body">本演示日没有启用的合成安排；暂停或撤回的记录仍可在设置中查看，不代表真实生活没有提醒。</p>'}</section>`;}
 function reportsCard(){const meal=M.mealSummary(health,health.demoDate),w=M.trend(health.metrics,'weight'),water=health.water.filter(w=>w.date===health.demoDate).reduce((n,w)=>n+w.ml,0);return `<section class="sys-card summary-card2" aria-label="当前合成记录小回顾"><div class="summary-head"><div class="summary-head-left"><div class="summary-icon"><img class="summary-icon-img" src="static/aiAgentPage/clock.svg" alt=""></div><div class="summary-head-text"><h2 class="summary-title">今天的小回顾</h2><span class="summary-sub">沈先生 · 合成记录，非 AI 分析</span></div></div><time class="sys-time">${esc(health.demoDate)}</time></div><div class="sys-body"><p>本演示日已记录 ${esc(meal.count)} 餐 · 演示饮水 ${esc(water)} ml。</p><p>最近体重记录 ${esc(w.latest?.value??'未知')} kg。只展示记录变化，不判断健康状况或疗效。</p></div><div class="sys-actions">${button('看指标趋势','metrics','sys-btn ghost')}${button('看饮食记录','records','sys-btn ghost')}</div></section>`;}
 function renderMessages(){if(root.NutriHealthCompanionGlass)return root.NutriHealthCompanionGlass.renderMessages({health,model:M});return health.messages.map(m=>`<article class="timeline-item"><div class="message-row ${m.role==='user'?'user-row':''}">${m.role==='user'?'':`<img class="message-avatar" src="${avatar}" alt="">`}<div class="message-bubble ${m.role==='user'?'user-bubble':'ai-bubble'}"><span class="message-text">${esc(m.text)}</span>${m.choices?.length?`<div class="quick-reply-list hd-choices">${m.choices.map(t=>button(esc(t),'say','',`data-text="${esc(t)}"`)).join('')}</div>`:''}<time class="message-time">${esc(m.date||health.demoDate)} ${esc(m.time)} · ${m.source==='synthetic-fixture'?'预设合成对话':m.role==='user'?'本机演示输入':'规则回复'}</time></div>${m.role==='user'?'<span class="message-avatar original-self" aria-label="合成沈先生">沈</span>':''}</div></article>${m.kind==='recipes'?card('养生食谱推荐','<p>通用做法示例；请先核对过敏原与医嘱限制。</p>'+recipeGrid(),button('全部食谱 ›','recipes')):m.kind==='report'?reportsCard():m.kind==='reminders'?remindersCard():m.kind==='water'?card('喝水，记一小步','<p>明确确认后才增加记录，聊天文字不会自动计量。</p>'+button('记录 250 ml 演示饮水','water','hd-primary')):''}`).join('');}
 function renderStream(){if(!pageGuard()||!currentState(store,state)){authority=false;return false;}const stream=$('.hd-stream');const near=stream.scrollHeight-stream.scrollTop-stream.clientHeight<100;const oldTop=stream.scrollTop;const html=['drafts','draft','unsent'].includes(view)?renderInquiryView():view==='home'?document.getElementById('ai-reference-home').innerHTML:`<div class="timeline-wrapper"><div class="hd-day">${health.demoDate} · 沈先生 / 合成账号</div>${view==='chat'?`${renderMessages()}`:nutritionCard()+card('智能菜品识别','<p>查看已有合成餐食样例；本机预设，非图像识别，不读取或上传照片。</p>'+button('查看预设餐食结果','recognition','hd-primary hd-full'))+card('养生食谱推荐','<p>AI原创示意图，非实拍；食谱为通用展示。</p>'+recipeGrid(),button('全部食谱 ›','recipes'))+remindersCard()+reportsCard()}</div>`;if(!currentState(store,state)){authority=false;return false;}stream.innerHTML=html;const page=$('.nutri-original-ai');if(page)page.dataset.hdView=view;syncInquiryComposer();if(view==='home'||['drafts','draft','unsent'].includes(view))stream.scrollTop=0;else if(near||view==='chat')stream.scrollTop=stream.scrollHeight;else stream.scrollTop=oldTop;return true;}
 function render(){if(!pageGuard()||!currentState(store,state)){authority=false;return false;}const template=document.getElementById('original-demo-frame');if(!template)throw Error('原 AI 模板未加载，未启用替代页面');const shortcuts=[['问询草稿','drafts'],['本机规则演示','chat'],['刷新记录','refresh'],['记一餐','meal'],['今日食谱','recipes'],['回顾','report'],['喝水','water'],['提醒','reminders'],['指标','metrics'],['日常自述','daily'],['随访','conditions'],['周报','weekly']].map(([l,a])=>button(l,a,'manager-chip')).join('');const html=template.innerHTML.replace('@@SERVICE@@',esc(llmService.status().label)).replace('@@SHORTCUTS@@',shortcuts);if(!currentState(store,state)){authority=false;return false;}host.innerHTML=html;document.body.dataset.nutriChatReady="true";return renderStream();}
 function recipeFocusTarget(node){if(!node?.isConnected||!host.contains(node)||node.closest('.hd-sheet')||node.disabled||node.closest('fieldset[disabled]')||node.matches('input,textarea,select'))return false;for(let n=node;n;n=n.parentElement){if(n.hidden||n.hasAttribute('inert')||n.getAttribute('aria-hidden')==='true')return false;}const style=root.getComputedStyle?.(node);return style?.visibility!=='hidden'&&style?.visibility!=='collapse'&&node.getClientRects().length>0;}
 function restoreRecipeFocus(point,ticket,fallback='.hd-shortcuts [data-hd="recipes"]'){const valid=()=>{if(!point||!pageGuard()||pageVersion!==ticket||sheet!==null)return false;try{return sameContext(point.context,store.context(),false);}catch(_){return false;}};if(!valid())return;const candidates=[point.node,$(fallback),$('.hd-stream')];for(const node of candidates){if(!valid())return;if(!recipeFocusTarget(node))continue;if(!valid())return;try{node.focus({preventScroll:true});}catch(_){/* A failed focus must not affect closing or draft data. */}if(!valid())return;if(document.activeElement===node)return;}}
 function open(title,html,kind,forced=false,invoker=null){if(!pageGuard())return;if(!forced&&!E.confirmLeave(dirty,'放弃当前未保存填写并打开另一面板？'))return;if(!currentState(store,state)){authority=false;status('当前显示版本已变化，请先刷新核对；填写保留。');return;}const recipeKind=kind==='recipes'||kind==='recipe';if(recipeKind){if(sheet!=='recipes'&&sheet!=='recipe')recipeReturn=invoker?.matches('button')&&recipeFocusTarget(invoker)?{node:invoker,context:freeze(contextOf(state))}:null;}else recipeReturn=null;if(kind==='recognition'){if(sheet!=='recognition')recognitionReturn=invoker?.matches('button')&&recipeFocusTarget(invoker)?{node:invoker,context:freeze(contextOf(state))}:null;}else if(!(kind==='meal'&&sheet==='recognition'&&invoker?.closest('.hd-sheet-panel')))recognitionReturn=null;foodCapture?.dispose();foodCapture=null;lastFocus=document.activeElement;sheet=kind;pageVersion++;reminderReview=null;dirty=false;sheetRetired=false;sheetRevision=state.meta.revision;sheetContext=freeze(contextOf(state));sheetState=clone(state);const wrapper=$('.hd-sheet');wrapper.hidden=false;$('.hd-sheet-panel').innerHTML=`<div class="hd-sheet-head"><h2 id="hd-sheet-title">${esc(title)}</h2>${button('关闭','close','hd-icon-button','aria-label="关闭面板"')}</div>${html}`;$('.hd-sheet-panel').querySelectorAll('form').forEach(f=>f.dataset.healthEditor=String(pageVersion));$('.hd-sheet-panel').querySelectorAll('[data-hd]').forEach(b=>b.dataset.healthView=String(pageVersion));setDisabled(busy||E.hasPending());$('.hd-sheet-panel button')?.focus();}
 function close(forced=false){if(!forced&&!E.confirmLeave(dirty,'放弃当前未保存填写并关闭面板？'))return false;const recipeKind=sheet==='recipes'||sheet==='recipe',returnPoint=recipeReturn,recognitionKind=sheet==='recognition'||sheet==='meal'&&!!recognitionReturn,recognitionPoint=recognitionReturn;foodCapture?.dispose();foodCapture=null;recipeReturn=null;recognitionReturn=null;pageVersion++;reminderReview=null;sheet=null;dirty=false;sheetRetired=false;$('.hd-sheet').hidden=true;setDisabled(busy||E.hasPending());if(recipeKind){if(!forced)restoreRecipeFocus(returnPoint,pageVersion);}else if(recognitionKind){if(!forced)restoreRecipeFocus(recognitionPoint,pageVersion,'.hd-stream [data-hd="recognition"]');}else {const action=lastFocus?.dataset?.hd;restoreRecipeFocus({node:lastFocus,context:sheetContext},pageVersion,['records','settings'].includes(action)?'.ai-home15-action[data-hd="'+action+'"]':'.hd-stream');}return true;}
 async function sendRule(text,fromComposer=false,after){if(busy||E.hasPending())return;const submittedRaw=text;try{text=M.clean(text);}catch(e){status(e.message);return;}
  const r=M.reply(text,{turn:health.messages.filter(m=>m.role==='user').length}),sentTime=time(),date=health.demoDate;
  const rows=[{id:id(),role:'user',text,date,time:sentTime,synthetic:true,source:'user-demo-entry'},{id:id(),role:'assistant',...r,date,time:sentTime,synthetic:true,source:'local-rule-reply'}];
  return mutate({type:'append',list:'messages',rows},contextOf(state),()=>{if(fromComposer&&$('.hd-composer textarea').value===submittedRaw){$('.hd-composer textarea').value='';syncComposer(null);}status(store.status().persistent?'已保存到本机合成账号。':'仅保留在当前页面内存，刷新或离开后丢失。');after?.();},undefined,'chat');
 }
 function renderInquiryView(){
  if(!D||!root.NutriHealthCompanionGlass?.renderInquiryDrafts)return '<section class="hcg-draft-view"><h2>草稿暂不可用</h2><p>模块未就绪；未覆盖任何记录。</p></section>';
  try{return root.NutriHealthCompanionGlass.renderInquiryDrafts({health,drafts:D.list(health),selectedId:selectedDraftId,view,persistent:store.status().persistent===true});}catch(e){return '<section class="hcg-draft-view"><h2>草稿暂不可读</h2><p role="alert">'+esc(e.message)+'</p>'+button('返回首页','home')+'</section>';}
 }
 function syncInquiryComposer(){
  const composer=$('.hd-composer'),field=composer?.querySelector('textarea'),submit=composer?.querySelector('button[type="submit"]');if(!composer||!field||!submit)return;
  composer.hidden=['drafts','draft','unsent'].includes(view);field.placeholder=view==='chat'?'输入本机规则演示文字…':'合成问询…';field.setAttribute('aria-label',view==='chat'?'本机规则演示输入，不向 AI 发送':'合成问询草稿内容，不向 AI 发送');submit.textContent=view==='chat'?'运行规则':'保存问询';submit.setAttribute('aria-label',view==='chat'?'运行本机规则并保存演示对话':'保存问询草稿并查看未发送状态');
 }
 function openDraftEditor(draftId=null){
  if(!D){status('草稿模块未就绪，未保存。');return;}try{
   const draft=draftId?D.list(health).find(r=>r.id===draftId):null;if(draftId&&!draft)throw Error('这条草稿不在当前档案，请重新核对');
   open(draft?'编辑问询草稿':'新建问询草稿',root.NutriHealthCompanionGlass.renderInquiryEditor({draft}),'inquiry-draft');
  }catch(e){fail(e);}
 }
 async function saveInquiry(raw,{fromComposer=false,original=null,title='',base=state,context=contextOf(base),attempt=false}={}){
  if(busy||E.hasPending()||!pageGuard())return false;if(!D){status('草稿模块未就绪，未保存。当前填写保留。');return false;}
  let command;try{command=D.command(base.health,{id:id(),text:raw,title,now:new Date().toISOString(),original});}catch(e){fail(e);return false;}
  selectedDraftId=command.row.id;
  return mutate(command,context,receipt=>{
   if(sheet==='inquiry-draft')close(true);
   if(fromComposer&&$('.hd-composer textarea')?.value===raw){$('.hd-composer textarea').value='';syncComposer(null);}
   status(receipt.persistent===true?'草稿已保存到此浏览器的合成账号；未向 AI 发送。':'草稿仅保留在本页临时内存；刷新或离开后丢失，未向 AI 发送。');
  },base,attempt?'unsent':'draft');
 }
 async function send(text,fromComposer=false){if(view==='chat')return sendRule(text,fromComposer);return saveInquiry(text,{fromComposer,attempt:true});}
 function showDraft(draftId,nextView='draft'){
  try{if(!D.list(health).some(r=>r.id===draftId))throw Error('草稿不在当前档案，请重新核对');selectedDraftId=draftId;if(present(state,nextView))$('.hd-stream')?.focus({preventScroll:true});}catch(e){fail(e);}
 }
 function openRecipes(invoker=null){if(root.NutriHealthInsightsGlass){open('通用食谱示例',root.NutriHealthInsightsGlass.renderRecipes({health,model:M}),'recipes',false,invoker);return;}open('通用食谱示例',`<p>没有个性化评估。以下菜谱不保证适合任何健康状况。</p>${recipeGrid()}`,'recipes',false,invoker);}
 function openRecipe(recipeId,invoker=null){const r=M.RECIPES.find(r=>r.id===recipeId);if(!r)return;if(root.NutriHealthInsightsGlass){open(r.name,root.NutriHealthInsightsGlass.renderRecipe({health,model:M,recipeId}),'recipe',false,invoker);return;}open(r.name,`${recipeArt(r,true)}<p class="hd-muted">${ART_NOTICE}；不能据图判断份量、营养或实际熟度与食用安全。</p><p>${r.minutes} 分钟 · 食材：${r.ingredients.map(esc).join('、')}</p><p class="hd-alert">已知食材过敏原：${r.allergens.length?r.allergens.map(esc).join('、'):'未列出；不表示无过敏原'}。调味料及交叉接触需另行核对。</p><ol>${r.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><p>没有从食谱推算已吃份量或营养摄入。选择后只加入演示备选清单。</p>${button(health.recipeSelections.includes(r.id)?'已加入备选':'加入下餐备选','select-recipe','hd-primary',`data-id="${r.id}"`)}`,'recipe',false,invoker);}
 function openWater(){open('记录演示饮水',`<p>今天已记录 ${health.water.filter(w=>w.date===health.demoDate).reduce((n,w)=>n+w.ml,0)} ml。这里不设医学饮水目标；限液安排请遵从专业人员。</p><form data-form="water"><label>单次饮水量（ml）<input name="ml" type="number" min="10" max="2000" value="250" required></label><label class="hd-check"><input name="confirm" type="checkbox" required>确认只录入合成演示数据，保存在此浏览器</label><button class="hd-primary" type="submit">确认记录</button></form>`,'water');}
 function openFoodCapture(invoker=null,start='camera',editId=null){
  const original=editId?health.meals.find(m=>m.id===editId):null;if(editId&&!original){status('原记录不存在，不能新增替代');return;}
  const beforeVersion=pageVersion;open('拍照与饮食记录 · 本机候选','<div data-food-capture-host></div>','food-capture',false,invoker);
  if(pageVersion===beforeVersion||sheet!=='food-capture'||!pageGuard())return;
  const captureVersion=pageVersion,recordId=original?.id||id(),context=clone(sheetContext),base=clone(sheetState);
  foodCapture=root.NutriFoodCaptureView.mount($('[data-food-capture-host]'),{date:health.demoDate,id:recordId,initial:original?clone(original):null,start,isLocked:()=>busy||E.hasPending()||sheetRetired||captureVersion!==pageVersion,onDirty:()=>{dirty=true;},save:async row=>{
    if(captureVersion!==pageVersion||sheetRetired||!pageGuard())throw Error('账号或页面已变化，请重新核对；未保存');
    return mutate({type:original?'edit':'append',list:'meals',rows:[row]},context,()=>{close(true);openRecords();status('合成餐食已保存；照片未保存，未调用识别。');},base);
  }});
 }
 function openMeal(invoker=null){if(root.NutriFoodCaptureView)return openFoodCapture(invoker);open('添加演示餐食',`<p>${health.demoDate} · 不上传、不识别、不自动估算。空白营养值不会当作 0。</p><form data-form="meal"><label>餐次<select name="slot"><option value="breakfast">早餐</option><option value="lunch">午餐</option><option value="dinner">晚餐</option><option value="snack">加餐</option></select></label><label>菜名<input name="name" maxlength="100" required placeholder="例如：青菜豆腐汤"></label><div class="hd-row"><label>演示克数（可空）<input name="grams" type="number" min="1" max="10000"></label><label>演示热量 kcal（可空）<input name="kcal" type="number" min="0" max="5000"></label></div><label class="hd-check"><input name="confirm" type="checkbox" required>只填写合成示例，并同意保存在此浏览器</label><button class="hd-primary" type="submit">保存演示记录</button></form>`,'meal',false,invoker);}
 function nutrientTable(rows){const c=root.NutriFoodCaptureContract;if(!c)return '';const totals=c.summary(rows);return `<details><summary>完整营养 · 已知小计与覆盖</summary><ul class="hd-list">${Object.entries(c.fields).map(([key,[label,unit]])=>`<li>${label}<strong>${totals[key].value===null?'待补充':esc(Math.round(totals[key].value*100)/100)+' '+unit}<small>已知 ${totals[key].known}/${totals[key].total}</small></strong></li>`).join('')}</ul></details>`;}
 function openRecords(){const meals=[...health.meals].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));open('饮食贴纸日记',`<p>合成账号；文字贴纸，不是照片抠图。未记录不等于没有进食。</p><h3>${esc(health.demoDate)} · 已知小计</h3>${nutrientTable(meals.filter(m=>m.date===health.demoDate))}<div class="fc-stickers">${meals.map(m=>`<article class="fc-sticker"><strong>${esc(m.name)}</strong><small>${esc(m.date)} ${esc(m.time)}</small><span>${m.kcal==null?'热量待补充':esc(m.kcal)+' kcal'}</span><small>${m.grams==null?'份量待补充':esc(m.grams)+' g'} · 合成</small>${nutrientTable([m])}${button('编辑记录','food-edit','hd-link',`data-id="${esc(m.id)}"`)}</article>`).join('')}</div>${button('＋ 记录（短按拍照 / 长按文字）','meal','hd-primary hd-full')}${button('文字补录 · 语音未连接','food-manual','hd-link')}${button('查看周统计','weekly','hd-link')}`,'records');}
 function openMetrics(metric=metricSelection.metric,range=metricSelection.range){if(!Object.prototype.hasOwnProperty.call(M.METRICS,metric)||!['7','30','all'].includes(range))return;if(root.NutriHealthInsightsGlass){const before=pageVersion;open('指标与慢病记录容器',root.NutriHealthInsightsGlass.renderMetrics({health,model:M,metric,range}),'metrics');if(pageVersion!==before&&sheet==='metrics')metricSelection={metric,range};return;}const t=M.trend(health.metrics,metric),min=Math.min(...t.rows.map(r=>r.value)),max=Math.max(...t.rows.map(r=>r.value));open('指标与慢病记录容器',`<p>体重、血压、血糖与睡眠均为合成历史；没有病种诊断、风险评分或用药调整。</p><div class="hd-choices">${Object.entries(M.METRICS).map(([k,v])=>button(v.label,'metric-tab','hd-chip',`data-id="${k}"`)).join('')}</div><h3>${esc(t.label)} · ${esc(t.unit)}</h3><p>${t.count} 条记录 · 最近 ${t.latest?.value??'暂无'} ${esc(t.unit)}${t.change===null?'':' · 首末变化 '+(t.change>0?'+':'')+t.change+' '+t.unit}</p><div class="hd-chart" aria-label="${esc(t.label)}记录柱状图，非健康评分">${t.rows.slice(-7).map(r=>`<div class="hd-chart-column"><span>${r.value}</span><i style="height:${30+(r.value-min)/(max-min||1)*55}%"></i><span>${r.date.slice(5)}</span></div>`).join('')}</div><p class="hd-muted">柱高按本组相对范围绘制，不是风险刻度。</p><details><summary>查看数值与记录上下文</summary><ul>${t.rows.map(r=>`<li>${r.date}：${r.value} ${esc(t.unit)} · ${esc(r.context)}</li>`).join('')}</ul></details><h3>添加一条合成指标</h3><form data-form="metric"><div class="hd-row"><label>指标<select name="metric">${Object.entries(M.METRICS).map(([k,v])=>`<option value="${k}" ${metric===k?'selected':''}>${v.label}</option>`).join('')}</select></label><label>日期<input name="date" type="date" value="${health.demoDate}" required></label></div><label>数值<input name="value" type="number" step="any" required></label><label>记录上下文<input name="context" maxlength="80" value="合成演示自述" required></label><label class="hd-check"><input name="confirm" type="checkbox" required>只填合成数据，保存到本机</label><button class="hd-primary" type="submit">保存指标</button></form><h3>可扩展随访</h3>${health.conditions.map(c=>`<p>${esc(c.label)}：${esc(c.note)}</p>`).join('')}`,'metrics');}
 const reminderDraft=f=>Object.fromEntries(['kind','time','label','enteredBy'].map(k=>[k,f.elements[k]?.value||'']));
 function inspectReminderBase(latest,f){
  if(!sameContext(contextOf(latest),sheetContext,false))throw Error('账号已切换或重置，旧填写不能接续。请保留需要的内容后重新打开。');
  const target=f.dataset.editId;if(!target)return null;
  const before=sheetState.health.reminders.filter(r=>r.id===target),after=latest.health.reminders.filter(r=>r.id===target);
  if(before.length!==1||after.length!==1||!same(before[0],after[0]))throw Error('这条提醒已变化、被撤回或不存在，不能套用旧填写。请先保留填写，关闭后重新打开该条核对。');
  return after[0];
 }
 function reviewReminderLatest(){
  const f=$('.hd-sheet-panel form');if(sheet!=='reminders'||!f||sheetRetired||E.hasPending())return;
  try{const latest=store.read();if(!currentState(store,latest))throw Error('记录仍在更新，请稍后重新核对。');const target=inspectReminderBase(latest,f),draft=reminderDraft(f);
   reminderReview={latest:clone(latest),draft:clone(draft),form:f,version:pageVersion};
   let panel=$('[data-reminder-review]');if(!panel){panel=document.createElement('div');panel.dataset.reminderReview='';$('.hd-sheet-panel').append(panel);}
   const describe=r=>`${({meal:'吃饭',water:'喝水',medication:'用药自录'})[r.kind]||r.kind} · ${r.time} · ${r.label} · ${r.kind!=='medication'?'合成演示安排':r.enteredBy==='instruction'?'既有医嘱录入（未验证）':r.enteredBy==='user'?'用户自录（未验证）':'未选择来源'}${r.withdrawn?' · 已撤回（保存恢复后仍暂停）':r.enabled===undefined?'':r.enabled?' · 已启用':' · 已暂停'}`;
   panel.innerHTML=`<h3>核对后再保存</h3><p>当前记录：${target?esc(describe(target)):'这是新增提醒，尚无已保存条目。'}</p><p>保留的填写：${esc(describe(draft))}</p><p>此步骤只更新编辑依据，不保存提醒；你仍需重新勾选合成确认并点保存。</p>${button('确认已核对，继续填写','accept-reminder-latest','hd-primary',`data-health-view="${pageVersion}"`)}${button('取消核对，保留填写','cancel-reminder-review','hd-link',`data-health-view="${pageVersion}"`)}`;
   status('已读取最新记录；填写未保存，请核对上方当前值与填写。');
  }catch(e){reminderReview=null;fail(e);}
 }
 function acceptReminderLatest(){
  const review=reminderReview,f=$('.hd-sheet-panel form');if(!review||f!==review.form||review.version!==pageVersion||sheetRetired||E.hasPending())return;
  try{if(!same(reminderDraft(f),review.draft))throw Error('填写已变化，请重新核对最新记录。');const latest=store.read();if(!sameContext(contextOf(latest),contextOf(review.latest))||!currentState(store,latest))throw Error('核对期间又有更新，请重新核对最新记录。');inspectReminderBase(latest,f);
   if(!present(latest))return;sheetState=clone(latest);sheetContext=freeze(contextOf(latest));sheetRevision=latest.meta.revision;f.elements.confirm.checked=false;dirty=true;reminderReview=null;const panel=$('[data-reminder-review]');if(panel)panel.innerHTML='';
   const message='编辑依据已核对，尚未保存。填写保留；请重新勾选合成确认后保存。';const error=$('[data-save-error]');if(error)error.textContent=message;status(message);
  }catch(e){reminderReview=null;fail(e);}
 }
 function openReminders(editId,forced=false){
 const edit=health.reminders.find(r=>r.id===editId);
 if(editId&&!edit){status('提醒已不存在，请刷新核对。');return;}
if(root.NutriHealthCompanionGlass){open('本页提醒管理',root.NutriHealthCompanionGlass.renderReminders({health,editId}),'reminders',forced);return;}
 open('本页提醒管理',`<p class="hd-alert">仅本机合成演示，未接系统或微信通知。关闭页面不会提醒；打卡不证明真实服药或进餐。暂停或撤回提醒不表示停药。</p><ul class="hd-list">${health.reminders.map(r=>`<li><div><strong>${esc(r.time)} ${esc(r.label)}</strong><small>${r.withdrawn?'已撤回':r.enabled===false?'已暂停':'已启用'} · ${esc(r.source)}</small></div><div class="hd-inline-actions">${button(r.withdrawn?'编辑并恢复':'编辑','edit-reminder','hd-chip',`data-id="${esc(r.id)}"`)}${!r.withdrawn?button(r.enabled===false?'恢复启用':'暂停','toggle-reminder','hd-chip',`data-id="${esc(r.id)}"`)+button('撤回','withdraw-reminder','hd-link',`data-id="${esc(r.id)}"`):''}</div></li>`).join('')}</ul><h3>${edit?'编辑合成安排':'新增合成安排'}</h3>${edit?.withdrawn?'<p class="hd-alert">保存将恢复此条目但保持暂停；需再明确点击恢复启用。历史打卡保留。</p>':''}<form data-form="reminder" data-edit-id="${esc(edit?.id||'')}"><div class="hd-row"><label>类型<select name="kind">${[['meal','吃饭'],['water','喝水'],['medication','用药自录']].map(([v,l])=>`<option value="${v}" ${edit?.kind===v?'selected':''}>${l}</option>`).join('')}</select></label><label>时间<input type="time" name="time" value="${esc(edit?.time||'')}" required></label></div><label>提醒名称<input name="label" value="${esc(edit?.label||'')}" maxlength="80" required placeholder="仅合成名称；不填写真实药品与剂量"></label><label>用药安排来源（用药项必选）<select name="enteredBy"><option value="">请选择，不由系统推断</option>${[['user','用户自录（合成、未验证）'],['instruction','既有医嘱录入（合成、未验证）']].map(([v,l])=>`<option value="${v}" ${edit?.kind==='medication'&&edit?.enteredBy===v?'selected':''}>${l}</option>`).join('')}</select></label><p>不推荐药品、剂量或停药，不验证医嘱来源。旧预设药物也必须重新明确来源。</p><label class="hd-check"><input name="confirm" type="checkbox" required>确认只使用合成既有安排，不是系统处方</label><div class="hd-inline-actions"><button class="hd-primary" type="submit">${edit?.withdrawn?'保存并恢复为暂停':edit?'保存修改':'新增提醒'}</button>${button('取消填写','cancel-reminder','hd-link')}</div></form>`,'reminders',forced);
 }
 function openWeekly(){const w=M.weeklySummary(health);if(root.NutriHealthInsightsGlass){open('7 日合成回顾',root.NutriHealthInsightsGlass.renderWeekly({health,model:M})+nutrientTable(health.meals.filter(m=>m.date>=w.from&&m.date<=w.to)),'weekly');return;}open('7 日合成回顾',`<p>${w.from} 至 ${w.to} · 不是医疗报告</p><ul class="hd-list"><li>记录天数<strong>${w.recordedDays}/7</strong></li><li>餐食条目<strong>${w.mealCount} 条</strong></li><li>已填演示热量合计<strong>${w.kcal??'未知'} kcal</strong></li><li>热量有值的餐食<strong>${w.knownMeals}/${w.mealCount}</strong></li><li>饮水演示合计<strong>${w.waterMl} ml</strong></li><li>提醒打卡<strong>${w.checkCount} 次</strong></li><li>日常自述<strong>${w.dailyCount} 条</strong></li></ul>${nutrientTable(health.meals.filter(m=>m.date>=w.from&&m.date<=w.to))}<p class="hd-alert">${esc(w.limits)}。这些合计不能当作个人营养目标或全天完整摄入。</p><div class="hd-inline-actions">${button('查看餐食明细','records','hd-chip')}${button('指标趋势','metrics','hd-chip')}${button('日常自述','daily','hd-chip')}</div>`,'weekly');}
 function openDaily(){if(root.NutriHealthCompanionGlass){open('日常自述 · 望闻问切资料整理',root.NutriHealthCompanionGlass.renderDaily({health}),'daily');return;}const notes=health.dailyNotes||[];open('日常自述 · 望闻问切资料整理',`<p class="hd-alert">这里只整理合成自述。没有图像、语音、气味或脉象检测，也不做中医辨证、体质评分、诊断。</p><form data-form="daily"><label>日期<input name="date" type="date" value="${health.demoDate}" required></label>${[['appearance','望 · 自述外观或精神感受'],['voice','闻 · 自述声音或呼吸感受'],['sleep','问 · 睡眠情况'],['appetite','问 · 食欲与饮食'],['feeling','问 · 其他感受']].map(([k,l])=>`<label>${l}<input name="${k}" maxlength="120" placeholder="合成示例，可留空"></label>`).join('')}<p>切诊：未采集，不提供模拟脉诊结论。</p><label class="hd-check"><input name="confirm" type="checkbox" required>我仅录入合成资料并保存在本机</label><button class="hd-primary" type="submit">保存日常自述</button></form><h3>已保存 ${notes.length} 条</h3>${notes.length?notes.slice().reverse().map(n=>`<section class="hd-metric-row"><strong>${esc(n.date)}</strong><p>外观/精神：${esc(n.appearance)}<br>声音/呼吸：${esc(n.voice)}<br>睡眠：${esc(n.sleep)}<br>食欲：${esc(n.appetite)}<br>感受：${esc(n.feeling)}</p><small>${esc(n.source)} · 合成自述</small></section>`).join(''):'<p>尚未填写；未填写不代表无异常。</p>'}`,'daily');}
 function openConditions(editId){if(root.NutriHealthInsightsGlass){open('慢病与随访 · 自述容器',root.NutriHealthInsightsGlass.renderConditions({health,model:M,editId}),'conditions');return;}const edit=health.conditions.find(c=>c.id===editId);open('慢病与随访 · 自述容器',`<p>可以整理已由专业人员告知的合成信息，或只做观察记录。系统不会根据数值创建病名或判断疾病。</p><ul class="hd-list">${health.conditions.map(c=>`<li><div><strong>${esc(c.label)}</strong><small>${esc(c.status||'观察记录')} · ${esc(c.date||health.demoDate)}</small><small>${c.metrics.map(k=>esc(M.METRICS[k]?.label||k)).join('、')}<br>${esc(c.note)}<br>${esc(c.source||'synthetic-fixture')}</small></div>${button('编辑','edit-condition','hd-chip',`data-id="${c.id}"`)}</li>`).join('')}</ul><h3>${edit?'编辑这条自述':'新增自述'}</h3><form data-form="condition" data-edit-id="${esc(edit?.id||'')}"><label>自述主题<input name="label" value="${esc(edit?.label||'')}" maxlength="80" required placeholder="例如：合成血压随访"></label><div class="hd-row"><label>日期<input name="date" type="date" value="${esc(edit?.date||health.demoDate)}" required></label><label>自述状态<select name="status">${['观察记录','专业人员已告知（演示）','暂停随访'].map(t=>`<option ${edit?.status===t?'selected':''}>${t}</option>`).join('')}</select></label></div><label>随访指标</label>${Object.entries(M.METRICS).map(([k,v])=>`<label class="hd-check"><input type="checkbox" name="metric-${k}" ${edit?.metrics.includes(k)?'checked':''}>${v.label}</label>`).join('')}<label>补充自述<input name="note" value="${esc(edit?.note||'')}" maxlength="200" placeholder="只填写合成资料"></label><label class="hd-check"><input name="confirm" type="checkbox" required>这是合成自述，系统没有作出诊断</label><button class="hd-primary" type="submit">保存自述与随访指标</button></form>`,'conditions');}
 function openView(name){if(!active)return;if(name==='dashboard'||name==='chat'||name==='home'||name==='drafts'){present(state,name);}else if(name==='records')openRecords();else if(name==='metrics')openMetrics();else if(name==='reminders')openReminders();else if(name==='weekly')openWeekly();else if(name==='daily')openDaily();else if(name==='conditions')openConditions();else if(name==='recipes')openRecipes();else if(name==='settings')openSettings();}
 function openSettings(){if(root.NutriHealthCompanionGlass){const persistence=store.status().persistent;open('演示账号与服务状态',root.NutriHealthCompanionGlass.renderServiceStatus({health,storageMode:persistence===true?'persistent':persistence===false?'memory':'unknown'})+`<p>沈先生是虚构合成账号。固定演示日 ${health.demoDate}，默认含 7 天、21 餐与指标历史。数据仅存此浏览器，不连接真实健康账户。</p><p>重置会把同一合成账号的健康、商城及从业者演示状态一起恢复为种子数据，包括移除本账号问询草稿；不删除其他旧版记录。</p>${button('重置整个合成演示账号','confirm-reset','hd-primary hd-full')}${E.canUndo()?button('撤销本页上次重置','undo-reset','hd-link'):''}<p>撤销凭据仅在本页保留；刷新或后续写入后可能不可用。</p>`,'settings');return;}open('演示账号与服务状态',`<p>沈先生是虚构合成账号。固定演示日 ${health.demoDate}，默认含 7 天、21 餐与指标历史。数据仅存此浏览器，不连接真实健康账户。</p><div class="hd-service-list">${[['大模型',llmService.status().ruleLabel],['语音交互','未配置 · 无录音'],['菜品识别','未配置 · 无上传'],['后台提醒','未配置 · 关闭即停止'],['真人营养师','未连接 · 无发送'],['数字形象','静态原创插画 · 无实时驱动']].map(([k,v])=>`<div>${k}<small>${v}</small></div>`).join('')}</div><p>重置会把同一合成账号的健康、商城及从业者演示状态一起恢复为种子数据，包括移除本账号问询草稿；不删除其他旧版记录。</p>${button('重置整个合成演示账号','confirm-reset','hd-primary hd-full')}${E.canUndo()?button('撤销本页上次重置','undo-reset','hd-link'):''}<p>撤销凭据仅在本页保留；刷新或后续写入后可能不可用。</p>`,'settings');}
 let foodPress=null,foodPressNode=null,foodPointer=null;
 function foodDown(e){foodPress?.dispose();foodPress=null;foodPressNode=null;foodPointer=null;if(e.button!==undefined&&e.button!==0)return;const node=e.target.closest('[data-hd="meal"]');if(!node||busy||E.hasPending()||!root.NutriFoodCaptureController)return;foodPressNode=node;foodPointer=e.pointerId;foodPress=root.NutriFoodCaptureController.press({short:()=>{},long:()=>{if(pageGuard())openFoodCapture(node,'manual');}});foodPress.down();}
 function foodUp(e){if(e&&foodPointer!==undefined&&e.pointerId!==undefined&&e.pointerId!==foodPointer)return;foodPress?.up();}
 function foodCancel(){foodPress?.cancel();}
 function foodMove(e){if(!foodPress||(foodPointer!==undefined&&e.pointerId!==undefined&&e.pointerId!==foodPointer))return;const r=foodPressNode?.getBoundingClientRect?.();if(r&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)){if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)foodCancel();}else if(e.target.closest('[data-hd="meal"]')!==foodPressNode)foodCancel();}
 function foodClick(e){if(!foodPress)return;const matches=e.target.closest('[data-hd="meal"]')===foodPressNode||(foodPointer!==undefined&&e.pointerId===foodPointer);if(!matches)return;const consumed=foodPress.click();foodPress.dispose();foodPress=null;if(consumed){e.preventDefault();e.stopImmediatePropagation();}}
 async function handleClick(event){
 const link=event.target.closest('a[href]');if(link){if(!E.confirmLeave(dirtyNow(),'离开会丢失本页填写、撤销凭据及原操作重试身份；已经写入的数据不会撤销。是否继续？'))event.preventDefault();return;}
 if(busy)return;const b=event.target.closest('[data-hd]');if(!b)return;if(b.dataset.healthView!==undefined&&b.dataset.healthView!==String(pageVersion))return;const a=b.dataset.hd,clickedId=b.dataset.id;
 if(a==='close'){close();return;}if(E.hasPending()){status('先核对尚未确认的原操作，或在入口明确停止重试。当前填写保留。');return;}
 if(a==='refresh'){if(!E.confirmLeave(dirtyNow(),'放弃当前填写并读取最新记录？'))return;if(fresh()){close(true);const composer=$('.hd-composer textarea');if(composer){composer.value='';syncComposer(null);}status('已读取当前记录，请重新打开需要填写的表单。');}return;}
 if(a==='say'){const text=b.dataset.text;await sendRule(text,false,()=>{if(text==='看饮食记录'||text==='返回演示记录')openRecords();else if(text==='看指标趋势'||text==='记录体重')openMetrics();else if(text==='记录饮水')openWater();else if(text==='去记这一餐')openMeal();});return;}
 if(a==='drafts'){if(sheet&&!close())return;if(present(state,'drafts'))$('.hd-stream')?.focus({preventScroll:true});return;}
 if(a==='new-draft'){openDraftEditor();return;}
 if(a==='view-draft'){showDraft(clickedId);return;}
 if(a==='edit-draft'){openDraftEditor(clickedId);return;}
 if(a==='draft-unsent'){showDraft(clickedId,'unsent');return;}
 if(a==='home'||a==='chat'){if(sheet&&!close())return;if(present(state,a))$('.hd-stream')?.focus({preventScroll:true});return;}
 if(a==='dashboard'){present(state,view==='dashboard'?'chat':'dashboard');return;}
 if(a==='recipes')openRecipes(b);else if(a==='recipe')openRecipe(clickedId,b);else if(a==='select-recipe'){if(!M.RECIPES.some(r=>r.id===clickedId))return;await mutate({type:'recipe',id:clickedId},sheetContext||contextOf(state),()=>{openRecipe(clickedId);status('已核验下餐备选；尚未记为已吃。');},sheetState||state);}
 else if(a==='food-edit')openFoodCapture(b,'manual',clickedId);else if(a==='food-manual')openFoodCapture(b,'manual');else if(a==='meal')openMeal(b);else if(a==='water')openWater();else if(a==='records')openRecords();else if(a==='metrics')openMetrics();else if(a==='metric-tab')openMetrics(clickedId);else if(a==='metric-range')openMetrics(metricSelection.metric,clickedId);else if(a==='reminders')openReminders();else if(a==='settings')openSettings();else if(a==='weekly')openWeekly();else if(a==='daily')openDaily();else if(a==='conditions')openConditions();else if(a==='edit-condition')openConditions(clickedId);
 else if(a==='report'){const row={id:id(),role:'assistant',text:'这是当前合成演示日的记录汇总，不能当作真实健康报告。',date:health.demoDate,time:time(),kind:'report',choices:['下一餐吃什么','查看提醒'],synthetic:true,source:'local-rule-report'};await mutate({type:'append',list:'messages',rows:[row]},contextOf(state),()=>{status('已核验演示回顾卡。');},undefined,'chat');}
 else if(a==='check'){const date=health.demoDate,existing=health.reminderChecks.filter(r=>r.reminderId===clickedId&&r.date===date);if(existing.length>1){status('打卡记录重复，请核对。');return;}const row=existing[0]||{reminderId:clickedId,date,status:'演示已完成',synthetic:true};await mutate({type:'check',row},contextOf(state),()=>{status('已核验演示打卡；不会据此推断真实服药或进餐。');});}
 else if(a==='review-reminder-latest')reviewReminderLatest();
 else if(a==='accept-reminder-latest'){if(b===$('[data-reminder-review] [data-hd=accept-reminder-latest]'))acceptReminderLatest();}
 else if(a==='cancel-reminder-review'){if(b!==$('[data-reminder-review] [data-hd=cancel-reminder-review]'))return;reminderReview=null;const panel=$('[data-reminder-review]');if(panel)panel.innerHTML='';status('已取消核对，填写保留；未更新编辑依据，也未保存。');}
 else if(a==='edit-reminder')openReminders(clickedId);
 else if(a==='cancel-reminder'){if(close())status('已取消填写；已保存提醒和历史打卡未改变。');}
 else if(a==='toggle-reminder'||a==='withdraw-reminder'){
  if(!E.confirmLeave(dirty,'此操作将放弃未保存的提醒填写，继续？'))return;
  const original=(sheetState||state).health.reminders.find(r=>r.id===clickedId);if(!original)return;
  try{const rs=reminderState(original);if(rs.withdrawn)throw Error('提醒已撤回，请编辑并恢复');
   if(a==='withdraw-reminder'&&!root.confirm('撤回这条合成提醒？历史打卡保留；不表示停药。'))return;
   const row={...original,enabled:a==='withdraw-reminder'?false:!rs.enabled,...(a==='withdraw-reminder'?{withdrawn:true}:{})};
   await mutate({type:'reminder',original,row},sheetContext||contextOf(state),()=>{openReminders(undefined,true);status(a==='withdraw-reminder'?'已撤回；历史打卡保留，可编辑恢复为暂停。':row.enabled?'已恢复本页提醒；无后台通知。':'已暂停提醒；不表示停药。');},sheetState||state);
  }catch(e){fail(e);}
 }
 else if(a==='voice'||a==='phone'){if(pageGuard())navigate('phone-demo.html');}
 else if(a==='recognition'){if(!pageGuard()||!currentState(store,state))return;open('预设餐食结果 · 非图像识别',mealPresetPreview(health)+button('人工核对后手工记一餐','meal','hd-primary'),'recognition',false,b);}
 else if(a==='confirm-reset'||a==='reset'||a==='undo-reset'){
  if(dirtyNow()&&!E.confirmLeave(true,'账号操作会替换整个合成账号；放弃当前填写并继续确认？'))return;
  if(a!=='undo-reset'&&D){try{if(D.list(health).length&&!root.confirm('重置将移除此合成账号的全部问询草稿，同时恢复健康、商城及从业者初始示例。旧版分支不受影响；撤销仅在本页且后续未修改时可用。继续？'))return;}catch(e){fail(e);return;}}
  busy=true;setDisabled(true);try{const options={guard:pageGuard,onSuccess:receipt=>accept(receipt,()=>{close(true);const composer=$('.hd-composer textarea');if(composer){composer.value='';syncComposer(null);}status(a==='undo-reset'?'已核验本页上次重置的撤销。':'整个合成账号已核验恢复默认数据。');},'chat'),onError:fail};if(a==='undo-reset')await E.restoreAccount(options);else await E.resetAccount({...options,context:freeze(contextOf(state))});}finally{busy=false;if(pageGuard())setDisabled(E.hasPending());}
 }
 }
 async function handleSubmit(event){if(busy||E.hasPending()){event.preventDefault();return;}if(event.target.matches('.hd-composer')){event.preventDefault();await send(event.target.querySelector('textarea').value,true);return;}const f=event.target,kind=f.dataset.form;if(!kind)return;event.preventDefault();if(f.dataset.healthEditor!==String(pageVersion)||!sheet||!f.reportValidity())return;
 if(kind==='inquiry-draft'){const original=f.dataset.editId?sheetState.health&&D.list(sheetState.health).find(r=>r.id===f.dataset.editId):null;if(f.dataset.editId&&!original){fail(Error('原草稿编辑依据已丢失，填写保留'));return;}if(!f.elements.confirm?.checked){fail(Error('请确认仅填写合成资料'));return;}await saveInquiry(f.elements.text.value,{original,title:f.elements.title.value,base:sheetState,context:sheetContext});return;}
 const values=Object.fromEntries(['ml','slot','name','grams','kcal','metric','value','date','context','kind','time','label','appearance','voice','sleep','appetite','feeling','status','note','enteredBy'].map(name=>[name,f.elements[name]?.value])),v=name=>values[name],recordId=id(),editId=f.dataset.editId,capturedDate=sheetState.health.demoDate;
 try{if(!f.elements.confirm.checked)throw Error('请确认仅使用合成演示数据');let command;
 if(kind==='water'){const temp={demoDate:capturedDate,water:[]};M.addWater(temp,v('ml'),recordId);command={type:'append',list:'water',rows:temp.water};}
 if(kind==='meal'){const number=(name,max)=>{const value=v(name);if(value==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<0||n>max)throw Error('演示数值超出录入范围');return n;};const row={id:recordId,date:capturedDate,time:time(),slot:v('slot'),name:M.clean(v('name'),100),grams:number('grams',10000),kcal:number('kcal',5000),protein:null,carb:null,fat:null,source:'user-demo-entry',synthetic:true,note:'手工演示录入；非测量或自动识别'};command={type:'append',list:'meals',rows:[row]};}
 if(kind==='metric')command={type:'append',list:'metrics',rows:[{id:recordId,...M.metricRecord({metric:v('metric'),value:v('value'),date:v('date'),context:v('context')})}]};
 if(kind==='reminder'){const original=sheetState.health.reminders.find(r=>r.id===editId);if(editId&&!original)throw Error('原提醒不存在，不能新增替代');command={type:'reminder',original:original||null,row:reminderRecord(values,original,recordId)};}
 if(kind==='daily')command={type:'append',list:'dailyNotes',rows:[{id:recordId,...M.dailyRecord({date:v('date'),appearance:v('appearance'),voice:v('voice'),sleep:v('sleep'),appetite:v('appetite'),feeling:v('feeling')})}]};
 if(kind==='condition'){const record=M.conditionRecord({label:v('label'),date:v('date'),status:v('status'),note:v('note'),metrics:Object.keys(M.METRICS).filter(k=>f.elements['metric-'+k]?.checked)});const old=sheetState.health.conditions.find(c=>c.id===editId);if(editId&&!old)throw Error('原随访目标不存在，不能新增替代。');command={type:editId?'edit':'append',list:'conditions',rows:[old?{...old,...record}:{id:recordId,...record}]};}
 if(!command)return;await mutate(command,sheetContext,()=>{close(true);if(kind==='reminder'){openReminders(undefined,true);status(command.original?.withdrawn?'已恢复为暂停；需明确恢复启用。历史打卡保留。':'提醒已保存；仅本页合成安排，无后台通知。');return;}if(kind==='daily')openDaily();if(kind==='condition')openConditions();status(store.status().persistent?'已保存到本机合成账号，可在记录或回顾中查看。':'仅保留在当前页面内存，刷新或离开后丢失。');},sheetState);
 }catch(e){let error=f.querySelector('[role=alert]');if(!error){error=document.createElement('p');error.setAttribute('role','alert');f.append(error);}error.textContent=e.message;}
 }
 async function handleKey(event){if(sheet&&event.key==='Escape'){event.preventDefault();close();return;}if(sheet&&event.key==='Tab'){const focus=[...$('.hd-sheet-panel').querySelectorAll('button,a,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden);const first=focus[0],last=focus[focus.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}if(event.target.matches('.hd-composer textarea')&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();await send(event.target.value,true);}}
 // Measure real wrapped content; resizing must not discard a draft or move a reader to the latest message.
 function composerAnchor(){const stream=$('.hd-stream');return stream?{stream,top:stream.scrollTop,near:stream.scrollHeight-stream.scrollTop-stream.clientHeight<100}:null;}
 function syncComposer(anchor=composerAnchor()){
  if(!pageGuard())return;const composer=$('.hd-composer textarea');if(!composer)return;
  composer.style.height='44px';composer.style.overflowY='hidden';
  const height=Math.max(44,Math.min(88,composer.scrollHeight+2));
  composer.style.height=height+'px';composer.style.overflowY=composer.scrollHeight+2>88?'auto':'hidden';
  if(anchor)anchor.stream.scrollTop=anchor.near?anchor.stream.scrollHeight:anchor.top;
 }
 function resize(preserveReading=true){const anchor=preserveReading===false?null:composerAnchor();document.body.style?.setProperty('--nutri-viewport-height',(root.visualViewport?.height||root.innerHeight||800)+'px');syncComposer(anchor);}
 function handleInput(event){if(event.target.matches('.hd-composer textarea')){syncComposer();if(view!=='chat')status('当前填写尚未保存；点击保存问询才会尝试本机保存。');}const form=event.target.closest('form[data-form]');if(form&&form.dataset.healthEditor===String(pageVersion))dirty=true;}
 function beforeUnload(event){if(!pageGuard()||(!dirtyNow()&&!E.hasPending()))return;event.preventDefault();event.returnValue='';}
 function handleRecipeArtError(event){const img=event.target;if(img?.matches?.('img[data-recipe-art]'))img.hidden=true;}
 host.addEventListener('error',handleRecipeArtError,true);
 if(!render()){llmService.dispose();throw Error('初始健康显示未能核对，请重新加载。');}resize(false);root.addEventListener('resize',resize);root.visualViewport?.addEventListener('resize',resize);if(!store.status().persistent)status('明确选择的本页临时演示；刷新或导航到其他页面会丢失。');host.addEventListener('scroll',foodCancel,{passive:true,capture:true});host.addEventListener('pointerdown',foodDown);host.addEventListener('pointerup',foodUp);host.addEventListener('pointermove',foodMove);host.addEventListener('pointercancel',foodCancel);host.addEventListener('pointerleave',foodCancel);host.addEventListener('click',foodClick,true);host.addEventListener('click',handleClick);host.addEventListener('submit',handleSubmit);host.addEventListener('keydown',handleKey);host.addEventListener('input',handleInput);host.addEventListener('change',handleInput);root.addEventListener('blur',foodCancel);root.addEventListener('beforeunload',beforeUnload);
 const unsubEntry=E.subscribe?.(()=>{if(pageGuard()&&!busy)setDisabled(E.hasPending());});
 unsub=store.subscribe(next=>{if(!pageGuard())return;if(!next||!next.health||!currentState(store,next)){if(currentState(store,state))return;authority=false;status('当前数据不可读或通知已过时；填写保留，请使用入口核对。');return;}const identityChanged=!sameContext(contextOf(next),contextOf(state),false);authority=false;if(identityChanged){selectedDraftId=null;const composer=$('.hd-composer textarea');if(composer){composer.value='';syncComposer(null);}if(['draft','unsent'].includes(view))view='drafts';foodCapture?.dispose();foodCapture=null;recipeReturn=null;recognitionReturn=null;llmService.invalidate();pageVersion++;sheetRetired=true;setDisabled(true);status('共享账号身份已变化，旧表单授权已失效；请重新打开并核对。');}if(busy||E.hasPending()){deferred=true;return;}if(!present(next))return;if(sheet)status('记录已更新；填写和原始版本保留，保存时会核对版本。');});
 const initial=options.initialView||((root.location?.search||'').match(/[?&]view=([a-z]+)/)||[])[1];if(initial)openView(initial);
 return {openView,destroy(){foodPress?.dispose();foodPress=null;host.removeEventListener('scroll',foodCancel,true);host.removeEventListener('pointerdown',foodDown);host.removeEventListener('pointerup',foodUp);host.removeEventListener('pointermove',foodMove);host.removeEventListener('pointercancel',foodCancel);host.removeEventListener('pointerleave',foodCancel);host.removeEventListener('click',foodClick,true);foodCapture?.dispose();foodCapture=null;recipeReturn=null;recognitionReturn=null;llmService.dispose();active=false;pageVersion++;unsub?.();unsubEntry?.();root.removeEventListener('resize',resize);root.visualViewport?.removeEventListener('resize',resize);root.removeEventListener('blur',foodCancel);root.removeEventListener('beforeunload',beforeUnload);host.removeEventListener('error',handleRecipeArtError,true);host.removeEventListener('click',handleClick);host.removeEventListener('submit',handleSubmit);host.removeEventListener('keydown',handleKey);host.removeEventListener('input',handleInput);host.removeEventListener('change',handleInput);},openMetrics,openRecords,openReminders,navigate};
}
function mount(host,options={}){
 host=host||document.getElementById('original-page');const store=options.store||root.NutriDemo;if(!host||!E||E.buildId!=='registration-entry-v3-c1'||store?.protocolVersion!==3)throw Error('注册演示入口或原页面容器未就绪');
 let closed=false,controller=null,initializing=false,serial=0,pending=null;
 function destroy(){closed=true;serial++;controller?.destroy();root.removeEventListener('pagehide',destroy);}
 root.addEventListener('pagehide',destroy);store.defineDomain('health',M.seed);
 async function initialize(){
  if(closed||initializing||controller||E.hasPending())return null;const ticket=++serial,guard=()=>!closed&&ticket===serial&&(!options.guard||options.guard());initializing=true;host.textContent='请在共享入口确认并加载合成演示账号…';
  try{await store.initialize({domains:['health'],guard});if(!guard())return null;controller=mountReady(host,{...options,initialized:true,guard});if(ticket>1)E.report(store.status().persistent?'合成健康记录已重新加载，请核对当前记录。':'合成健康记录已重新加载；仅本页内存，刷新或导航后丢失。');return controller;}
  catch(e){if(!guard())return null;host.innerHTML='<section class="hd-card"><h1>共享演示暂不可用</h1><p>'+esc(e.message)+'</p><p>结果尚未核对，现有数据保留。可明确重试加载当前合成记录；不会清空或另建副本。</p><button type="button" data-health-init-retry>重新加载合成健康记录</button></section>';const button=host.querySelector('[data-health-init-retry]');button.addEventListener('click',()=>{if(!guard()||initializing||button!==host.querySelector('[data-health-init-retry]')||E.hasPending())return;button.disabled=true;pending=initialize();});E.report(e.message);return null;}
  finally{if(ticket===serial)initializing=false;}
 }
 pending=initialize();return {ready:pending,openView:name=>pending.then(()=>controller?.openView(name)),destroy};
}
root.NutriHealthUI=Object.freeze({buildId:BUILD,mount});
if(E?.buildId==='registration-entry-v3-c1')E.register('health-ui',{buildId:BUILD,mount:()=>{const controller=mount();return controller.ready;}});
else {const el=document.createElement('p');el.textContent='健康界面入口版本不匹配，未启用写入。';document.body.append(el);}

})(typeof window!=='undefined'?window:globalThis);
