/* Unmounted, synthetic-only pure model. No storage, authentication, network or medical recommendations. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.NutriServicePlanContractV1=factory();})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const BUILD='service-plan-pure-v1', FORMAT='synthetic-service-plans-v1';
const OWNERS=['fictional-lin','fictional-zhou'], REVIEWER='synthetic-reviewer';
const AUDIENCES=['WEIGHT','BALANCE','OFFICE','STUDENT','OLDER'];
const STATES=['DRAFT','SUBMITTED','APPROVED','REJECTED','WITHDRAWN'];
const FIELDS=['mode','accountId','protocolVersion','epoch','generation','revision'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function fail(code){throw Object.assign(Error(code),{code});}
function check(v,code){if(!v)fail(code);}
function json(v,seen=new Set(),depth=0){
 check(depth<=32,'DATA_TOO_DEEP');
 if(v===null||typeof v==='boolean')return;
 if(typeof v==='string'){check(v.length<=4100000,'TEXT_TOO_LONG');for(let i=0;i<v.length;i++){const n=v.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){const low=v.charCodeAt(++i);check(low>=0xdc00&&low<=0xdfff,'INVALID_UNICODE');}else check(!(n>=0xdc00&&n<=0xdfff),'INVALID_UNICODE');}return;}
 if(typeof v==='number'){check(Number.isFinite(v),'NON_JSON');return;}
 check(v&&typeof v==='object'&&!seen.has(v),'NON_JSON');
 const array=Array.isArray(v);check(Object.getPrototypeOf(v)===(array?Array.prototype:Object.prototype),'NON_JSON');
 if(array)check(Object.getPrototypeOf(Array.prototype)===Object.prototype,'NON_JSON');
 // Inspect inherited hooks without reading them; JSON.stringify would otherwise invoke them.
 for(let proto=Object.getPrototypeOf(v);proto;proto=Object.getPrototypeOf(proto))check(!Object.getOwnPropertyDescriptor(proto,'toJSON'),'JSON_HOOK_NOT_ALLOWED');
 const keys=Reflect.ownKeys(v);check(keys.every(k=>typeof k==='string'),'NON_JSON');
 if(array)check(keys.length===v.length+1&&keys.includes('length')&&Array.from({length:v.length},(_,i)=>own(v,String(i))).every(Boolean),'NON_JSON');
 seen.add(v);
 for(const k of keys){if(array&&k==='length')continue;
  check(!['__proto__','prototype','constructor'].includes(k),'UNSAFE_KEY');
  check(!/^(api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|password|client[_-]?secret|private[_-]?key|secret)$/i.test(k),'SECRET_NOT_ALLOWED');
  const d=Object.getOwnPropertyDescriptor(v,k);check(d&&own(d,'value')&&d.enumerable,'NON_JSON');
  check(k!=='isSynthetic'||d.value===true,'REAL_DATA_NOT_ALLOWED');
  check(k!=='mode'||!['real','live','production'].includes(d.value),'REAL_MODE_NOT_ALLOWED');
  json(d.value,seen,depth+1);
 }seen.delete(v);
}
function exact(v,fields,code='FIELDS'){check(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join(',')===fields.slice().sort().join(','),code);}
function serialize(v,sorted=false){
 json(v);
 function encode(x){
  // Only primitives reach native stringify; objects never get a toJSON callback opportunity.
  if(x===null||typeof x!=='object')return JSON.stringify(x);
  const array=Array.isArray(x);let keys=Object.keys(x);
  if(sorted&&!array){const order={};for(const k of keys.sort())Object.defineProperty(order,k,{value:true,enumerable:true});keys=Object.keys(order);}
  const parts=[];for(const k of keys){const d=Object.getOwnPropertyDescriptor(x,k);check(d&&own(d,'value')&&d.enumerable,'NON_JSON');const value=encode(d.value);parts.push(array?value:JSON.stringify(k)+':'+value);}
  return array?'['+parts.join(',')+']':'{'+parts.join(',')+'}';
 }
 return encode(v);
}
function copy(v){return JSON.parse(serialize(v));}
function canonical(v){return serialize(v,true);}
const same=(a,b)=>canonical(a)===canonical(b);
function integer(v,min=0){check(Number.isSafeInteger(v)&&v>=min,'INTEGER');return v;}
function id(v){check(typeof v==='string'&&/^[A-Za-z0-9_:-]{1,160}$/.test(v),'ID');return v;}
function key(v){check(typeof v==='string'&&/^[A-Za-z0-9_:-]{16,80}$/.test(v),'OPERATION_KEY');return v;}
function context(v){json(v);exact(v,FIELDS,'CONTEXT');check(v.mode==='synthetic'&&v.accountId==='demo-shen'&&v.protocolVersion===3,'CONTEXT');id(v.epoch);integer(v.generation);integer(v.revision);return copy(v);}
function sameScope(a,b){return FIELDS.filter(k=>k!=='revision').every(k=>a[k]===b[k]);}
function text(v,max,required=true){check(typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0),'TEXT');}
function content(v){exact(v,['title','audiences','durationDays','description'],'CONTENT_FIELDS');text(v.title,30);text(v.description,500);check([7,14,28].includes(v.durationDays),'DURATION');check(Array.isArray(v.audiences)&&v.audiences.length>0&&v.audiences.length<=5&&new Set(v.audiences).size===v.audiences.length&&v.audiences.every(k=>AUDIENCES.includes(k)),'AUDIENCES');check(same(v.audiences,AUDIENCES.filter(k=>v.audiences.includes(k))),'AUDIENCE_ORDER');}
function request(r){
 json(r);exact(r,['key','context','action','planId','expectedVersion','content'],'REQUEST_FIELDS');key(r.key);context(r.context);integer(r.expectedVersion);
 check(['save','submit','withdraw','review'].includes(r.action),'ACTION');
 if(r.planId!==null)check(typeof r.planId==='string'&&/^synthetic-service-[1-9][0-9]*$/.test(r.planId),'PLAN_ID');
 if(r.action==='save'){content(r.content);check(r.planId!==null||r.expectedVersion===0,'VERSION');}
 else{check(r.planId!==null,'PLAN_ID');if(r.action==='review'){exact(r.content,['decision','note','contentRevision','qualificationRevision'],'REVIEW_FIELDS');check(['APPROVED','REJECTED'].includes(r.content.decision),'REVIEW_DECISION');text(r.content.note,160,r.content.decision==='REJECTED');integer(r.content.contentRevision,1);integer(r.content.qualificationRevision,1);}else check(r.content===null,'CONTENT_FIELDS');}
 return r;
}
function plan(p){
 exact(p,['id','owner','version','contentRevision','content','state','qualificationRevision','review'],'PLAN_FIELDS');
 check(/^synthetic-service-[1-9][0-9]*$/.test(p.id)&&OWNERS.includes(p.owner),'PLAN_IDENTITY');integer(p.version,1);integer(p.contentRevision,1);check(p.contentRevision<=p.version,'VERSION');content(p.content);check(STATES.includes(p.state),'STATE');
 if(['DRAFT','WITHDRAWN'].includes(p.state)){check(p.qualificationRevision===null&&p.review===null,'APPROVAL_BINDING');}
 else{integer(p.qualificationRevision,1);if(p.state==='SUBMITTED')check(p.review===null,'APPROVAL_BINDING');else{exact(p.review,['decision','reviewer','contentRevision','qualificationRevision','note'],'REVIEW_FIELDS');check(p.review.reviewer===REVIEWER&&p.review.decision===p.state&&p.review.contentRevision===p.contentRevision&&p.review.qualificationRevision===p.qualificationRevision,'APPROVAL_BINDING');text(p.review.note,160,p.state==='REJECTED');}}
}
function validate(ns){
 json(ns);exact(ns,['format','nextSerial','plans','receipts'],'NAMESPACE_FIELDS');check(ns.format===FORMAT,'FORMAT');integer(ns.nextSerial,1);check(Array.isArray(ns.plans)&&ns.plans.length<=10&&Array.isArray(ns.receipts)&&ns.receipts.length<=64,'CAPACITY');
 const ids=new Set(),keys=new Set();for(const p of ns.plans){plan(p);check(!ids.has(p.id),'DUPLICATE_PLAN');ids.add(p.id);const serial=Number(p.id.slice(18));integer(serial,1);check(serial<ns.nextSerial,'SERIAL');}
 for(const r of ns.receipts){exact(r,['key','actor','request','result'],'RECEIPT_FIELDS');key(r.key);check(!keys.has(r.key),'DUPLICATE_KEY');keys.add(r.key);check([...OWNERS,REVIEWER].includes(r.actor),'ACTOR');request(r.request);check(r.key===r.request.key,'RECEIPT_KEY');exact(r.result,['planId','version','state','contentRevision','qualificationRevision'],'RESULT_FIELDS');const p=ns.plans.find(p=>p.id===r.result.planId);check(p&&Number.isSafeInteger(r.result.version)&&r.result.version>=1&&r.result.version<=p.version&&r.result.version===r.request.expectedVersion+1,'RECEIPT_RESULT');const state={save:'DRAFT',submit:'SUBMITTED',withdraw:'WITHDRAWN',review:r.request.content?.decision}[r.request.action];check(r.result.state===state,'RECEIPT_RESULT');check(r.request.planId===null?r.request.action==='save':r.request.planId===p.id,'RECEIPT_RESULT');check(r.actor===(r.request.action==='review'?REVIEWER:p.owner),'RECEIPT_ACTOR');}
 for(const p of ns.plans){
  const history=ns.receipts.filter(r=>r.result.planId===p.id);check(history.length===p.version&&history.every((r,i)=>r.result.version===i+1)&&history[0].request.planId===null&&history.slice(1).every(r=>r.request.planId===p.id),'PLAN_HISTORY');
  let state=null,revision=0,qualificationRevision=null,contentValue=null,review=null;
  for(const r of history){const q=r.request;
   if(q.action==='save'){revision++;contentValue=q.content;qualificationRevision=null;review=null;}
   else if(q.action==='submit'){check(['DRAFT','REJECTED','WITHDRAWN'].includes(state),'PLAN_HISTORY');integer(r.result.qualificationRevision,1);qualificationRevision=r.result.qualificationRevision;review=null;}
   else if(q.action==='review'){check(state==='SUBMITTED'&&q.content.contentRevision===revision&&q.content.qualificationRevision===qualificationRevision,'PLAN_HISTORY');review={...q.content,reviewer:REVIEWER};}
   else{check(['SUBMITTED','APPROVED'].includes(state),'PLAN_HISTORY');qualificationRevision=null;review=null;}
   state=r.result.state;check(r.result.contentRevision===revision&&r.result.qualificationRevision===qualificationRevision,'PLAN_HISTORY');
  }
  check(revision===p.contentRevision&&same(contentValue,p.content)&&state===p.state&&qualificationRevision===p.qualificationRevision&&same(review,p.review),'PLAN_HISTORY');
 }
 check(serialize(ns).length<=32768,'NAMESPACE_CAPACITY');return copy(ns);
}
function empty(){return {format:FORMAT,nextSerial:1,plans:[],receipts:[]};}
function qualification(q){exact(q,['owner','revision','status','expiresAt'],'QUALIFICATION_FIELDS');check(OWNERS.includes(q.owner)&&['DRAFT','PENDING','APPROVED','REJECTED','REVOKED'].includes(q.status),'QUALIFICATION');integer(q.revision);check(q.expiresAt===null||(Number.isSafeInteger(q.expiresAt)&&q.expiresAt>=0),'QUALIFICATION');if(q.status==='APPROVED')check(q.revision>0&&q.expiresAt!==null,'QUALIFICATION');}
function validQualification(q,now){return q&&q.status==='APPROVED'&&q.expiresAt>now;}
function environment(e){json(e);exact(e,['actor','context','now','qualifications'],'ENVIRONMENT_FIELDS');check([...OWNERS,REVIEWER].includes(e.actor),'ACTOR');context(e.context);integer(e.now);check(Array.isArray(e.qualifications)&&e.qualifications.length===2,'QUALIFICATIONS');const owners=new Set();for(const q of e.qualifications){qualification(q);check(!owners.has(q.owner),'QUALIFICATIONS');owners.add(q.owner);}}
function effective(p,q,now){json(p);plan(p);json(q);qualification(q);integer(now);check(q.owner===p.owner,'OWNER');return {approved:p.state==='APPROVED'&&validQualification(q,now)&&p.qualificationRevision===q.revision,syntheticOnly:true,bookingConnected:false};}
function transition(input,r,e){
 const ns=validate(input);request(r);environment(e);
 check(sameScope(r.context,e.context),'STALE_CONTEXT');
 const replay=ns.receipts.find(x=>x.key===r.key);
 if(replay){check(replay.actor===e.actor&&same(replay.request,r),'KEY_CONFLICT');check(e.context.revision>=r.context.revision,'STALE_REVISION');return {namespace:ns,result:copy(replay.result),replayed:true,changed:false};}
 check(same(r.context,e.context),'STALE_REVISION');check(ns.receipts.length<64,'RECEIPT_CAPACITY');
 let p=r.planId===null?null:ns.plans.find(x=>x.id===r.planId);if(r.planId!==null)check(p,'PLAN_NOT_FOUND');
 check(r.action==='review'?e.actor===REVIEWER:OWNERS.includes(e.actor)&&(!p||p.owner===e.actor),'OWNER');
 check((p?p.version:0)===r.expectedVersion,'STALE_VERSION');
 if(r.action==='save'){
  if(!p){check(ns.plans.length<10,'PLAN_CAPACITY');const serial=ns.nextSerial;integer(serial+1,1);p={id:'synthetic-service-'+serial,owner:e.actor,version:0,contentRevision:0,content:null,state:'DRAFT',qualificationRevision:null,review:null};ns.nextSerial++;ns.plans.push(p);}
  p.content=copy(r.content);p.contentRevision++;p.state='DRAFT';p.qualificationRevision=null;p.review=null;
 }else if(r.action==='submit'){
  check(['DRAFT','REJECTED','WITHDRAWN'].includes(p.state),'STATE_TRANSITION');const q=e.qualifications.find(x=>x.owner===p.owner);check(validQualification(q,e.now),'QUALIFICATION_REQUIRED');p.state='SUBMITTED';p.qualificationRevision=q.revision;p.review=null;
 }else if(r.action==='review'){
  check(p.state==='SUBMITTED','STATE_TRANSITION');const q=e.qualifications.find(x=>x.owner===p.owner);check(validQualification(q,e.now)&&q.revision===p.qualificationRevision,'QUALIFICATION_CHANGED');check(r.content.contentRevision===p.contentRevision&&r.content.qualificationRevision===p.qualificationRevision,'STALE_REVIEW');p.state=r.content.decision;p.review={...copy(r.content),reviewer:REVIEWER};
 }else{check(['SUBMITTED','APPROVED'].includes(p.state),'STATE_TRANSITION');p.state='WITHDRAWN';p.qualificationRevision=null;p.review=null;}
 p.version++;integer(p.version,1);integer(p.contentRevision,1);
 const result={planId:p.id,version:p.version,state:p.state,contentRevision:p.contentRevision,qualificationRevision:p.qualificationRevision};ns.receipts.push({key:r.key,actor:e.actor,request:copy(r),result:copy(result)});validate(ns);
 return {namespace:ns,result,replayed:false,changed:true};
}
return Object.freeze({buildId:BUILD,format:FORMAT,notice:'仅本机合成模型；未接真实服务/预约/身份认证，不提供个人营养或诊疗方案。',empty,validate,transition,effective,
 codec:Object.freeze({json,exact,copy,canonical,serialize,same,integer,id,key,context,sameScope,check,fail})});
});
