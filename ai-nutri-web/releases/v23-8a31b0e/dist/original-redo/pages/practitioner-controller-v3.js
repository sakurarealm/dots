/* Inactive C2 student controller. All domain work uses the reviewed entry's private operation leases. */
(function(root,factory){'use strict';const lib=factory();if(typeof module==='object'&&module.exports)module.exports=lib;else{Object.defineProperty(root,'NutriPractitionerControllerV3',{value:lib,writable:false,configurable:false});const E=root.NutriRegistrationEntry;if(!E||E.buildId!=='registration-entry-v3-c1')throw Error('REGISTRATION_ENTRY_REQUIRED');E.register('practitioner-controller',{buildId:lib.buildId,mount:entry=>lib.install(entry,{window:root,kernel:root.NutriRegistrationKernel})});}})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const BUILD='registration-web-v3-c1',FIELDS=['mode','accountId','protocolVersion','epoch','generation','revision'],TOPICS=Object.freeze({MEAL_ROUTINE:'日常膳食安排',FOOD_EDUCATION:'食物与营养知识',HABIT_SUPPORT:'饮食习惯陪伴'}),instances=new WeakMap();
const clone=x=>JSON.parse(JSON.stringify(x)),fail=code=>Object.assign(Error(code),{code}),own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function same(a,b,revision=true){return !!a&&!!b&&FIELDS.every(k=>(!revision&&k==='revision')||a[k]===b[k]);}
function context(c){if(!c||Object.keys(c).length!==6||FIELDS.some(k=>!own(c,k))||c.mode!=='synthetic'||c.accountId!=='demo-shen'||c.protocolVersion!==3||typeof c.epoch!=='string'||!c.epoch||!Number.isSafeInteger(c.generation)||c.generation<0||!Number.isSafeInteger(c.revision)||c.revision<0)throw fail('INVALID_WEB_CONTEXT');return clone(c);}
const fromState=s=>context(Object.fromEntries(FIELDS.map(k=>[k,s?.meta?.[k]])));
const text=e=>({STALE_VIEW:'当前显示已过期，请刷新后重新选择；原填写仍保留。',STALE_REVISION:'其他页面已修改记录，请刷新核对；不会覆盖旧版本。',VIEW_EXPIRED:'合成资质已到期，请刷新核对当前不可用状态。',CLOCK_ROLLBACK:'时间发生回退，暂不能确认资格有效性。',SAVE_FIRST:'请先保存或取消当前填写。',CONSENT_REQUIRED:'请先选择虚构营养师并明确同意仅共享需求类别。',REGISTRATION_CAPACITY:'合成历史已达到容量上限，当前记录保留；不能自动清空或截断。',ENTRY_PENDING_OPERATION:'上次保存结果尚未核对，请使用上方原请求重试、核对或停止按钮。',INVALID_TOPIC:'请选择有效的需求类别。',SYNTHETIC_ACK_REQUIRED:'请明确确认全部内容均为虚构合成资料。',VIEW_PRESENTATION_FAILED:'当前结果未能完整呈现；原填写保留，请刷新核对。',INITIALIZATION_FAILED:'合成平台暂不可用，请重新读取当前记录。'})[e?.code]||'操作未确认完成：'+String(e?.code||e?.message||'UNKNOWN');
function create(options){
 const o=options||{},E=o.entry,K=o.kernel,w=o.window||{},clockSource=o.now||Date.now,forms=K?.forms;
 if(E?.buildId!=='registration-entry-v3-c1'||K?.buildId!=='registration-kernel-v1'||!forms)throw fail('REGISTRATION_DEPENDENCY_MISMATCH');
 const surfaces=new Map(),subscribers=new Set();let active=true,readyResolved=false,started=false,phase='loading',persona='client-a',actorEpoch=0,attempt=0,sequence=0,render=0,formSerial=0,service=null,session=null,identity=null,frame=null,form=null,selected=null,topic='MEAL_ROUTINE',consent=false,tab='directory',filter='all',notice='等待完整合成账号确认…',error='',busy=false,authorized=false,lastTime=0,timer=null;
 let unsubStore=null,unsubEntry=null;
 function now(){const t=clockSource();if(!Number.isSafeInteger(t)||t<1000||t<lastTime)throw fail('CLOCK_ROLLBACK');lastTime=t;return t;}
 function entryBusy(){try{return E.view().busy===true;}catch(_){return true;}}
 function pending(){try{return E.hasPending();}catch(_){return true;}}
 function visible(){return active&&w.document?.hidden!==true;}
 function ticket(t,needsForm=false,needsAttempt=false){return active&&t&&t.render===render&&(!needsAttempt||t.attempt===attempt)&&(!needsForm||!!form&&t.form===form.serial);}
 function root(){return E.store.read();}
 function validFrame(f=frame){if(!visible()||!f||E.view().phase!=='ready')return false;try{return same(fromState(root()),f.context)&&(f.viewExpiresAt===null||now()<f.viewExpiresAt);}catch(_){return false;}}
 function hasAuthority(){return authorized&&validFrame();}
 function snapshot(){const f=form?{...forms.present(form),serial:form.serial,errors:clone(form.errors)}:null;return freeze(clone({phase,persona,data:frame?.data||null,form:f,render,attempt,selected,topic,consent,tab,filter,busy:busy||entryBusy(),pending:pending(),authorized:hasAuthority()&&!busy&&!entryBusy()&&!pending(),notice,error,canRefresh:active&&!busy&&!entryBusy()&&!pending()&&E.view().phase==='ready'&&!!session,canInitialize:active&&!busy&&!entryBusy()&&!pending()&&E.view().phase==='ready'&&!frame}));}
 function notify(){if(!active)return;const s=snapshot();for(const r of surfaces.values()){try{r.updateStatus?.(s);}catch(_){}}for(const fn of subscribers){try{fn(s);}catch(_){}}}
 function complain(e,message){if(!active)return false;error=text(e);if(message)notice=message;notify();return false;}
 function cancelTimer(){if(timer!==null){(o.clearTimeout||w.clearTimeout||clearTimeout)(timer);timer=null;}}
 function schedule(){cancelTimer();if(!frame||frame.viewExpiresAt===null)return;let delay;try{delay=Math.max(0,frame.viewExpiresAt-now());}catch(e){authorized=false;complain(e);return;}timer=(o.setTimeout||w.setTimeout||setTimeout)(()=>{timer=null;if(!active)return;authorized=false;selected=null;consent=false;notice='合成资格期限已到；当前授权详情已隐藏，请刷新核对。';notify();},Math.min(delay+1,2147483647));timer?.unref?.();}
 function clearPrivate(message){for(const r of surfaces.values()){try{r.clear(message,snapshot());}catch(_){try{r.root.replaceChildren();}catch(__){}}}}
 function retire(message,nextPersona='client-a'){++actorEpoch;++attempt;++sequence;++render;++formSerial;cancelTimer();service?.dispose();service=null;session=null;identity=null;frame=null;form=null;selected=null;consent=false;authorized=false;busy=false;persona=nextPersona;phase='failed';notice=message;error='';clearPrivate(message);notify();}
 function detectRetirement(){if(!identity)return false;try{if(!same(fromState(root()),identity,false)){retire('账号代际已变化，旧角色及授权已退出；请重新进入。');return true;}}catch(_){}return false;}
 function identityCurrent(c){try{return active&&same(fromState(root()),c,false);}catch(_){return false;}}
 function actorCurrent(epoch,svc,token){if(!visible()||actorEpoch!==epoch||service!==svc||session!==token||!token||!identity)return false;if(detectRetirement())return false;return identityCurrent(identity);}
 function activeGuard(seq,epoch,svc,token){return ()=>sequence===seq&&actorCurrent(epoch,svc,token);}
 function dataOf(result,state){
  if(!result||!result.view||!same(context(result.context),context(result.view.context)))throw fail('VIEW_CONTEXT_MISMATCH');
  const v=result.view,role=persona.startsWith('client-')?'client':persona==='synthetic-reviewer'?'reviewer':'practitioner';
  const rel=role==='reviewer'?{identity:{role:'reviewer',label:'合成审核员 · 非真实认证'},directory:[],inquiries:[],invitations:[],privateClients:[]}:v.relationship;
  if(!rel||rel.identity?.role!==role||role==='reviewer'&&v.relationship!==null||!Array.isArray(v.reviewQueue)||!Array.isArray(v.publications)||role!=='reviewer'&&v.reviewQueue.length||role!=='practitioner'&&v.registration!==null||role==='practitioner'&&v.registration?.owner!==persona)throw fail('VIEW_ROLE_MISMATCH');
  const data={mode:'synthetic',identity:clone(rel.identity),directory:clone(rel.directory),inquiries:clone(rel.inquiries),invitations:clone(rel.invitations),privateClients:clone(rel.privateClients),registration:clone(v.registration),reviewQueue:clone(v.reviewQueue),publications:[],journalUsage:{events:state.practitioner.registration.events.length,maxEvents:K.contract.MAX_EVENTS}};
  for(const a of v.publications){if(!K.contract.OWNERS.includes(a.owner)||a.publiclyVisible!==true||a.state!=='PUBLISHED')throw fail('PUBLICATION_UNVERIFIED');const profile=state.practitioner.registration.projection?.[a.owner]?.profile;const label=typeof profile?.displayName==='string'?profile.displayName:forms.OWNER_LABELS[a.owner];const row={id:a.id,owner:a.owner,authorDisplayName:label,isSynthetic:true,label:'本机合成文章 · 非真实专业审核'};for(const k of ['title','bodyText','sourceUrl','sourceTitle','sourceDate','applicability','limitations'])row[k]=String(a[k]??'');data.publications.push(row);}
  return forms.decorate(data,now());
 }
 function candidateSnapshot(next){const f=next.form?{...forms.present(next.form),serial:next.form.serial,errors:clone(next.form.errors)}:null;return freeze(clone({phase:'ready',persona,data:next.frame.data,form:f,render:next.render,attempt,selected:next.selected,topic,consent:next.consent,tab:next.tab,filter:next.filter,busy:busy||entryBusy(),pending:pending(),authorized:validFrame(next.frame)&&!busy&&!entryBusy()&&!pending(),notice:next.notice,error:'',canRefresh:active&&!busy&&!entryBusy()&&!pending()&&E.view().phase==='ready'&&!!session,canInitialize:false}));}
 function commitFrame(next,guard=()=>active){
  if(surfaces.size!==2||!guard())throw fail('STALE_PAGE');const epoch=actorEpoch,operationSequence=sequence,candidate=candidateSnapshot(next),prepared=[];
  for(const [name,r]of surfaces){const nodes=r.prepare(candidate);if(!Array.isArray(nodes))throw fail('INVALID_RENDERER_OUTPUT');prepared.push({name,r,nodes,old:Array.from(r.root.childNodes||r.root.children)});}
  const final=fromState(root());if(!guard()||actorEpoch!==epoch||sequence!==operationSequence||!visible()||!same(final,next.frame.context))throw fail('STALE_VIEW');if(next.frame.viewExpiresAt!==null&&now()>=next.frame.viewExpiresAt)throw fail('VIEW_EXPIRED');
  const focus=w.document?.activeElement,start=focus?.selectionStart,end=focus?.selectionEnd;
  try{for(const part of prepared)part.r.root.replaceChildren(...part.nodes);if(!guard()||actorEpoch!==epoch||sequence!==operationSequence)throw fail('STALE_PAGE');}
  catch(cause){if(active&&actorEpoch===epoch){for(const part of prepared){try{part.r.root.replaceChildren(...part.old);}catch(_){try{part.r.root.replaceChildren();}catch(__){}}}try{focus?.focus?.();if(typeof start==='number')focus?.setSelectionRange?.(start,end);}catch(_){}authorized=false;notify();}throw Object.assign(fail('VIEW_PRESENTATION_FAILED'),{cause});}
  frame=next.frame;form=next.form;selected=next.selected;consent=next.consent;render=next.render;tab=next.tab;filter=next.filter;phase='ready';authorized=true;notice=next.notice;error='';schedule();notify();return true;
 }
 function present(result,settings={},guard=()=>active){
  const state=root(),c=context(result.context);if(!same(fromState(state),c))throw fail('STALE_VIEW');const deadline=result.viewExpiresAt;if(deadline!==null&&(!Number.isSafeInteger(deadline)||deadline<=now()))throw fail('VIEW_EXPIRED');
  const data=dataOf(result,state);let pick=selected,yes=consent;if(!pick||!data.directory.some(p=>p.id===pick.id&&p.revision===pick.revision)){pick=null;yes=false;}
  return commitFrame({frame:{data,context:c,viewExpiresAt:deadline},form:settings.closeForm?null:form,selected:pick,consent:yes,render:render+1,tab,filter,notice:settings.notice||'已核对当前合成记录。'},guard);
 }
 function local(next={}){if(!hasAuthority())throw fail('STALE_VIEW');return commitFrame({frame,form,selected,consent,render:render+1,tab,filter,notice,...next});}
 function mint(){const id=o.id?o.id():w.crypto?.randomUUID?.();if(typeof id!=='string')throw fail('OPERATION_ID_UNAVAILABLE');const key=('pr_'+id.replace(/[^A-Za-z0-9_-]/g,'')).slice(0,80);K.contract.key(key);return key;}
 function safe(fn){try{const r=fn();return r&&typeof r.then==='function'?r.catch(e=>complain(e)):r;}catch(e){return complain(e);}}
 function requireAction(t,formRequired=false){if(detectRetirement())throw fail('STALE_VIEW');if(!ticket(t,formRequired))throw fail('STALE_CONTROL');if(busy||entryBusy()||pending())throw fail('ENTRY_PENDING_OPERATION');if(!hasAuthority()){authorized=false;throw fail('STALE_VIEW');}}
 async function operate(kind,payload,key,business,settings={}){
  if(!session||!service)throw fail('INITIALIZATION_FAILED');const seq=++sequence,epoch=actorEpoch,svc=service,token=session,guard=activeGuard(seq,epoch,svc,token);const originalForm=form?.serial;busy=true;error='';notice=kind==='snapshot'?'正在核对合成状态…':'正在保存合成操作…';notify();let shown=false;
  const frozenInput=kind==='snapshot'?{}:{payload:clone(payload),key};
  await E.execute({kind:'practitioner:'+kind,context:context(business),input:frozenInput,guard,
   run:({input,context:businessIntent,lease})=>kind==='snapshot'?svc.snapshot(token,lease):svc[kind](token,input.payload,input.key,businessIntent,lease),
   onSuccess:result=>{if(!guard())return;busy=false;try{shown=present(result,{closeForm:settings.closeForm&&form?.serial===originalForm,notice:(settings.successNotice||'')+(result.persistent?'已核对本浏览器合成记录；无真实服务提交。':'已核对本页临时合成记录；刷新后不保留。')},guard);}catch(e){authorized=false;complain(e,result.committed?'写入已核验，但当前显示需要刷新；已提交的填写仍保留供核对。':'当前显示尚未完成核对；原填写保留。');}},
   onError:e=>{if(!active||actorEpoch!==epoch||sequence!==seq||service!==svc||session!==token)return;busy=false;authorized=false;phase=frame?'ready':'failed';complain(e,e?.outcome==='committed'?'写入已核验，请刷新核对；不会用新请求重复保存。':e?.outcome==='unknown'?'保存结果尚未核对，请使用上方原请求重试或核对。原填写保留。':undefined);},
   reconcile:({state,context:original})=>({status:same(fromState(state),original)?'base':'changed',message:'当前合成记录已读取。状态匹配只是观察，不能证明原请求回执；请原请求重试或停止后刷新核对。'})
  });
  if(active&&actorEpoch===epoch&&sequence===seq){if(!detectRetirement()){busy=false;notify();}}return shown;
 }
 async function initialize(t,automatic=false){
  if(!active||!readyResolved||surfaces.size!==2||busy||pending()||E.view().phase!=='ready'||!automatic&&!ticket(t,false,true))return false;
  const n=++attempt,epoch=actorEpoch;started=true;busy=true;phase='loading';error='';notice='正在加载同一个合成身份与档案…';notify();
  try{service?.dispose();service=null;session=null;identity=fromState(root());const current=()=>visible()&&attempt===n&&actorEpoch===epoch&&identityCurrent(identity);const svc=E.createRegistrationService({current});service=svc;session=svc.login(persona);if(!current())throw fail('STALE_PAGE');busy=false;return await operate('snapshot',null,null,identity,{closeForm:true});}
  catch(e){if(active&&attempt===n&&actorEpoch===epoch){busy=false;phase='failed';authorized=false;complain(e);}return false;}
 }
 async function refresh(t){if(detectRetirement())return false;if(!ticket(t)||busy||entryBusy())return false;if(!E.confirmLeave(!!form?.dirty,'刷新将替换当前填写，是否继续？'))return false;if(!session)return initialize({...t,attempt},false);authorized=false;return operate('snapshot',null,null,fromState(root()),{closeForm:true});}
 async function choosePersona(next,t){if(!ticket(t)||!K.contract.PERSONAS.includes(next))return false;if(!E.confirmLeave(!!form?.dirty,'切换身份将放弃当前尚未保存的填写，是否继续？'))return false;retire('正在进入另一合成身份…',next);return initialize({render,attempt},false);}
 function logout(t){if(!ticket(t)||!E.confirmLeave(!!form?.dirty,'退出角色将放弃当前尚未保存的填写，是否继续？'))return false;retire('合成身份已退出。请明确重新进入；没有真实账号退出请求。');return true;}
 function openForm(kind,id,t){requireAction(t);if(!E.confirmLeave(!!form?.dirty,'打开另一份表单将放弃当前填写，是否继续？'))return false;const f=forms.open(frame.data,frame.context,kind,id||null,++formSerial);return local({form:f});}
 function editField(key,value,t){requireAction(t,true);if(!forms.present(form).fields.some(f=>f.key===key)||typeof value!=='string')throw fail('INVALID_FIELD');form.values[key]=value;form.dirty=true;delete form.errors[key];notify();return true;}
 function setAck(value,t){requireAction(t,true);form.ack=value===true;form.dirty=true;notify();return true;}
 function sample(t){requireAction(t,true);const f=clone(form);f.values=forms.sample(f);f.ack=false;f.dirty=true;f.errors={};return local({form:f});}
 function save(t){requireAction(t,true);const checked=forms.save(form,now());if(!checked.input){form.errors=checked.errors||{};notice=checked.error||'请修正标出的合成表单字段。';error='';notify();return false;}return operate('request',checked.input,mint(),form.context,{closeForm:true});}
 function cancelForm(t){if(detectRetirement())return false;if(!ticket(t,true)||!E.confirmLeave(!!form?.dirty,'取消当前尚未保存的填写？'))return false;if(!hasAuthority()){form=null;++formSerial;++render;for(const r of surfaces.values())r.clear('旧填写已取消，请刷新当前合成状态。',snapshot());notify();return true;}return local({form:null});}
 function requestAction(action,id,t){requireAction(t);if(form?.dirty&&!['withdrawProfile','withdrawArticle'].includes(action))throw fail('SAVE_FIRST');const input=forms.request(frame.data,action,id);if(action.startsWith('withdraw')&&!E.confirmLeave(true,'撤回当前合成记录？相关资格或文章可能停止展示，当前填写将被替换。'))return false;return operate('request',input,mint(),frame.context,{closeForm:true});}
 function reviewAction(owner,scenario,id,t,reason){requireAction(t);const input=clone(forms.review(frame.data,owner,scenario,id,reason)),intent=clone(frame.context),r=render,epoch=actorEpoch;const confirm=o.confirm||(message=>typeof w.confirm==='function'&&w.confirm(message));if(!confirm('仅演练虚构审核：'+owner+' / '+input.id+' / 修订 '+input.contentRevision+'；'+(forms.reasons[input.reason]||'')+'。此操作不是对真实营养师的认证。是否确认？'))return false;requireAction(t);if(r!==render||epoch!==actorEpoch||!same(intent,frame.context))throw fail('STALE_REVIEW_DIALOG');return operate('review',input,mint(),intent,{closeForm:true});}
 function relationshipAction(action,id,t){requireAction(t);if(form?.dirty)throw fail('SAVE_FIRST');let input;
  if(action==='inquire'||action==='invite'){if(frame.data.identity.role!=='client'||!selected)throw fail('CONSENT_REQUIRED');const p=frame.data.directory.find(p=>p.id===selected.id&&p.revision===selected.revision);if(!p)throw fail('STALE_VIEW');if(!own(TOPICS,topic))throw fail('INVALID_TOPIC');input={action,expectedVersion:0,practitionerId:p.id,qualificationRevision:p.revision,topic};if(action==='invite'){if(!consent)throw fail('CONSENT_REQUIRED');input.consent=true;}}
  else {if(!['accept','reject','revoke','answer','closeInquiry'].includes(action))throw fail('INVALID_ACTION');const row=[...frame.data.invitations,...frame.data.inquiries].find(r=>r.id===id);if(!row)throw fail('NOT_FOUND');input={action,id:row.id,expectedVersion:row.version};}
  return operate('command',input,mint(),frame.context,{closeForm:true,successNotice:({inquire:'合成咨询已提交，等待回应。',invite:'合成邀请已提交，尚待对方接受；仅共享所选需求类别。',revoke:'合成授权已撤销，停止共享。',closeInquiry:'合成咨询已关闭。'})[action]||'合成操作已保存。'});
 }
 function selectPractitioner(id,t){requireAction(t);if(frame.data.identity.role!=='client')throw fail('FORBIDDEN');const p=frame.data.directory.find(x=>x.id===id);if(!p)throw fail('NOT_FOUND');return local({selected:{id:p.id,revision:p.revision},consent:false});}
 function setTopic(value,t){requireAction(t);if(!own(TOPICS,value))throw fail('INVALID_TOPIC');const old=topic;topic=value;try{return local();}catch(e){topic=old;throw e;}}
 function setConsent(value,t){requireAction(t);if(!selected)throw fail('CONSENT_REQUIRED');return local({consent:value===true});}
 function setFilter(value,t){requireAction(t);if(!['all','pending','active','closed'].includes(value))throw fail('INVALID_FILTER');return local({filter:value});}
 function setTab(value,t){requireAction(t);if(!['directory','demands'].includes(value))throw fail('INVALID_TAB');if(!E.confirmLeave(!!form?.dirty,'切换视图将放弃当前尚未保存的填写，是否继续？'))return false;return local({tab:value,form:null});}
 function confirmNavigation(href,t){if(detectRetirement())return false;if(!ticket(t)||typeof href!=='string'||!['#practitioner-directory','#practitioner-workbench','#registration','#pr-persona','aiAgent.html','profile.html','settings.html','../nutrition-booklet.html'].includes(href))return false;if(!E.confirmLeave(!!form?.dirty,'跳转可能丢失尚未保存的填写和本页请求身份，是否继续？'))return false;if(['#practitioner-directory','#practitioner-workbench'].includes(href))return local({tab:href==='#practitioner-directory'?'directory':'demands',form:null});return true;}
 function onStore(s){if(!active)return;let c;try{c=fromState(s);}catch(_){authorized=false;notice='合成档案暂不可读；现有字节和填写保留，不能据此确认授权。';notify();return;}if(identity&&!same(c,identity,false)){retire('账号代际已变化，旧角色及授权已退出；请重新进入。');return;}if(frame&&!same(c,frame.context)){authorized=false;if(selected){const p=s.practitioner?.profiles?.find(p=>p.id===selected.id);if(!p||p.revision!==selected.revision||p.status!=='SYNTHETIC_APPROVED'){selected=null;consent=false;}}notice='合成记录已变化；当前显示待重新核对。';notify();}}
 function onEntry(){if(!active||detectRetirement())return;if(E.view().phase!=='ready')authorized=false;notify();}
 function dispose(){if(!active)return;active=false;++actorEpoch;++attempt;++sequence;++render;cancelTimer();service?.dispose();service=null;session=null;unsubStore?.();unsubEntry?.();for(const r of surfaces.values())r.dispose?.();surfaces.clear();subscribers.clear();w.removeEventListener?.('pagehide',dispose);w.removeEventListener?.('beforeunload',beforeUnload);}
 function beforeUnload(e){if(active&&form?.dirty){e.preventDefault?.();e.returnValue='';}}
 function start(){if(readyResolved&&surfaces.size===2&&!started)void initialize(null,true);}
 const api=Object.freeze({buildId:BUILD,TOPICS,snapshot,subscribe(fn){if(typeof fn!=='function')throw fail('INVALID_SUBSCRIBER');subscribers.add(fn);return()=>subscribers.delete(fn);},attach(name,r){if(!active||!['relationship','registration'].includes(name)||surfaces.has(name)||!r?.root||typeof r.prepare!=='function'||typeof r.clear!=='function')throw fail('INVALID_RENDERER');surfaces.set(name,r);r.clear(notice,snapshot());start();return()=>{r.dispose?.();surfaces.delete(name);};},dispose,
  retryInitialize:t=>safe(()=>initialize(t)),refresh:t=>safe(()=>refresh(t)),choosePersona:(p,t)=>safe(()=>choosePersona(p,t)),logout:t=>safe(()=>logout(t)),selectPractitioner:(id,t)=>safe(()=>selectPractitioner(id,t)),setTopic:(v,t)=>safe(()=>setTopic(v,t)),setConsent:(v,t)=>safe(()=>setConsent(v,t)),setFilter:(v,t)=>safe(()=>setFilter(v,t)),setTab:(v,t)=>safe(()=>setTab(v,t)),openForm:(k,id,t)=>safe(()=>openForm(k,id,t)),editField:(k,v,t)=>safe(()=>editField(k,v,t)),setAck:(v,t)=>safe(()=>setAck(v,t)),sample:t=>safe(()=>sample(t)),save:t=>safe(()=>save(t)),cancelForm:t=>safe(()=>cancelForm(t)),requestAction:(a,id,t)=>safe(()=>requestAction(a,id,t)),reviewAction:(owner,s,id,t,reason)=>safe(()=>reviewAction(owner,s,id,t,reason)),relationshipAction:(a,id,t)=>safe(()=>relationshipAction(a,id,t)),confirmNavigation:(href,t)=>safe(()=>confirmNavigation(href,t))});
 unsubStore=E.store.subscribe(onStore);unsubEntry=E.subscribe(onEntry);w.addEventListener?.('pagehide',dispose);w.addEventListener?.('beforeunload',beforeUnload);E.ready().then(()=>{if(!active)return;readyResolved=true;start();}).catch(e=>complain(e));return api;
}
function install(entry,options={}){if(instances.has(entry))throw fail('DUPLICATE_CONTROLLER');const c=create({...options,entry});instances.set(entry,c);return c;}
function forEntry(entry){const c=instances.get(entry);if(!c)throw fail('CONTROLLER_NOT_MOUNTED');return c;}
return Object.freeze({buildId:BUILD,create,install,forEntry,TOPICS});
});
