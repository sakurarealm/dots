/* Unmounted schema4 compatibility kernel. Five legacy bodies remain byte-identical; bridge changed and hashes recomputed. Full schema4 checkpoint retained; no I/O. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(require('./nutri-service-plan-contract-v1.js'));else root.NutriRegistrationKernelServiceV2=factory(root.NutriServicePlanContractV1);})(typeof globalThis==='object'?globalThis:this,function(Service){'use strict';
if(Service?.buildId!=='service-plan-pure-v1'||typeof Service.codec?.serialize!=='function')throw Error('SERVICE_CONTRACT_REQUIRED');
const factories=Object.create(null),cache=Object.create(null);
factories["registration-bridge.js"]=function(module,exports,require){
/* SOURCE-BEGIN registration-bridge.js */
'use strict';
const S=require('./registration-schema');
const A=require('./practitioner-model');
const B=require('./registration-vendor/nutritionistSynthetic');
const M=require('./registration-vendor/nutritionistPlatform');
const {clone,fail,stable,own}=S;
const P=Service;
const A_FIELDS=['schema','profiles','inquiries','invitations','receipts','serial'];
const NOTICE='仅虚构资质演示；未接真实登记、证件、认证、审核或发布服务。';
const increment=n=>{S.integer(n); if(!Number.isSafeInteger(n+1))throw fail('REGISTRATION_VERSION_OVERFLOW');return n+1;};
function seed(ctx) { return {...A.seed(ctx),registration:S.empty(),...(ctx?.meta?.schemaVersion===4?{servicePlans:P.empty()}:{})}; }
function aDomain(d) {
if(!d || d.schema!==1 || !Array.isArray(d.profiles) || !Array.isArray(d.inquiries) || !Array.isArray(d.invitations) || !Array.isArray(d.receipts))throw fail('PRACTITIONER_DOMAIN_NOT_READY');
if(Object.keys(d).some(k=>!A_FIELDS.includes(k)&&k!=='registration'&&k!=='servicePlans'))throw fail('PRACTITIONER_EXTENSION_UNSUPPORTED');
if(own(d,'servicePlans'))P.validate(d.servicePlans);
S.json(d);S.integer(d.serial);
if(d.profiles.length!==2 || S.OWNERS.some(id=>d.profiles.filter(p=>p.id===id).length!==1))throw fail('REGISTRATION_PROFILE_BOUNDARY');
for(const p of d.profiles){S.integer(p.revision);S.integer(p.validUntil);}
return Object.fromEntries(A_FIELDS.map(k=>[k,clone(d[k])]));
}
function shadow(domain,root,at) {
let state={meta:clone(root.meta),practitioner:clone(domain)};
const core={status:()=>({protocolVersion:1}),registerDomain:()=>clone(state.practitioner),read:()=>clone(state),
context:()=>({mode:'synthetic',accountId:'demo-shen',generation:state.meta.generation,revision:state.meta.revision}),
current:t=>!!t&&t.generation===state.meta.generation&&t.mode==='synthetic'&&t.accountId==='demo-shen',
update(fn,opts={}){if(opts.expectedRevision!==undefined&&opts.expectedRevision!==state.meta.revision)throw fail('SHADOW_REVISION');const next=clone(state);const r=fn(next);if(r&&typeof r.then==='function')throw fail('SHADOW_ASYNC');next.meta.revision++;state=next;return clone(state);}};
const service=A.create({core,now:()=>at});
return {service,read:()=>clone(state.practitioner)};
}
function metadata() {return Object.fromEntries(S.OWNERS.map(id=>[id,{epoch:0,relationshipRevision:null,expired:false,bindings:{}}]));}
function qState(m,p){return {revision:m.relationshipRevision,status:m.expired?'SYNTHETIC_EXPIRED':'SYNTHETIC_'+p.state,validUntil:p.state==='APPROVED'?Date.parse(p.validUntil):0};}
function bump(m){m.epoch=increment(m.epoch);m.relationshipRevision=increment(m.relationshipRevision);m.expired=false;m.bindings={};}
function canonical(b,meta) {return Object.fromEntries(S.OWNERS.map(owner=>[owner,{...clone(meta[owner]),...b.inspect(owner)}]));}
function expires(b,meta,at){return S.OWNERS.filter(owner=>{const p=b.inspect(owner).profile;return p&&p.state==='APPROVED'&&!meta[owner].expired&&Date.parse(p.validUntil)<=at;});}
function bindingValid(meta,p,a,at){const b=meta.bindings[a.id];return !!b&&!meta.expired&&M.eligible(p,at)&&b.epoch===meta.epoch&&b.profileVersion===p.version&&b.profileContentRevision===p.contentRevision&&b.articleContentRevision===a.contentRevision&&((a.state==='APPROVED'&&a.version===b.articleVersion)||(a.state==='PUBLISHED'&&a.version===b.articleVersion+1));}
function masked(owner,b,meta,at) {
const raw=b.inspect(owner),m=meta[owner],profile=raw.profile?{...raw.profile,isSynthetic:true,verificationLabel:'虚构资质演示 · 不是真实认证'}:null;
if(profile&&m.expired)profile.effectiveStatus='EXPIRED_OR_UNAVAILABLE';
const articles=raw.articles.map(a=>{const valid=bindingValid(m,profile,a,at);return {...a,isSynthetic:true,approvalCurrent:valid,approvedQualificationRevision:valid?a.approvedQualificationRevision:null,publiclyVisible:valid&&a.state==='PUBLISHED',verificationLabel:'合成文章审核情景',...(valid?{}:{reviewNotice:'当前没有有效文章审批；已审批内容须重新保存并送审。'})};});
return {owner,managed:!!profile,epoch:m.epoch,profile,articles};
}
async function apply(event,b,meta) {
const {kind,input,actor}=event;
if(kind!=='expire'&&expires(b,meta,event.at).length)throw fail('REGISTRATION_UNRECONCILED_JOURNAL');
if(kind==='expire') {
const m=meta[input.owner],p=b.inspect(input.owner).profile;
if(!p||p.state!=='APPROVED'||m.expired||m.epoch!==input.epoch||p.version!==input.profileVersion||Date.parse(p.validUntil)>event.at)throw fail('REGISTRATION_INVALID_EXPIRY');
bump(m);m.expired=true;return null;
}
if(kind==='relation')return event.result;
const owner=kind==='review'?input.owner:actor,m=meta[owner],before=b.inspect(owner),p=before.profile;
if(input.epoch!==m.epoch)throw fail('REGISTRATION_STALE_EPOCH');
if(kind==='request') {
const spec=S.request(input,event.at);
if(!p&&spec.kind==='profile'&&spec.verb===null){S.integer(event.baseRevision);m.relationshipRevision=event.baseRevision;}
else if(event.baseRevision!==null)throw fail('REGISTRATION_INVALID_BASE_REVISION');
if(spec.kind==='article'&&spec.verb==='submit'&&before.articles.some(a=>a.state==='SUBMITTED'))throw fail('ONE_SUBMITTED_ARTICLE_PER_OWNER');
if(spec.kind==='article'&&['submit','publish'].includes(spec.verb)&& (m.expired||!M.eligible(p,event.at)))throw fail('CURRENT_QUALIFICATION_APPROVAL_REQUIRED',403);
if(spec.verb==='publish') {const a=before.articles.find(x=>x.id===spec.target);if(!a||a.state!=='APPROVED'||!bindingValid(m,p,a,event.at))throw fail('CURRENT_CONTENT_AND_QUALIFICATION_APPROVAL_REQUIRED');}
const r=await b.request({owner,method:input.method,path:input.path,body:input.body,headers:{'Idempotency-Key':event.key}});
if(r.replayed)throw fail('REGISTRATION_UNEXPECTED_VENDOR_REPLAY');
if(spec.kind==='profile')bump(m);
else if(!spec.verb||spec.verb==='withdraw')delete m.bindings[r.current.id];
return {id:r.current.applicationId||r.current.id,version:r.current.version};
}
const article=['articleApproved','articleRejected'].includes(input.scenario),a=article&&before.articles.find(a=>a.id===input.id),target=article?a:p;
if(!target||(article?target.id:target.applicationId)!==input.id||target.version!==input.expectedVersion||target.contentRevision!==input.contentRevision)throw fail('REGISTRATION_STALE_REVIEW_TARGET');
if(article) {
const submitted=before.articles.filter(a=>a.state==='SUBMITTED');
if(submitted.length!==1||submitted[0].id!==input.id)throw fail('REGISTRATION_EXACT_ARTICLE_REQUIRED');
if(m.expired||!M.eligible(p,event.at)||input.profileVersion!==p.version||input.profileContentRevision!==p.contentRevision)throw fail('CURRENT_QUALIFICATION_APPROVAL_REQUIRED',403);
} else if(input.scenario==='revoked') {if(p.state!=='APPROVED')throw fail('APPROVED_REQUIRED');}
else if(p.state!=='SUBMITTED')throw fail('SUBMITTED_PROFILE_REQUIRED');
b.fixture(owner,input.scenario,input.reason);
const after=b.inspect(owner),result=article?after.articles.find(a=>a.id===input.id):after.profile;
if(!result||result.version!==input.expectedVersion+1||result.contentRevision!==input.contentRevision)throw fail('REGISTRATION_VENDOR_RESULT_MISMATCH');
if(article&&input.scenario==='articleRejected')delete m.bindings[input.id];
else if(article)m.bindings[input.id]={articleVersion:result.version,articleContentRevision:result.contentRevision,epoch:m.epoch,profileVersion:p.version,profileContentRevision:p.contentRevision};
else bump(m);
return {id:article?result.id:result.applicationId,version:result.version};
}
async function replay(journal,domain) {
S.validate(journal);let clock=1000;const b=B.create({now:()=>clock}),meta=metadata();
for(const e of journal.events){clock=e.at;const result=await apply(e,b,meta);if(stable(result)!==stable(e.result))throw fail('REGISTRATION_REPLAY_MISMATCH');
if(e.kind==='relation') {const receipt=domain.receipts.find(r=>r[0]===((e.actor.startsWith('client-')?'client':'practitioner')+':'+e.actor+':'+e.key));
const payload={...e.input,key:e.key},sig=JSON.stringify(Object.keys(payload).sort().map(k=>[k,payload[k]]));
if(!receipt||receipt[1].signature!==sig||receipt[1].id!==e.result.id||receipt[1].version!==e.result.version)throw fail('REGISTRATION_RELATION_RECEIPT_MISMATCH');}
}
if(journal.events.length&&stable(canonical(b,meta))!==stable(journal.projection))throw fail('REGISTRATION_PROJECTION_MISMATCH');
for(const owner of S.OWNERS){const p=b.inspect(owner).profile;if(!p)continue;const expected=qState(meta[owner],p),actual=domain.profiles.find(p=>p.id===owner);if(Object.keys(expected).some(k=>actual[k]!==expected[k]))throw fail('REGISTRATION_QUALIFICATION_BYPASS');}
return {b,meta,setClock:t=>{clock=t;}};
}
function create(options) {
if(!options||!options.core||typeof options.current!=='function')throw fail('REGISTRATION_CONTEXT_REQUIRED');
const core=options.core,now=options.now||Date.now,sessions=new Map();let active=true,observed=0,seenJournal=null;
function check(session){const actor=sessions.get(session);if(!active||!options.current()||!actor||!core.current(actor.context)){sessions.delete(session);throw fail('REGISTRATION_SESSION_CHANGED',401);}return actor;}
function history(journal,present,generation,record) {
if(seenJournal&&seenJournal.generation===generation&&seenJournal.present) {
if(!present)throw fail('REGISTRATION_JOURNAL_REMOVED');
if(journal.events.length<seenJournal.events.length||stable(journal.events.slice(0,seenJournal.events.length))!==stable(seenJournal.events))throw fail('REGISTRATION_JOURNAL_ROLLBACK');
}
if(record)seenJournal={generation,present,events:clone(journal.events)};
}
function clock(){const t=S.time(now());if(t<observed)throw fail('REGISTRATION_CLOCK_ROLLBACK');observed=t;return t;}
function validateIntent(intent,root){S.intent(intent);if(intent.generation!==root.meta.generation)throw fail('REGISTRATION_STALE_GENERATION');}
function view(actor,b,meta,service,at,context) {
const authors=S.OWNERS.map(owner=>masked(owner,b,meta,at));
return {mode:'synthetic',isSynthetic:true,notice:NOTICE,context:clone(context),
relationship:actor.persona==='synthetic-reviewer'?null:service.snapshot(service.login(actor.persona)),
registration:S.OWNERS.includes(actor.persona)?authors.find(a=>a.owner===actor.persona):null,
reviewQueue:actor.persona==='synthetic-reviewer'?authors:[],
publications:authors.flatMap(o=>o.articles.filter(a=>a.publiclyVisible).map(a=>({...a,owner:o.owner})))};
}
async function operate(session,kind,rawInput,key,rawIntent) {
const actor=check(session),at=clock(),root=core.read(),domain=aDomain(root.practitioner);
if(root.meta.mode!=='synthetic'||root.meta.accountId!=='demo-shen')throw fail('REGISTRATION_IDENTITY_BOUNDARY');
const input=kind==='request'?S.request(rawInput,at).value:kind==='review'?S.review(rawInput):kind==='relation'?S.relation(rawInput):null;
const intent=kind==='snapshot'?null:S.intent(rawIntent);
if(intent)validateIntent(intent,root);
if(kind!=='snapshot')S.key(key);
if(kind==='request'&&!S.OWNERS.includes(actor.persona))throw fail('REGISTRATION_AUTHOR_REQUIRED',403);
if(kind==='review'&&actor.persona!=='synthetic-reviewer')throw fail('REGISTRATION_REVIEWER_REQUIRED',403);
if(kind==='relation'&&actor.persona==='synthetic-reviewer')throw fail('REGISTRATION_CLIENT_OR_AUTHOR_REQUIRED',403);
const journal=own(root.practitioner,'registration')?clone(root.practitioner.registration):S.empty();
const ctx=await replay(journal,domain);check(session);
if(core.context().revision!==root.meta.revision)throw fail('STALE_REVISION');
history(journal,own(root.practitioner,'registration'),root.meta.generation,true);
const {b,meta}=ctx,last=journal.events[journal.events.length-1];if(last&&at<last.at)throw fail('REGISTRATION_CLOCK_ROLLBACK');ctx.setClock(at);
const prior=key&&journal.events.find(e=>e.key===key);
if(prior&&(prior.actor!==actor.persona||prior.kind!==kind||stable(prior.input)!==stable(input)))throw fail('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND');
if(!prior&&intent&&intent.revision!==root.meta.revision)throw fail('STALE_REVISION');
async function append(event) {
if(journal.events.length>=S.MAX_EVENTS)throw fail('REGISTRATION_CAPACITY');
if(event.kind==='review'&&event.input.scenario==='articleRejected'&&journal.schema==='native-registration-v1'){journal.checkpoint=JSON.stringify(root);journal.schema='native-registration-v2';journal.vendorHashes={...S.HASHES};}
event.seq=journal.events.length+1;
const result=await apply(event,b,meta);event.result=result;journal.events.push(event);
return result;
}
for(const owner of expires(b,meta,at)){const p=b.inspect(owner).profile;await append({seq:0,kind:'expire',actor:'system',at,key:null,input:{owner,epoch:meta[owner].epoch,profileVersion:p.version},result:null,baseRevision:null});}
let result=prior?prior.result:null;
if(kind!=='snapshot'&&kind!=='relation'&&!prior) {
const first=kind==='request'&&input.path===M.BASE+'/me'&&input.method==='PUT'&&!b.inspect(actor.persona).profile;
result=await append({seq:0,kind,actor:actor.persona,at,key,input,result:null,baseRevision:first?domain.profiles.find(p=>p.id===actor.persona).revision:null});
}
for(const owner of S.OWNERS){const p=b.inspect(owner).profile;if(p)Object.assign(domain.profiles.find(p=>p.id===owner),qState(meta[owner],p));}
const scratch=shadow(domain,root,at);let relationResult=null;
try {
if(kind==='relation') {
const token=scratch.service.login(actor.persona);
relationResult=await scratch.service.command(token,{...input,key});
result={id:relationResult.current.id,version:relationResult.committedVersion};
if(prior&&stable(result)!==stable(prior.result))throw fail('REGISTRATION_RELATION_RECEIPT_MISMATCH');
if(!prior)await append({seq:0,kind,actor:actor.persona,at,key,input,result,baseRevision:null});
}
scratch.service.snapshot(scratch.service.login('client-a'));
if(journal.events.length)journal.projection=canonical(b,meta);
S.validate(journal);
const candidate={...aDomain(scratch.read()),registration:journal,...(own(root.practitioner,'servicePlans')?{servicePlans:P.validate(root.practitioner.servicePlans)}:{})};
const changed=stable(candidate)!==stable(root.practitioner);
const deadlines=domain.profiles.filter(p=>p.status==='SYNTHETIC_APPROVED'&&p.validUntil>at).map(p=>p.validUntil);
function finalCheck() {
check(session);const end=clock();
if(deadlines.some(t=>end>=t))throw fail('REGISTRATION_EXPIRED_DURING_OPERATION');
}
finalCheck();
let saved=root;
if(changed)saved=core.update(next=>{finalCheck();next.practitioner=clone(candidate);},{expectedRevision:root.meta.revision,reason:'registration:'+kind});
else {const current=core.read();if(current.meta.revision!==root.meta.revision)throw fail('STALE_REVISION');}
history(journal,true,saved.meta.generation,true);
check(session);
const context={mode:'synthetic',accountId:'demo-shen',generation:saved.meta.generation,revision:saved.meta.revision};
const output=view(actor,b,meta,scratch.service,at,context);
let current=null;
if(result&&kind==='relation')current=relationResult.current;
else if(result){const owner=kind==='review'?input.owner:actor.persona,r=masked(owner,b,meta,at);current=result.id.startsWith('synthetic-profile-')?r.profile:r.articles.find(a=>a.id===result.id)||null;}
return {replayed:!!prior,committedVersion:result?result.version:null,current,view:output,context};
} finally {scratch.service.dispose();}
}
return {mode:'synthetic',notice:NOTICE,
login(persona){if(!active||!options.current())throw fail('REGISTRATION_SESSION_CHANGED',401);if(!S.PERSONAS.includes(persona))throw fail('REGISTRATION_PERSONA_DENIED',403);const session=Object.freeze({});sessions.set(session,{persona,context:core.context()});return session;},
logout(session){sessions.delete(session);},dispose(){active=false;sessions.clear();},
snapshot(session){return operate(session,'snapshot');},
request(session,input,key,intent){return operate(session,'request',input,key,intent);},
review(session,input,key,intent){return operate(session,'review',input,key,intent);},
command(session,input,key,intent){return operate(session,'relation',input,key,intent);}
};
}
function validateDomain(value){aDomain(value);S.validate(value.registration||S.empty());return true;}
function validateSeed(input){const value=P.codec.copy(input);if(!own(value,'registration'))value.registration=S.empty();validateDomain(value);if(stable(value.registration)!==stable(S.empty()))throw fail('NONEMPTY_REGISTRATION_SEED');if(own(value,'servicePlans')&&P.codec.canonical(value.servicePlans)!==P.codec.canonical(P.empty()))throw fail('SERVICE_SEED_NOT_EMPTY');return value;}
module.exports={create,seed,NOTICE,validateDomain,validateSeed};
/* SOURCE-END registration-bridge.js */
};
factories["registration-schema.js"]=function(module,exports,require){
/* SOURCE-BEGIN registration-schema.js */
'use strict';
const M = require('./registration-vendor/nutritionistPlatform');
const OWNERS = Object.freeze(['fictional-lin', 'fictional-zhou']);
const PERSONAS = Object.freeze(['client-a', 'client-b', ...OWNERS, 'synthetic-reviewer']);
const HASHES = Object.freeze({platform:'189e7f969901a160db5f3d4d31101039aa99d56642899dec762acd6451064875', synthetic:'18cbd091739aff0ae99bf63d093ab7c0c43afdebc394979e02a9a7cdb8aab1af'});
const LEGACY_HASHES={...HASHES,synthetic:'728fc054e80eb9a5c21e88d21589df322dae418a9bb31a1b1f46149ed1cf2488'};
const MAX_EVENTS = 128, MAX_UNITS = 384000;
const fail = (code, status=409) => Object.assign(new Error(code), {code,status,unavailable:true});
const clone = value => JSON.parse(JSON.stringify(value));
const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
function json(value, seen=new Set(), depth=0, decimals=false) {
if (depth>24) throw fail('REGISTRATION_INVALID_JSON');
if (value===null || typeof value==='boolean') return;
if (typeof value==='number') { if (!(decimals?Number.isFinite(value):Number.isSafeInteger(value))) throw fail('REGISTRATION_INVALID_NUMBER'); return; }
if (typeof value==='string') { if (value.length>200000) throw fail('REGISTRATION_TEXT_LIMIT'); return; }
if (!value || typeof value!=='object' || seen.has(value)) throw fail('REGISTRATION_INVALID_JSON');
if (!Array.isArray(value) && Object.getPrototypeOf(value)!==Object.prototype) throw fail('REGISTRATION_INVALID_JSON');
if (Array.isArray(value) && (Object.keys(value).length!==value.length || Array.from({length:value.length},(_,i)=>i).some(i=>!own(value,i)))) throw fail('REGISTRATION_SPARSE_ARRAY');
seen.add(value);
for (const key of Object.keys(value)) {
if (['__proto__','prototype','constructor'].includes(key) || /^(api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|password|secret)$/i.test(key)) throw fail('REGISTRATION_UNSAFE_KEY');
json(value[key],seen,depth+1,decimals);
}
seen.delete(value);
}
function exact(value, keys) {
json(value);
if (!value || Array.isArray(value) || typeof value!=='object' || Object.keys(value).length!==keys.length || keys.some(k=>!own(value,k))) throw fail('REGISTRATION_INVALID_FIELDS',400);
}
function integer(n) { if (!Number.isSafeInteger(n) || n<0) throw fail('REGISTRATION_INVALID_VERSION',400); return n; }
function time(n) { integer(n); if (n<1000 || n>8640000000000000-86400000) throw fail('REGISTRATION_INVALID_TIME'); return n; }
function id(s) { if (typeof s!=='string' || !/^[A-Za-z0-9_-]{1,80}$/.test(s)) throw fail('REGISTRATION_INVALID_ID',400); return s; }
function owner(s) { if (!OWNERS.includes(s)) throw fail('REGISTRATION_INVALID_OWNER',403); return s; }
function key(s) { if (typeof s!=='string' || !/^[A-Za-z0-9_-]{16,80}$/.test(s)) throw fail('REGISTRATION_INVALID_KEY',400); return s; }
function stable(value) {
if (value===null || typeof value!=='object') return JSON.stringify(value);
if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
}
function request(input, at) {
exact(input,['method','path','body','epoch']); integer(input.epoch);
const {method,path}=input; let fields=[], kind, target=null, verb=null;
if (path===M.BASE+'/me' && method==='PUT') { fields=M.PROFILE; kind='profile'; }
else if ([M.BASE+'/me/submit',M.BASE+'/me/withdraw'].includes(path) && method==='POST') { kind='profile'; verb=path.split('/').pop(); }
else if (path===M.BASE+'/publications' && method==='POST') { fields=M.ARTICLE; kind='article'; }
else {
const match=typeof path==='string' && path.match(/^\/api\/nutritionists\/publications\/(synthetic-article-[1-9]\d*)(?:\/(submit|publish|withdraw))?$/);
if (!match || !((!match[2]&&method==='PUT') || (match[2]&&method==='POST'))) throw fail('REGISTRATION_PATH_DENIED',400);
target=id(match[1]); verb=match[2]||null; kind='article'; if (!verb) fields=M.ARTICLE;
}
exact(input.body,['expectedVersion',...fields.map(f=>f[0])]); integer(input.body.expectedVersion);
const body={expectedVersion:input.body.expectedVersion};
if (fields.length) {
const checked=M.normalize(fields,input.body,at);
if (Object.keys(checked.errors).length) throw fail('REGISTRATION_INVALID_INPUT',400);
if (kind==='profile' && !/^SYNTHETIC-[A-Za-z0-9._:-]+$/.test(checked.value.credentialClaimRef)) throw fail('SYNTHETIC_REFERENCE_REQUIRED',400);
Object.assign(body,checked.value);
}
return {value:{method,path,body,epoch:input.epoch},kind,target,verb};
}
function review(input) {
const article=input && ['articleApproved','articleRejected'].includes(input.scenario);
exact(input,['owner','scenario','id','expectedVersion','contentRevision','epoch',...(article?['profileVersion','profileContentRevision']:[]),...(input.scenario==='articleRejected'?['reason']:[])]);
owner(input.owner); id(input.id); ['expectedVersion','contentRevision','epoch'].forEach(k=>integer(input[k]));
if (!['approved','rejected','revoked','articleApproved','articleRejected'].includes(input.scenario)) throw fail('REGISTRATION_REVIEW_UNSUPPORTED',400);
if(input.scenario==='articleRejected'&&!['SOURCE_INSUFFICIENT','SCOPE_UNCLEAR','LIMITATIONS_INSUFFICIENT'].includes(input.reason))throw fail('ARTICLE_REASON_REQUIRED',400);
if (article) ['profileVersion','profileContentRevision'].forEach(k=>integer(input[k]));
return clone(input);
}
function relation(input) {
const action=input && input.action;
const fields=['action','expectedVersion'];
if (action==='invite'||action==='inquire') fields.push('practitionerId','qualificationRevision','topic',...(action==='invite'?['consent']:[]));
else if (['accept','reject','revoke','answer','closeInquiry'].includes(action)) fields.push('id');
else throw fail('REGISTRATION_RELATION_ACTION',400);
exact(input,fields); integer(input.expectedVersion);
if (own(input,'practitionerId')) { owner(input.practitionerId); integer(input.qualificationRevision); if (!['MEAL_ROUTINE','FOOD_EDUCATION','HABIT_SUPPORT'].includes(input.topic)) throw fail('INVALID_TOPIC',400); }
if (own(input,'consent') && input.consent!==true) throw fail('CONSENT_REQUIRED',400);
if (own(input,'id')) id(input.id);
return clone(input);
}
function intent(input) { exact(input,['mode','accountId','generation','revision']); if (input.mode!=='synthetic'||input.accountId!=='demo-shen') throw fail('REGISTRATION_IDENTITY_BOUNDARY'); integer(input.generation); integer(input.revision); return clone(input); }
function empty() { return {schema:'native-registration-v1',normalization:1,vendorHashes:{...LEGACY_HASHES},events:[],projection:null}; }
function validate(value) {
exact(value,['schema','normalization','vendorHashes','events','projection',...(value.schema==='native-registration-v2'?['checkpoint']:[])]);
if (!['native-registration-v1','native-registration-v2'].includes(value.schema)||value.normalization!==1 || stable(value.vendorHashes)!==stable(value.schema==='native-registration-v1'?LEGACY_HASHES:HASHES)) throw fail('REGISTRATION_SCHEMA_UNSUPPORTED');
if (!Array.isArray(value.events)) throw fail('REGISTRATION_INVALID_JOURNAL');
if (value.events.length>MAX_EVENTS || JSON.stringify(value).length>MAX_UNITS) throw fail('REGISTRATION_CAPACITY');
if(value.schema==='native-registration-v2'){
const c=JSON.parse(value.checkpoint);json(c,new Set(),0,true);if(!c||Array.isArray(c)||Object.keys(c).sort().join(',')!=='commerce,health,meta,practitioner,profile'||JSON.stringify(c)!==value.checkpoint)throw fail('REGISTRATION_CHECKPOINT_FORMAT');
if(c.meta?.mode!=='synthetic'||c.meta.accountId!=='demo-shen'||c.meta.isSynthetic!==true||c.profile?.id!=='demo-shen'||c.profile.isSynthetic!==true)throw fail('REGISTRATION_CHECKPOINT_IDENTITY');integer(c.meta.generation);integer(c.meta.revision);
const j=c.practitioner?.registration||empty();if(j.schema!=='native-registration-v1')throw fail('REGISTRATION_CHECKPOINT_RECURSION');validate(j);
const first=value.events.findIndex(e=>e.kind==='review'&&e.input?.scenario==='articleRejected');if(first<j.events.length||stable(j.events)!==stable(value.events.slice(0,j.events.length))||value.events.slice(j.events.length,first).some(e=>e.kind!=='expire'))throw fail('REGISTRATION_CHECKPOINT_PREFIX');
}
let prior=0; const keys=new Set();
value.events.forEach((e,i)=>{
exact(e,['seq','kind','actor','at','key','input','result','baseRevision']);
if (e.seq!==i+1) throw fail('REGISTRATION_SEQUENCE'); time(e.at); if (e.at<prior) throw fail('REGISTRATION_CLOCK_ROLLBACK'); prior=e.at;
if (e.kind==='expire') {
if (e.actor!=='system'||e.key!==null||e.result!==null||e.baseRevision!==null) throw fail('REGISTRATION_INVALID_EXPIRY');
exact(e.input,['owner','epoch','profileVersion']); owner(e.input.owner); integer(e.input.epoch); integer(e.input.profileVersion);
} else {
key(e.key); if (keys.has(e.key)) throw fail('REGISTRATION_DUPLICATE_KEY'); keys.add(e.key);
exact(e.result,['id','version']); id(e.result.id); integer(e.result.version);
if (e.kind==='request') { owner(e.actor); if (stable(request(e.input,e.at).value)!==stable(e.input)) throw fail('REGISTRATION_NON_CANONICAL_INPUT'); if(e.baseRevision!==null)integer(e.baseRevision); }
else if (e.kind==='review') { if (e.actor!=='synthetic-reviewer'||e.baseRevision!==null)throw fail('REGISTRATION_INVALID_REVIEW'); review(e.input);if(e.input.scenario==='articleRejected'&&value.schema!=='native-registration-v2')throw fail('REGISTRATION_SCHEMA_UNSUPPORTED'); }
else if (e.kind==='relation') { if (!PERSONAS.includes(e.actor)||e.actor==='synthetic-reviewer'||e.baseRevision!==null)throw fail('REGISTRATION_INVALID_ACTOR'); relation(e.input); }
else throw fail('REGISTRATION_EVENT_UNSUPPORTED');
}
});
if (!value.events.length && value.projection!==null) throw fail('REGISTRATION_INVALID_EMPTY');
if (value.events.length && (!value.projection || typeof value.projection!=='object')) throw fail('REGISTRATION_PROJECTION_REQUIRED');
return value;
}
module.exports={OWNERS,PERSONAS,HASHES,MAX_EVENTS,MAX_UNITS,fail,clone,own,json,exact,integer,time,id,owner,key,stable,request,review,relation,intent,empty,validate};
/* SOURCE-END registration-schema.js */
};
factories["practitioner-model.js"]=function(module,exports,require){
/* SOURCE-BEGIN practitioner-model.js */
'use strict';
// Offline synthetic workflow. Sessions are memory capabilities, not production authentication.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NutriPractitioner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const error=(code,status=409)=>Object.assign(new Error(code),{code,status});
  const TOPICS={MEAL_ROUTINE:'日常膳食安排',FOOD_EDUCATION:'食物与营养知识',HABIT_SUPPORT:'饮食习惯陪伴'};
  const LABELS={PENDING:'等待营养师回应',ACCEPTED:'已接受邀请',REJECTED:'已婉拒',REVOKED:'已撤销授权',INVALIDATED:'资质变化，授权已失效',OPEN:'待回应',ANSWERED:'已回应',CLOSED:'已关闭'};
  function seedDomain(ctx={}){const at=ctx.now===undefined?Date.now():ctx.now;return {schema:1,profiles:[{id:'fictional-lin',name:'林小禾 · 虚构营养师',scope:'日常膳食教育',bio:'原创演示角色，仅用于体验咨询与邀请流程。',revision:1,status:'SYNTHETIC_APPROVED',validUntil:at+7*86400000},{id:'fictional-zhou',name:'周青 · 虚构营养师',scope:'饮食习惯陪伴',bio:'原创演示角色，不对应任何真实个人或资质。',revision:1,status:'SYNTHETIC_APPROVED',validUntil:at+7*86400000}],inquiries:[],invitations:[],receipts:[],serial:0};}
  function create(options={}){
    const now=options.now||Date.now,sessions=new Map(),receipts=new Map();let inquiries=[],invitations=[];
    let serial=0,failure=null;
    let profiles=[{id:'fictional-lin',name:'林小禾 · 虚构营养师',scope:'日常膳食教育',bio:'原创演示角色，仅用于体验咨询与邀请流程。',revision:1,status:'SYNTHETIC_APPROVED',validUntil:now()+7*86400000},{id:'fictional-zhou',name:'周青 · 虚构营养师',scope:'饮食习惯陪伴',bio:'原创演示角色，不对应任何真实个人或资质。',revision:1,status:'SYNTHETIC_APPROVED',validUntil:now()+7*86400000}];
    const core=options.core||null;
    const initialProfiles=clone(profiles);
    const seed=()=>({schema:1,profiles:initialProfiles.map(p=>({...p,validUntil:now()+7*86400000})),inquiries:[],invitations:[],receipts:[],serial:0});
    const coordinated=!!core&&(core.protocolVersion===2||core.status().protocolVersion===2);let inTransaction=false,active=true;let ready=Promise.resolve();if(core){if(coordinated){core.defineDomain('practitioner',seedDomain);ready=core.initialize({domains:['practitioner'],guard:()=>active});}else core.registerDomain('practitioner',seed);}
    let coreRevision,coreTicket;
    function hydrate(d){if(!d||d.schema!==1||!Array.isArray(d.profiles)||!Array.isArray(d.inquiries)||!Array.isArray(d.invitations)||!Array.isArray(d.receipts))throw error('INVALID_STORED_DEMO',409);profiles=clone(d.profiles);inquiries=clone(d.inquiries);invitations=clone(d.invitations);serial=d.serial;receipts.clear();for(const [key,value] of d.receipts)receipts.set(key,value);}
    function sync(){if(!core||inTransaction)return;const all=core.read();coreRevision=all.meta.revision;coreTicket={mode:all.meta.mode,accountId:all.meta.accountId,protocolVersion:all.meta.protocolVersion,epoch:all.meta.epoch,generation:all.meta.generation,revision:all.meta.revision};hydrate(all.practitioner);}
    function domain(){return {schema:1,profiles:clone(profiles),inquiries:clone(inquiries),invitations:clone(invitations),receipts:clone([...receipts]),serial};}
    function persist(){if(!core||inTransaction)return;if(coordinated)throw error('ASYNC_REQUIRED');const domain={schema:1,profiles:clone(profiles),inquiries:clone(inquiries),invitations:clone(invitations),receipts:clone([...receipts]),serial};const updated=core.update(all=>{all.practitioner=domain;},{expectedRevision:coreRevision});coreRevision=updated.meta.revision;}
    if(!coordinated)sync();else ready=ready.then(()=>sync());
    const eligible=p=>p&&p.status==='SYNTHETIC_APPROVED'&&p.validUntil>now();
    const actor=session=>{const who=sessions.get(session);if(!who||(core&&!core.current(who.ticket))){sessions.delete(session);throw error('LOGIN_REQUIRED',401);}return who;};
    const profile=id=>profiles.find(p=>p.id===id);
    function reconcile(){let changed=false;for(const i of invitations){if(['PENDING','ACCEPTED'].includes(i.state)&&(!eligible(profile(i.practitionerId))||profile(i.practitionerId).revision!==i.qualificationRevision)){i.state='INVALIDATED';i.version++;i.updatedAt=now();changed=true;}}return changed;}
    function allowed(who,item){return who.role==='client'?item.clientId===who.id:item.practitionerId===who.id;}
    function view(who,item){
      // Never expose client account identifiers, credentials, measurements, records or contact details.
      const {id,practitionerId,topic,state,version,createdAt,updatedAt,qualificationRevision,consent,reply}=item;
      return {id,practitionerId,topic,state,version,createdAt,updatedAt,qualificationRevision,consent,reply,clientLabel:who.role==='practitioner'?'虚构访客 '+item.clientAlias: '我（合成访客）',statusLabel:LABELS[state]};
    }
    function snapshot(session){const who=actor(session);sync();if(reconcile()&&!coordinated)persist();return clone({mode:'synthetic',identity:{role:who.role,label:who.role==='client'?(who.id==='client-a'?'沈先生 · 合成访客 A':'合成访客 B'):profile(who.id).name},directory:profiles.filter(eligible).map(({id,name,scope,bio,revision})=>({id,name,scope,bio,revision,label:'合成审核情景 · 不是真实认证'})),inquiries:inquiries.filter(x=>allowed(who,x)).map(x=>view(who,x)),invitations:invitations.filter(x=>allowed(who,x)).map(x=>view(who,x)),privateClients:invitations.filter(x=>allowed(who,x)&&x.state==='ACCEPTED').map(x=>({relationshipId:x.id,clientLabel:who.role==='practitioner'?'虚构访客 '+x.clientAlias:'我（合成访客）',practitionerId:x.practitionerId,topic:x.topic,scope:'仅共享所选需求类别；不含健康记录、聊天或联系方式'}))});}
    function perform(session,command){const who=actor(session);sync();if(reconcile())persist();const {action,id,expectedVersion,key}=command;
      if(!/^[A-Za-z0-9_-]{16,80}$/.test(key||''))throw error('INVALID_KEY',400);
      const signature=JSON.stringify(Object.keys(command).sort().map(k=>[k,command[k]])),receiptKey=who.role+':'+who.id+':'+key,prior=receipts.get(receiptKey);
      if(prior){if(prior.signature!==signature)throw error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND');return {replayed:true,committedVersion:prior.version,current:view(who,[...inquiries,...invitations].find(x=>x.id===prior.id))};}
      let item;
      if(action==='inquire'||action==='invite'){
        if(who.role!=='client')throw error('FORBIDDEN',403);
        const p=profile(command.practitionerId);if(!eligible(p))throw error('QUALIFICATION_UNAVAILABLE',403);
        if(command.qualificationRevision!==p.revision)throw error('QUALIFICATION_CHANGED');
        if(!TOPICS[command.topic])throw error('INVALID_TOPIC',400);
        if(expectedVersion!==0)throw error('STALE_VERSION');
        if(action==='invite'&&command.consent!==true)throw error('CONSENT_REQUIRED',400);
        const collection=action==='invite'?invitations:inquiries;
        if(collection.some(x=>x.clientId===who.id&&x.practitionerId===p.id&&['PENDING','ACCEPTED','OPEN'].includes(x.state)))throw error('ACTIVE_REQUEST_EXISTS');
        item={id:'synthetic-demand-'+(++serial),clientId:who.id,clientAlias:who.id.slice(-1),practitionerId:p.id,qualificationRevision:p.revision,topic:command.topic,consent:action==='invite',state:action==='invite'?'PENDING':'OPEN',version:1,createdAt:now(),updatedAt:now()};collection.push(item);
      }else{
        item=[...inquiries,...invitations].find(x=>x.id===id);
        if(!item||!allowed(who,item))throw error('NOT_FOUND',404);
        if(expectedVersion!==item.version)throw error('STALE_VERSION');
        if(['accept','reject','answer'].includes(action)&&who.role!=='practitioner')throw error('FORBIDDEN',403);
        if(action==='accept'||action==='reject'){
          if(!invitations.includes(item)||item.state!=='PENDING')throw error('PENDING_REQUIRED');
          if(!eligible(profile(who.id)))throw error('QUALIFICATION_UNAVAILABLE',403);
          item.state=action==='accept'?'ACCEPTED':'REJECTED';
        }else if(action==='revoke'){
          if(!invitations.includes(item)||!['PENDING','ACCEPTED'].includes(item.state))throw error('ACTIVE_RELATIONSHIP_REQUIRED');
          item.state='REVOKED';
        }else if(action==='answer'){
          if(!inquiries.includes(item)||item.state!=='OPEN')throw error('OPEN_REQUIRED');
          if(!eligible(profile(who.id))||item.qualificationRevision!==profile(who.id).revision)throw error('QUALIFICATION_UNAVAILABLE',403);
          // Fixed non-clinical response avoids collecting health data in a disconnected demo.
          item.reply='合成回复：已了解您所选的需求类别。真实咨询尚未接入；这里不提供个体化诊疗或处方。';item.state='ANSWERED';
        }else if(action==='closeInquiry'){
          if(!inquiries.includes(item)||item.state==='CLOSED')throw error('OPEN_REQUIRED');item.state='CLOSED';
        }else throw error('INVALID_COMMAND',400);
        item.version++;item.updatedAt=now();
      }
      receipts.set(receiptKey,{signature,id:item.id,version:item.version});persist();return {replayed:false,committedVersion:item.version,current:view(who,item)};
    }
    function transaction(session,fn,reason){const who=session?actor(session):null,context=who?who.ticket:core.context();return core.transact((all,tx)=>{if(session)actor(session);hydrate(all.practitioner);const prior=JSON.stringify(all.practitioner);inTransaction=true;let value;try{value=fn();}finally{inTransaction=false;}const next=domain();if(JSON.stringify(next)===prior)return tx.noop(clone(value===undefined?null:value));all.practitioner=next;return clone(value===undefined?null:value);},{context,guard:()=>active&&(!session||sessions.has(session)),reason}).then(r=>{hydrate(r.state.practitioner);return r.value;}).catch(e=>{try{sync();}catch(_){}throw e;});}
    function fixtureChange(id,status){sync();const p=profile(id);if(!p)throw error('NOT_FOUND',404);if(!['revise','revoke','expire','restore'].includes(status))throw error('INVALID_FIXTURE',400);p.revision++;p.status=status==='revoke'?'SYNTHETIC_REVOKED':'SYNTHETIC_APPROVED';p.validUntil=now()+(status==='expire'?-1:7*86400000);reconcile();persist();}
    return {mode:'synthetic',coordinated,ready,dispose(){active=false;sessions.clear();},
      login(persona){sync();let who;if(['client-a','client-b'].includes(persona))who={id:persona,role:'client'};else if(profile(persona))who={id:persona,role:'practitioner'};else throw error('UNKNOWN_SYNTHETIC_PERSONA',401);const session=Object.freeze({});sessions.set(session,{...who,ticket:core?(coordinated?coreTicket:core.context()):null});return session;},
      logout(session){sessions.delete(session);},snapshot,
      snapshotAsync(session){if(!coordinated)return Promise.resolve(snapshot(session));return transaction(session,()=>{reconcile();return snapshot(session);},'practitioner:reconcile');},
      async command(session,command){const next=failure;failure=null;if(next&&!next.afterCommit)throw error('SYNTHETIC_TIMEOUT',0);const sanitized=Object.fromEntries(['action','id','expectedVersion','key','practitionerId','qualificationRevision','topic','consent'].filter(k=>Object.prototype.hasOwnProperty.call(command,k)).map(k=>[k,command[k]]));const payload=clone(sanitized);const result=coordinated?await transaction(session,()=>perform(session,payload),'practitioner:command'):perform(session,payload);if(next)throw error('SYNTHETIC_TIMEOUT',0);return clone(result);},
      fixture(id,status){if(coordinated)throw error('ASYNC_REQUIRED');return fixtureChange(id,status);},
      fixtureAsync(id,status,session){if(!coordinated){fixtureChange(id,status);return Promise.resolve();}return transaction(session||null,()=>fixtureChange(id,status),'practitioner:fixture');},
      failNext(afterCommit=false){failure={afterCommit};}
    };
  }
  function controller(options={}){
    const service=options.service;let session=null,generation=0,serial=0,pending=null;
    let state={ready:false,busy:false,error:'',notice:'',data:null};
    const snapshot=()=>clone({...state,canRetry:!!pending&&!state.busy,uncertain:!!pending,canAct:!!session&&state.ready&&!state.busy&&!pending});
    const emit=()=>options.onChange&&options.onChange(snapshot());
    function refresh(){if(!session)return false;const token=session,gen=generation;const apply=data=>{if(gen!==generation||token!==session)return false;state.data=data;state.ready=true;state.error='';emit();return true;};const fail=e=>{if(gen!==generation)return false;state.ready=false;state.data=null;state.error=e.code;emit();return false;};if(service.coordinated)return service.snapshotAsync(token).then(apply,fail);try{return apply(service.snapshot(token));}catch(e){return fail(e);}}

    async function execute(){if(!pending||state.busy)return false;const gen=generation,token=session;state.busy=true;state.error='';emit();try{const r=await service.command(token,pending);if(gen!==generation)return false;pending=null;state.notice=r.replayed?'原请求已处理，已核对当前状态。':'合成操作已完成；未写入真实服务。';await refresh();return true;}catch(e){if(gen!==generation)return false;state.error=e.code;if(e.status>=400){pending=null;state.ready=false;if(e.status===401||e.status===403)state.data=null;}return false;}finally{if(gen===generation){state.busy=false;emit();}}}
    return {snapshot,refresh,async fixture(id,status){if(!session||state.busy||pending)return false;const token=session,gen=generation;state.busy=true;emit();try{await service.fixtureAsync(id,status,token);if(gen!==generation)return false;await refresh();return true;}catch(e){if(gen===generation){state.error=e.code;emit();}return false;}finally{if(gen===generation){state.busy=false;emit();}}},
      switchPersona(persona){generation++;if(session)service.logout(session);session=null;pending=null;state={ready:false,busy:false,error:'',notice:'',data:null};emit();session=service.login(persona);return refresh();},
      close(){generation++;if(session)service.logout(session);session=null;pending=null;state={ready:false,busy:false,error:'',notice:'已退出合成角色。未取消已发出的请求。',data:null};emit();},
      command(input){if(!snapshot().canAct)return Promise.resolve(false);pending={...clone(input),key:'synthetic_demand_'+Date.now().toString(36)+'_'+(++serial)+'_'+Math.random().toString(36).slice(2,12)};return execute();},retry:execute,
      reconcile(){if(session&&!state.busy&&!pending)return refresh();return false;}
    };
  }
  return {seed:seedDomain,create,controller,TOPICS,LABELS,live:{configured:false,status:'真实营养师目录与服务尚未连接',directory:()=>[],command:async()=>{throw error('NOT_CONNECTED',503);}}};
});
/* SOURCE-END practitioner-model.js */
};
factories["registration-vendor/nutritionistPlatform.js"]=function(module,exports,require){
/* SOURCE-BEGIN registration-vendor/nutritionistPlatform.js */
'use strict';
// Backend contract: 2d081be3ad0ef6af226f4e1064f8c4744cd6836f.
// No production transport is installed. An explicit synthetic adapter is the only enabled mode.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NutriPlatform = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const BASE = '/api/nutritionists';
  const PROFILE = [
    ['displayName','展示名称',80], ['biography','个人简介',1000,true],
    ['practiceScope','执业范围说明',256], ['credentialType','资质类型',80],
    ['credentialIssuer','颁发机构',160], ['credentialJurisdiction','适用地区',80],
    ['credentialClaimRef','外部材料引用编号',128]
  ];
  const ARTICLE = [
    ['title','文章标题',160], ['bodyText','正文（纯文本）',10000],
    ['sourceUrl','HTTPS 来源网址',2048], ['sourceTitle','来源标题',256],
    ['sourceDate','来源日期（YYYY-MM-DD）',10], ['applicability','适用范围',1000],
    ['limitations','限制与注意事项',1000]
  ];
  const QUAL = {DRAFT:'登记草稿',SUBMITTED:'等待人工审核',APPROVED:'人工审核通过',REJECTED:'人工审核未通过',WITHDRAWN:'已撤回',REVOKED:'审核资格已撤销'};
  const PUB = {DRAFT:'文章草稿',SUBMITTED:'等待文章人工审核',APPROVED:'文章审核通过，尚未发布',PUBLISHED:'已发布',REJECTED:'文章审核未通过',WITHDRAWN:'文章已撤回'};
  const REASONS = {EVIDENCE_INSUFFICIENT:'核验材料不足',SCOPE_UNSUPPORTED:'范围不支持',CREDENTIAL_EXPIRED:'资质已过期',POLICY_VIOLATION:'违反内容政策',USER_REQUEST:'本人请求',OTHER:'其他原因'};
  const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const blank = fields => Object.fromEntries(fields.map(([key]) => [key,'']));
  const fail = (code,status=0) => Object.assign(new Error(code),{code,status});
  const safeVersion = v => Number.isSafeInteger(v) && v >= 0;
  const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
  function normalize(fields,input,now) {
    const value = {}, errors = {};
    for (const [key,label,max,optional] of fields) {
      const raw = typeof input[key] === 'string' ? input[key] : '';
      const text = raw.trim(); value[key] = text;
      if ((!optional && !text) || raw.length > max || /[<>\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text)) errors[key] = label+'须为'+(optional?'至多':'1 至 ')+max+'字的纯文本';
    }
    if ('credentialClaimRef' in value && !/^[A-Za-z0-9._:-]{1,128}$/.test(value.credentialClaimRef)) errors.credentialClaimRef='引用编号仅可含字母、数字、点、下划线、冒号和短横线';
    if ('sourceUrl' in value) {
      // Deliberately conservative ASCII subset; no fetching, HTML, userinfo or URL navigation.
      if (!/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#][^\s<>]*)?$/.test(value.sourceUrl) || /@/.test(value.sourceUrl.split(/[/?#]/)[2]||'')) errors.sourceUrl='请使用不含账号信息的 HTTPS 来源网址';
      const d=value.sourceDate, time=Date.parse(d+'T00:00:00.000Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10)!==d || d>new Date(now).toISOString().slice(0,10)) errors.sourceDate='来源日期须为有效日期，且不能晚于今天';
    }
    return {value,errors};
  }
  function eligible(p,now) {
    return !!p && p.state==='APPROVED' && p.effectiveStatus==='APPROVED' && p.verificationMethod==='MANUAL_EXTERNAL' && Number.isFinite(Date.parse(p.approvedAt)) && Date.parse(p.approvedAt)<=now && Date.parse(p.validUntil)>now;
  }
  function profileLabel(p,now) {
    if (!p) return '尚无登记';
    if (p.effectiveStatus==='AUTHOR_UNAVAILABLE') return '账户当前不可用';
    if (p.state==='APPROVED' && !eligible(p,now)) return '人工审核已过期或当前不可用';
    return QUAL[p.state] || '未知审核状态，请刷新';
  }
  function articleLabel(a,p,now) {
    if (!a) return '尚无文章';
    if (a.state==='PUBLISHED' && !(a.publiclyVisible===true && eligible(p,now) && a.approvedQualificationRevision===p.contentRevision && a.currentQualificationRevision===p.contentRevision)) return '曾发布，当前不可见，请刷新审核状态';
    return PUB[a.state] || '未知文章状态，请刷新';
  }
  const errorText = e => ({
    NOT_CONNECTED:'真实服务未连接，未提交任何资料。', SYNTHETIC_ONLY:'当前仅支持明确标识的离线合成演练。',
    VALIDATION:'请修正表单中标出的字段。', STALE_VERSION:'版本已变化，请刷新最新记录后重新编辑；不会自动覆盖。',
    CONFLICT_READ_CURRENT_STATE_OR_RETRY_SAME_COMMAND:'记录冲突，请刷新最新记录后核对。',
    IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND:'请求编号冲突，请刷新后重新核对。',
    CURRENT_QUALIFICATION_APPROVAL_REQUIRED:'当前资质未通过、已过期或不可用，不能提交或发布文章。',
    CURRENT_CONTENT_AND_QUALIFICATION_APPROVAL_REQUIRED:'文章或资质修订已变化，须重新审核。',
    DRAFT_REQUIRED:'仅草稿可提交；请先保存本次修改。', APPROVED_REQUIRED:'文章须先通过人工审核。',
    REFRESH_REQUIRED:'请先刷新最新状态。', SAVE_FIRST:'请先保存修改，再提交审核。',
    PENDING_RETRY:'上次结果尚不确定，请重试原请求或取消并刷新核对。',
    LOGIN_REQUIRED:'登录已失效，请重新登录后刷新。', ACCOUNT_INACTIVE:'账户不可用，未继续操作。',
    BAD_RESPONSE:'服务返回不完整，未视为提交成功。', NO_PROFILE:'请先保存登记草稿。'
  })[e.code] || (e.status===401?'登录已失效，请重新登录。':e.status===403?'无权执行此操作，请检查账户或资质状态。':e.status===409?'状态或版本冲突，请刷新后核对。':'请求未确认成功。可重试原请求，重试不会产生新的请求编号。');
  function controller(options={}) {
    const now=options.now||Date.now;
    let adapter=options.adapter||null, owner=options.owner||null, generation=0, session=0, serial=0, pending=null;
    let state;
    const active = () => !!adapter && adapter.mode==='synthetic' && !!owner;
    const emit = () => { if(options.onChange) options.onChange(snapshot()); };
    function reset() { state={mode:active()?'synthetic':'disconnected',open:false,busy:false,ready:false,conflict:false,error:'',notice:'',profile:null,articles:[],selected:null,profileDraft:blank(PROFILE),articleDraft:blank(ARTICLE),profileDirty:false,articleDirty:false,errors:{},hasMore:false,page:0}; pending=null; }
    function snapshot() {
      const p=state.profile, a=state.selected, allowed=active()&&state.ready&&!state.busy&&!state.conflict&&!pending;
      // One freshness rule for main labels AND list rows. A lost response does not prove no commit.
      // Be conservative across dependent qualification/publication views until current is received.
      const verified=state.ready&&!state.busy&&!state.conflict&&!pending;
      const uncertainty=pending?'请求结果未确认；':state.busy?'正在读取；':state.conflict?'版本已变化；':'';
      const priorProfile=p?(p.effectiveStatus==='AUTHOR_UNAVAILABLE'?'账户不可用':p.effectiveStatus==='EXPIRED_OR_UNAVAILABLE'?'人工审核已过期或不可用':QUAL[p.state]||'未知审核状态'):'尚无登记';
      const priorArticle=item=>item?(item.state==='PUBLISHED'&&item.publiclyVisible!==true?'曾发布，上次记录不可见':PUB[item.state]||'未知文章状态'):'尚无文章';
      const unverified=(subject,previous)=>uncertainty+subject+'当前状态尚未核对；上次记录：'+previous;
      const qualificationStatus=verified?profileLabel(p,now()):unverified('审核',priorProfile);
      const publicationStatus=item=>verified?articleLabel(item,p,now()):unverified('文章',priorArticle(item));
      return {...clone(state),statusesVerified:!!verified,canEdit:active()&&state.ready&&!state.busy&&!state.conflict&&!pending,canRetry:!!pending&&!state.busy,
        qualificationLabel:qualificationStatus,articleLabel:publicationStatus(a),
        articleRows:state.articles.map(item=>({...clone(item),statusLabel:publicationStatus(item)})),
        qualificationReason:p&&REASONS[p.decisionReason]||'',articleReason:a&&REASONS[a.decisionReason]||'',
        canSaveProfile:allowed,canSubmitProfile:!!(allowed&&p&&p.state==='DRAFT'&&!state.profileDirty),
        canWithdrawProfile:!!(allowed&&p&&!['WITHDRAWN','REVOKED'].includes(p.state)),
        canSaveArticle:allowed&&!!p,canSubmitArticle:!!(allowed&&a&&a.state==='DRAFT'&&!state.articleDirty&&eligible(p,now())),
        canPublish:!!(allowed&&a&&a.state==='APPROVED'&&!state.articleDirty&&eligible(p,now())&&a.approvedQualificationRevision===p.contentRevision&&a.currentQualificationRevision===p.contentRevision),
        canWithdrawArticle:!!(allowed&&a&&a.state!=='WITHDRAWN')};
    }
    function fieldValues(fields,obj) { return Object.fromEntries(fields.map(([k])=>[k,obj&&typeof obj[k]==='string'?obj[k]:''])); }
    function validProfile(p) { return p&&validId(p.applicationId)&&safeVersion(p.version)&&safeVersion(p.contentRevision)&&QUAL[p.state]&&typeof p.effectiveStatus==='string'; }
    function validArticle(a) { return a&&validId(a.id)&&safeVersion(a.version)&&safeVersion(a.contentRevision)&&PUB[a.state]&&typeof a.publiclyVisible==='boolean'; }
    function apply(kind,current) {
      if (kind==='profile') {
        if(!validProfile(current))throw fail('BAD_RESPONSE');
        state.profile=clone(current);state.profileDraft=fieldValues(PROFILE,current);state.profileDirty=false;
      } else {
        if(!validArticle(current))throw fail('BAD_RESPONSE');
        state.selected=clone(current);state.articleDraft=fieldValues(ARTICLE,current);state.articleDirty=false;
        state.articles=[clone(current),...state.articles.filter(a=>a.id!==current.id)];
      }
    }
    async function refresh(page=0) {
      if(!active()){state.error=errorText(fail('NOT_CONNECTED'));emit();return false;}
      if(state.busy)return false;
      // This explicit refresh replaces dirty local drafts. UI must ask before invoking.
      const gen=++generation, who=owner;pending=null;state.busy=true;state.error='';emit();
      try {
        let p;
        try { p=await adapter.request({method:'GET',path:BASE+'/me',owner:who}); }
        catch(e) { if(e.status===404&&e.code==='APPLICATION_NOT_FOUND')p=null;else throw e; }
        if(gen!==generation||owner!==who)return false;
        if(p&&!validProfile(p))throw fail('BAD_RESPONSE');
        const list=p?await adapter.request({method:'GET',path:BASE+'/publications?page='+page+'&size=20',owner:who}):{items:[],page:0,size:20,total:0};
        if(gen!==generation||owner!==who)return false;
        if(!list||!Array.isArray(list.items)||!list.items.every(validArticle)||!safeVersion(list.total))throw fail('BAD_RESPONSE');
        state.profile=p;state.profileDraft=fieldValues(PROFILE,p);state.profileDirty=false;
        state.articles=clone(list.items);state.page=page;state.hasMore=(page+1)*20<list.total;
        state.selected=null;state.articleDraft=blank(ARTICLE);state.articleDirty=false;
        state.ready=true;state.conflict=false;state.notice='已读取当前'+(active()?'合成':'')+'状态。';return true;
      } catch(e) { if(gen===generation&&owner===who){if(e.status===401||e.status===403){const open=state.open;reset();state.open=open;}state.error=errorText(e);state.ready=false;}return false; }
      finally {if(gen===generation&&owner===who){state.busy=false;emit();}}
    }
    function reject(e) {state.error=errorText(e);emit();return Promise.resolve(false);}
    function command(action) {
      if(!active())return reject(fail('NOT_CONNECTED'));
      if(state.busy)return Promise.resolve(false);
      if(pending)return reject(fail('PENDING_RETRY'));
      if(!state.ready||state.conflict)return reject(fail('REFRESH_REQUIRED'));
      const p=state.profile,a=state.selected;
      let kind,method,path,body;
      state.errors={};
      if(action==='saveProfile'||action==='saveArticle') {
        kind=action==='saveProfile'?'profile':'article';
        if(kind==='article'&&!p)return reject(fail('NO_PROFILE'));
        const checked=normalize(kind==='profile'?PROFILE:ARTICLE,kind==='profile'?state.profileDraft:state.articleDraft,now());
        state.errors=checked.errors;
        if(Object.keys(checked.errors).length)return reject(fail('VALIDATION'));
        body={expectedVersion:(kind==='profile'?p:a)?.version||0,...checked.value};
        method=kind==='profile'||a?'PUT':'POST';path=kind==='profile'?BASE+'/me':BASE+'/publications'+(a?'/'+a.id:'');
      } else if(['submitProfile','withdrawProfile'].includes(action)) {
        kind='profile';if(!p)return reject(fail('NO_PROFILE'));
        if(action==='submitProfile'&&state.profileDirty)return reject(fail('SAVE_FIRST'));
        if(action==='submitProfile'&&p.state!=='DRAFT')return reject(fail('DRAFT_REQUIRED'));
        method='POST';path=BASE+'/me/'+(action==='submitProfile'?'submit':'withdraw');body={expectedVersion:p.version};
      } else if(['submitArticle','publishArticle','withdrawArticle'].includes(action)) {
        kind='article';if(!a)return reject(fail('REFRESH_REQUIRED'));
        if(action!=='withdrawArticle'&&state.articleDirty)return reject(fail('SAVE_FIRST'));
        if(action!=='withdrawArticle'&&!eligible(p,now()))return reject(fail('CURRENT_QUALIFICATION_APPROVAL_REQUIRED'));
        if(action==='submitArticle'&&a.state!=='DRAFT')return reject(fail('DRAFT_REQUIRED'));
        if(action==='publishArticle'&&(a.state!=='APPROVED'||a.approvedQualificationRevision!==p.contentRevision||a.currentQualificationRevision!==p.contentRevision))return reject(fail('CURRENT_CONTENT_AND_QUALIFICATION_APPROVAL_REQUIRED'));
        method='POST';path=BASE+'/publications/'+a.id+'/'+({submitArticle:'submit',publishArticle:'publish',withdrawArticle:'withdraw'})[action];body={expectedVersion:a.version};
      } else return reject(fail('INVALID_COMMAND'));
      const key=options.keyFactory?options.keyFactory():('synthetic_'+now().toString(36)+'_'+(++serial).toString(36).padStart(8,'0'));
      if(!/^[A-Za-z0-9_-]{16,80}$/.test(key))return reject(fail('INVALID_KEY'));
      pending={kind,action,request:{method,path,body:clone(body),headers:{'Idempotency-Key':key},owner}};
      return execute();
    }
    async function execute() {
      if(!pending||state.busy||!active())return false;
      const saved=clone(pending),gen=++generation,who=owner;state.busy=true;state.error='';state.notice='';emit();
      try {
        const result=await adapter.request(clone(saved.request));
        if(gen!==generation||owner!==who)return false;
        if(!result||!['APPLIED','PREVIOUSLY_APPLIED'].includes(result.outcome)||typeof result.replayed!=='boolean'||!safeVersion(result.committedVersion)||result.committedVersion>result.current?.version)throw fail('BAD_RESPONSE');
        // Never restore an old successful state from committedVersion or an outcome string.
        apply(saved.kind,result.current);pending=null;
        state.notice=result.replayed?'原请求已处理；已展示当前记录，状态可能已变化。':'合成演练请求已处理；尚未写入真实服务。';
        return true;
      }catch(e){
        if(gen!==generation||owner!==who)return false;
        state.error=errorText(e);
        if(e.status>=400&&e.status<500){pending=null;state.conflict=e.status===409;if(e.status===401||e.status===403){const open=state.open;reset();state.open=open;state.error=errorText(e);state.ready=false;}}
        return false;
      }finally{if(gen===generation&&owner===who){state.busy=false;emit();}}
    }
    reset();
    return {snapshot,refresh,command,retry:execute,session:()=>session,
      open(){state.open=true;emit();},
      close(){++generation;++session;reset();state.notice='已关闭本地表单。关闭不会撤销已发出的请求；重新打开后须刷新核对。';emit();},
      switchOwner(next){++generation;++session;owner=next;reset();emit();},
      connectSynthetic(nextAdapter,nextOwner){++generation;++session;if(!nextAdapter||nextAdapter.mode!=='synthetic')throw fail('SYNTHETIC_ONLY');adapter=nextAdapter;owner=nextOwner;reset();state.open=true;emit();},
      edit(kind,key,value){if(!snapshot().canEdit)return false;const fields=kind==='profile'?PROFILE:ARTICLE;if(!fields.some(([k])=>k===key))return false;state[kind+'Draft'][key]=String(value);state[kind+'Dirty']=true;delete state.errors[key];return true;},
      select(id){if(state.busy||pending)return false;const a=id?state.articles.find(a=>a.id===id):null;if(id&&!a)return false;state.selected=clone(a);state.articleDraft=fieldValues(ARTICLE,a);state.articleDirty=false;state.errors={};emit();return true;},
      tick(){emit();}
    };
  }
  return {BASE,PROFILE,ARTICLE,QUAL,PUB,normalize,eligible,profileLabel,articleLabel,controller,fail,clone};
});
/* SOURCE-END registration-vendor/nutritionistPlatform.js */
};
factories["registration-vendor/nutritionistSynthetic.js"]=function(module,exports,require){
/* SOURCE-BEGIN registration-vendor/nutritionistSynthetic.js */
'use strict';
(function(root,factory){
if(typeof module==='object'&&module.exports)module.exports=factory(require('./nutritionistPlatform.js'));
else root.NutriPlatformSynthetic=factory(root.NutriPlatform);
})(typeof globalThis!=='undefined'?globalThis:this,function(M){
const profileInput={displayName:'合成演练作者',biography:'仅用于表单合成测试',practiceScope:'一般饮食教育演练',credentialType:'合成类型',credentialIssuer:'合成核验机构',credentialJurisdiction:'合成地区',credentialClaimRef:'SYNTHETIC-ONLY-001'};
const articleInput={title:'合成文章标题',bodyText:'此内容仅用于离线表单演练，不构成健康建议。',sourceUrl:'https://example.invalid/synthetic-source',sourceTitle:'合成来源，不会访问',sourceDate:'2026-01-01',applicability:'仅限界面演练',limitations:'无临床用途，未经过真实审核'};
function create(options={}){
const now=options.now||Date.now,owners=new Map(),calls=[];let serial=0,nextFailure=null;
const get=owner=>{if(!owner)throw M.fail('LOGIN_REQUIRED',401);if(!owners.has(owner))owners.set(owner,{profile:null,articles:[],receipts:new Map()});return owners.get(owner);};
const viewP=p=>{const v=M.clone(p);if(v&&v.state==='APPROVED'&&Date.parse(v.validUntil)<=now())v.effectiveStatus='EXPIRED_OR_UNAVAILABLE';return v;};
const viewA=(p,a)=>({...M.clone(a),currentQualificationRevision:p.contentRevision,currentQualificationSnapshotId:p.state==='APPROVED'?'synthetic-snapshot-'+p.contentRevision:null,publiclyVisible:a.state==='PUBLISHED'&&M.eligible(viewP(p),now())&&a.approvedQualificationRevision===p.contentRevision});
function perform(r){
const store=get(r.owner),p=store.profile;const relative=r.path.replace(M.BASE,'');
if(r.method==='GET'){
if(!p)throw M.fail('APPLICATION_NOT_FOUND',404);
if(relative==='/me')return viewP(p);
if(relative.startsWith('/publications?')){const page=Number(relative.match(/page=(\d+)/)?.[1]||0);return {items:store.articles.slice(page*20,page*20+20).map(a=>viewA(p,a)),page,size:20,total:store.articles.length};}
throw M.fail('NOT_FOUND',404);
}
const key=r.headers&&r.headers['Idempotency-Key'];if(!/^[A-Za-z0-9_-]{16,80}$/.test(key||''))throw M.fail('IDEMPOTENCY_KEY_REQUIRED',400);
const signature=JSON.stringify([r.method,r.path,r.body]),prior=store.receipts.get(key);
if(prior){if(prior.signature!==signature)throw M.fail('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND',409);const current=prior.kind==='profile'?viewP(store.profile):viewA(store.profile,store.articles.find(a=>a.id===prior.id));return {outcome:'PREVIOUSLY_APPLIED',replayed:true,committedVersion:prior.version,current};}
let kind,current;
const checkVersion=version=>{if(r.body.expectedVersion!==version)throw M.fail('STALE_VERSION',409);};
if(relative==='/me'&&r.method==='PUT'){
checkVersion(p?p.version:0);const checked=M.normalize(M.PROFILE,r.body,now());if(Object.keys(checked.errors).length)throw M.fail('INVALID_REQUEST',400);
current={...(p||{applicationId:'synthetic-profile-'+(++serial),version:-1,contentRevision:0}),...checked.value,state:'DRAFT',effectiveStatus:'DRAFT',approvedAt:null,validUntil:null,verificationMethod:null,decisionReason:null,materialUploadAvailable:false};
current.version++;current.contentRevision++;store.profile=current;kind='profile';
}else if(relative.startsWith('/me/')&&r.method==='POST'){
if(!p)throw M.fail('APPLICATION_NOT_FOUND',404);checkVersion(p.version);current=p;kind='profile';
if(relative==='/me/submit'){if(p.state!=='DRAFT')throw M.fail('DRAFT_REQUIRED',409);p.state='SUBMITTED';}
else if(relative==='/me/withdraw'){if(['WITHDRAWN','REVOKED'].includes(p.state))throw M.fail('ALREADY_INACTIVE',409);p.state='WITHDRAWN';p.decisionReason='USER_REQUEST';}
else throw M.fail('NOT_FOUND',404);p.effectiveStatus=p.state;p.version++;
}else if(relative.startsWith('/publications')){
if(!p)throw M.fail('APPLICATION_NOT_FOUND',404);kind='article';const parts=relative.split('/'),id=parts[2],verb=parts[3];let a=id?store.articles.find(a=>a.id===id):null;
if(id&&!a)throw M.fail('PUBLICATION_NOT_FOUND',404);checkVersion(a?a.version:0);
if((!id&&r.method==='POST')||(id&&!verb&&r.method==='PUT')){
const checked=M.normalize(M.ARTICLE,r.body,now());if(Object.keys(checked.errors).length)throw M.fail('INVALID_REQUEST',400);
current={...(a||{id:'synthetic-article-'+(++serial),version:-1,contentRevision:0}),...checked.value,state:'DRAFT',approvedQualificationRevision:null,decisionReason:null,publishedAt:null,publiclyVisible:false};current.version++;current.contentRevision++;
if(a)store.articles[store.articles.indexOf(a)]=current;else store.articles.unshift(current);
}else if(r.method==='POST'&&a){
if(verb!=='withdraw'&&!M.eligible(viewP(p),now()))throw M.fail('CURRENT_QUALIFICATION_APPROVAL_REQUIRED',403);
if(verb==='submit'){if(a.state!=='DRAFT')throw M.fail('DRAFT_REQUIRED',409);a.state='SUBMITTED';}
else if(verb==='publish'){if(a.state!=='APPROVED'||a.approvedQualificationRevision!==p.contentRevision)throw M.fail('CURRENT_CONTENT_AND_QUALIFICATION_APPROVAL_REQUIRED',409);a.state='PUBLISHED';a.publishedAt=new Date(now()).toISOString();}
else if(verb==='withdraw'){if(a.state==='WITHDRAWN')throw M.fail('ALREADY_WITHDRAWN',409);a.state='WITHDRAWN';a.decisionReason='USER_REQUEST';}
else throw M.fail('NOT_FOUND',404);a.version++;current=a;
}else throw M.fail('NOT_FOUND',404);
}else throw M.fail('NOT_FOUND',404);
store.receipts.set(key,{signature,kind,id:kind==='profile'?current.applicationId:current.id,version:current.version});
return {outcome:'APPLIED',replayed:false,committedVersion:current.version,current:kind==='profile'?viewP(current):viewA(store.profile,current)};
}
return {mode:'synthetic',calls,
async request(request){calls.push(M.clone(request));const failure=nextFailure;nextFailure=null;if(failure&&!failure.afterCommit)throw failure.error;const result=perform(M.clone(request));if(failure)throw failure.error;return M.clone(result);},
failNext(error=M.fail('SYNTHETIC_TIMEOUT'),afterCommit=false){nextFailure={error,afterCommit};},
fixture(owner,scenario,reason){const s=get(owner),p=s.profile;if(!p)throw M.fail('NO_PROFILE');
if(['approved','rejected','expired','revoked'].includes(scenario)){
p.version++;p.state=scenario==='rejected'?'REJECTED':scenario==='revoked'?'REVOKED':'APPROVED';p.effectiveStatus=p.state;p.verificationMethod='MANUAL_EXTERNAL';p.approvedAt=new Date(now()-1000).toISOString();p.validUntil=new Date(now()+(scenario==='expired'?-1:86400000)).toISOString();p.decisionReason=scenario==='rejected'?'EVIDENCE_INSUFFICIENT':null;
}else if(['articleApproved','articleRejected'].includes(scenario)){
const a=s.articles.find(a=>a.state==='SUBMITTED');if(!a)throw M.fail('SUBMITTED_PUBLICATION_REQUIRED',409);if(scenario==='articleRejected'&&!['SOURCE_INSUFFICIENT','SCOPE_UNCLEAR','LIMITATIONS_INSUFFICIENT'].includes(reason))throw M.fail('ARTICLE_REASON_REQUIRED');a.state=scenario==='articleRejected'?'REJECTED':'APPROVED';a.version++;a.decisionReason=scenario==='articleRejected'?reason:null;a.approvedQualificationRevision=scenario==='articleRejected'?null:p.contentRevision;
}else throw M.fail('UNKNOWN_FIXTURE');
},inspect(owner){const s=get(owner);return {profile:viewP(s.profile),articles:s.profile?s.articles.map(a=>viewA(s.profile,a)):[]};}
};
}
return {create,profileInput,articleInput};
});
/* SOURCE-END registration-vendor/nutritionistSynthetic.js */
};
factories["practitioner-forms.js"]=function(module,exports,require){
/* SOURCE-BEGIN practitioner-forms.js */
'use strict';
const M=require('./registration-vendor/nutritionistPlatform');
const S=require('./registration-schema');
const OWNER_LABELS=Object.freeze({'fictional-lin':'林小禾 · 虚构角色','fictional-zhou':'周青 · 虚构角色'});
const reasons={SOURCE_INSUFFICIENT:'来源资料不足',SCOPE_UNCLEAR:'适用范围不清',LIMITATIONS_INSUFFICIENT:'限制说明不足'};
const labels={DRAFT:'合成草稿',SUBMITTED:'合成待审核',APPROVED:'合成审核通过',REJECTED:'合成审核未通过',WITHDRAWN:'合成已撤回',REVOKED:'合成资格已撤销',PUBLISHED:'本机合成已发布'};
const fields=kind=>kind==='profile'?M.PROFILE:kind==='article'?M.ARTICLE:[];
const fail=code=>{throw S.fail(code,400);};
function decorate(data,now){
const d=S.clone(data);
function owner(r){
if(!r)return null;
r.ownerLabel=OWNER_LABELS[r.owner];r.profileFields=r.profile?M.PROFILE.map(([key,label])=>({key,label,value:r.profile[key]})):[];r.eligible=M.eligible(r.profile,now);
r.profileLabel=r.profile?(r.profile.state==='APPROVED'&&!r.eligible?'合成资格已过期或不可用':labels[r.profile.state]||'未核对'): '尚无合成登记';
r.canSubmitProfile=!!r.profile&&r.profile.state==='DRAFT';
r.canWithdrawProfile=!!r.profile&&!['WITHDRAWN','REVOKED'].includes(r.profile.state);
r.canApproveProfile=!!r.profile&&r.profile.state==='SUBMITTED';
r.canRevokeProfile=!!r.profile&&r.profile.state==='APPROVED';
const submitted=r.articles.some(a=>a.state==='SUBMITTED');
r.articles=r.articles.map(a=>({...a,reasonLabel:reasons[a.decisionReason]||'',fields:M.ARTICLE.map(([key,label])=>({key,label,value:a[key]})),statusLabel:a.state==='PUBLISHED'&&!a.publiclyVisible?'曾在本机合成发布，当前不可见':labels[a.state]||'未核对',canSubmit:a.state==='DRAFT'&&r.eligible&&!submitted,canPublish:a.state==='APPROVED'&&a.approvalCurrent===true&&r.eligible,canWithdraw:a.state!=='WITHDRAWN',canApprove:a.state==='SUBMITTED'&&r.eligible}));
return r;
}
d.registration=owner(d.registration);d.reviewQueue=d.reviewQueue.map(owner);
return d;
}
function open(data,context,kind,id,serial){
const r=data.registration;if(!r||data.identity.role!=='practitioner')fail('REGISTRATION_AUTHOR_REQUIRED');
if(!['profile','article'].includes(kind))fail('REGISTRATION_FORM_KIND');
if(kind==='article'&&!r.profile)fail('NO_PROFILE');
const record=kind==='profile'?r.profile:(id?r.articles.find(a=>a.id===id):null);
if(kind==='article'&&id&&!record)fail('REGISTRATION_TARGET_CHANGED');
return {serial,kind,recordId:record?(kind==='profile'?record.applicationId:record.id):null,owner:r.owner,epoch:r.epoch,expectedVersion:record?record.version:0,context:S.clone(context),values:Object.fromEntries(fields(kind).map(([key])=>[key,record&&record[key]||''])),dirty:false,ack:false,errors:{}};
}
function present(f){return f?{kind:f.kind,recordId:f.recordId,dirty:f.dirty,ack:f.ack,title:f.kind==='profile'?'虚构登记资料':'合成文章纯文本',fields:fields(f.kind).map(([key,label,max])=>({key,label:label+'（合成）',max,value:f.values[key],error:f.errors[key]||'',multiline:['biography','bodyText','applicability','limitations'].includes(key)}))}:null;}
function sample(f){return f.kind==='profile'?{displayName:OWNER_LABELS[f.owner],biography:'仅用于合成表单演练，非真实人物资料',practiceScope:'合成一般饮食教育',credentialType:'虚构资质类型',credentialIssuer:'虚构演示机构',credentialJurisdiction:'合成地区',credentialClaimRef:'SYNTHETIC-ONLY-'+f.owner}:{title:'本机合成文章示例',bodyText:'仅用于合成发布流程演练，不构成健康建议。',sourceUrl:'https://example.invalid/synthetic-source',sourceTitle:'虚构来源，未访问或核实',sourceDate:'2026-01-01',applicability:'仅限界面演练',limitations:'无临床用途；未经过真实专业审核'};}
function save(f,now){
const checked=M.normalize(fields(f.kind),f.values,now);
if(f.kind==='profile'&&!/^SYNTHETIC-[A-Za-z0-9._:-]+$/.test(checked.value.credentialClaimRef))checked.errors.credentialClaimRef='必须使用 SYNTHETIC- 开头的虚构引用，不填写真实证件号码';
if(Object.keys(checked.errors).length)return {errors:checked.errors};
if(!f.ack)return {errors:{},error:'请明确确认所有内容均为虚构合成资料'};
return {input:{method:f.kind==='profile'||f.recordId?'PUT':'POST',path:f.kind==='profile'?M.BASE+'/me':M.BASE+'/publications'+(f.recordId?'/'+f.recordId:''),body:{expectedVersion:f.expectedVersion,...checked.value},epoch:f.epoch}};
}
function request(data,action,id){
const r=data.registration;if(!r||data.identity.role!=='practitioner')fail('REGISTRATION_AUTHOR_REQUIRED');
if(action==='submitProfile'||action==='withdrawProfile'){
if(!(action==='submitProfile'?r.canSubmitProfile:r.canWithdrawProfile))fail('REGISTRATION_ACTION_UNAVAILABLE');
return {method:'POST',path:M.BASE+'/me/'+(action==='submitProfile'?'submit':'withdraw'),body:{expectedVersion:r.profile.version},epoch:r.epoch};
}
const a=r.articles.find(a=>a.id===id),map={submitArticle:['canSubmit','submit'],publishArticle:['canPublish','publish'],withdrawArticle:['canWithdraw','withdraw']},rule=map[action];
if(!a||!rule||!a[rule[0]])fail('REGISTRATION_ACTION_UNAVAILABLE');
return {method:'POST',path:M.BASE+'/publications/'+a.id+'/'+rule[1],body:{expectedVersion:a.version},epoch:r.epoch};
}
function review(data,owner,scenario,id,reason){
if(data.identity.role!=='reviewer')fail('REGISTRATION_REVIEWER_REQUIRED');
const r=data.reviewQueue.find(r=>r.owner===owner);if(!r)fail('REGISTRATION_TARGET_CHANGED');
const article=['articleApproved','articleRejected'].includes(scenario),target=article?r.articles.find(a=>a.id===id):r.profile;
if(!target||(article?!target.canApprove:scenario==='revoked'?!r.canRevokeProfile:!['approved','rejected'].includes(scenario)||!r.canApproveProfile))fail('REGISTRATION_ACTION_UNAVAILABLE');
if(scenario==='articleRejected'&&!Object.hasOwn(reasons,reason))fail('ARTICLE_REASON_REQUIRED');
return {...(scenario==='articleRejected'?{reason}:{}),owner,scenario,id:article?target.id:target.applicationId,expectedVersion:target.version,contentRevision:target.contentRevision,epoch:r.epoch,...(article?{profileVersion:r.profile.version,profileContentRevision:r.profile.contentRevision}:{})};
}
module.exports={reasons,OWNER_LABELS,decorate,open,present,sample,save,request,review};
/* SOURCE-END practitioner-forms.js */
};

function resolve(from,id){if(typeof id!=='string'||!id.startsWith('./'))throw Error('KERNEL_IMPORT_DENIED');const parts=from.split('/');parts.pop();for(const part of id.slice(2).split('/')){if(!part||part==='.'||part==='..')throw Error('KERNEL_IMPORT_DENIED');parts.push(part);}const resolved=parts.join('/'),key=resolved.endsWith('.js')?resolved:resolved+'.js';if(!Object.prototype.hasOwnProperty.call(factories,key))throw Error('KERNEL_IMPORT_DENIED');return key;}
function load(key){if(cache[key])return cache[key].exports;if(!Object.prototype.hasOwnProperty.call(factories,key))throw Error('KERNEL_IMPORT_DENIED');const m={exports:{}};cache[key]=m;factories[key](m,m.exports,id=>load(resolve(key,id)));return m.exports;}
const bridge=load('registration-bridge.js'),schema=load('registration-schema.js'),forms=load('practitioner-forms.js');
return Object.freeze({buildId:'registration-kernel-service-v2',capability:'service-plan-schema4-migration-v1',sourceHashes:Object.freeze({"registration-bridge.js":"87b0b16666dddb5a37a8842e838d74a57ecd310d87742394669be2f05cdb9830","registration-schema.js":"1de7ee55b71450623f63c1ddad713eeb1627522f2a838b2dba0fcbff80a62ca6","practitioner-model.js":"1d915e01f331c82ab095f3a27e8fc191c05f7037bd93e9f67816d7c659c0a9da","registration-vendor/nutritionistPlatform.js":"189e7f969901a160db5f3d4d31101039aa99d56642899dec762acd6451064875","registration-vendor/nutritionistSynthetic.js":"18cbd091739aff0ae99bf63d093ab7c0c43afdebc394979e02a9a7cdb8aab1af","practitioner-forms.js":"39d83ceb3118895048631f1b297c9bef60e0365c31961d309032dadfada091a2"}),createBridge:bridge.create,seed:bridge.seed,forms:Object.freeze(forms),contract:Object.freeze({PERSONAS:schema.PERSONAS,OWNERS:schema.OWNERS,MAX_EVENTS:schema.MAX_EVENTS,MAX_UNITS:schema.MAX_UNITS,json:schema.json,clone:schema.clone,stable:schema.stable,fail:schema.fail,integer:schema.integer,time:schema.time,key:schema.key,intent:schema.intent,validateJournal:schema.validate,validateDomain:bridge.validateDomain,validateSeed:bridge.validateSeed})});
});
