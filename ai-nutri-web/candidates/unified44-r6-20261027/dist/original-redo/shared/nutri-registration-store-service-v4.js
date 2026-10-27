/* Unmounted schema3/4 Account compatibility. Actual service-preserving Kernel and gated Core; Private synthetic-session service-plan commands; no singleton, UI wiring or automatic adoption. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(require('./nutri-registration-kernel-service-v2.js'),require('./nutri-demo-core-service-v4.js'),require('./nutri-service-plan-contract-v1.js'));else root.NutriRegistrationStoreServiceV4=factory(root.NutriRegistrationKernelServiceV2,root.NutriDemoCoreServiceV4,root.NutriServicePlanContractV1);})(typeof globalThis==='object'?globalThis:this,function(K,Core,Service){
'use strict';
const CAPABILITY='service-plan-schema4-migration-v1';
if(!K||K.buildId!=='registration-kernel-service-v2'||K.capability!==CAPABILITY||Service?.buildId!=='service-plan-pure-v1')throw Error('REGISTRATION_KERNEL_REQUIRED');
const S=K.contract,KEY='nutri:synthetic:v3:demo-shen',CTX=['mode','accountId','protocolVersion','epoch','generation','revision'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),clone=S.clone,stable=S.stable,fail=S.fail;
function data(value,seen=new Set(),depth=0){
 if(depth>40)throw fail('WEB_INVALID_JSON');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(!value||typeof value!=='object'||seen.has(value)||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype))throw fail('WEB_INVALID_JSON');
 if(Array.isArray(value)&&(Object.keys(value).length!==value.length||Array.from({length:value.length},(_,i)=>i).some(i=>!own(value,i))))throw fail('WEB_INVALID_JSON');
 seen.add(value);for(const key of Object.keys(value)){if(['__proto__','prototype','constructor'].includes(key))throw fail('WEB_UNSAFE_KEY');const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!own(descriptor,'value'))throw fail('WEB_INVALID_JSON');data(descriptor.value,seen,depth+1);}seen.delete(value);
}
function context(value){S.json(value);if(!value||Object.keys(value).length!==CTX.length||CTX.some(k=>!own(value,k)))throw fail('WEB_INVALID_CONTEXT');if(value.mode!=='synthetic'||value.accountId!=='demo-shen'||value.protocolVersion!==3||typeof value.epoch!=='string'||!value.epoch||value.epoch.length>160)throw fail('WEB_IDENTITY_BOUNDARY');S.integer(value.generation);S.integer(value.revision);return clone(value);}
function fromState(s){data(s);if(!s||!s.meta||![3,4].includes(s.meta.schemaVersion)||s.meta.isSynthetic!==true||!s.profile||s.profile.id!=='demo-shen'||s.profile.name!=='沈先生'||s.profile.invitationCode!=='DEMO-SHEN'||s.profile.isSynthetic!==true||!['health','commerce','practitioner'].every(k=>own(s,k))||!s.practitioner)throw fail('WEB_IDENTITY_BOUNDARY');if(JSON.stringify(s).length>2000000)throw fail('STATE_TOO_LARGE');if(s.meta.schemaVersion===4){Service.validate(s.practitioner.servicePlans);Service.validate(s.meta.seedSnapshots.practitioner.servicePlans);}else if(own(s.practitioner,'servicePlans')||own(s.meta.seedSnapshots.practitioner,'servicePlans'))throw fail('SERVICE_IN_SCHEMA3');return context(Object.fromEntries(CTX.map(k=>[k,s.meta[k]])));}
function equalContext(a,b,revision=true){return CTX.every(k=>(!revision&&k==='revision')||a[k]===b[k]);}
function nativeIntent(c){return S.intent({mode:c.mode,accountId:c.accountId,generation:c.generation,revision:c.revision});}
function immutableRest(s){const c=clone(s);delete c.practitioner;delete c.meta.revision;delete c.meta.updatedAt;return stable(c);}

// Called only after the actual Kernel replay succeeds. These are fictional
// local registration states, not professional verification or real identities.
function serviceQualifications(root){
 return S.OWNERS.map(owner=>{
  const item=root.practitioner.registration?.projection?.[owner],profile=item?.profile;
  if(!profile)return {owner,revision:0,status:'DRAFT',expiresAt:null};
  const revision=S.integer(item.relationshipRevision),state=profile.state;
  if(!['DRAFT','SUBMITTED','APPROVED','REJECTED','WITHDRAWN','REVOKED'].includes(state))throw fail('SERVICE_QUALIFICATION_STATE');
  // The pure qualification contract has no WITHDRAWN variant. Map only its
  // eligibility input to non-approved DRAFT; keep real registration WITHDRAWN
  // and the incremented relationship revision unchanged in root and view.
  const status=state==='SUBMITTED'?'PENDING':state==='WITHDRAWN'?'DRAFT':state;
  return {owner,revision,status,expiresAt:state==='APPROVED'?S.time(Date.parse(profile.validUntil)):null};
 });
}
function serviceView(root,persona,qualifications,at){
 if(root.meta.schemaVersion!==4)return {available:false,syntheticOnly:true,bookingConnected:false,owned:[],reviewQueue:[],publicPlans:[]};
 const namespace=Service.validate(root.practitioner.servicePlans);
 const row=p=>({...Service.codec.copy(p),effective:Service.effective(p,qualifications.find(q=>q.owner===p.owner),at)});
 // Neither cross-author drafts nor the receipt/request ledger leave this view.
 return {available:true,syntheticOnly:true,bookingConnected:false,
  owned:S.OWNERS.includes(persona)?namespace.plans.filter(p=>p.owner===persona).map(row):[],
  reviewQueue:persona==='synthetic-reviewer'?namespace.plans.filter(p=>p.state==='SUBMITTED').map(row):[],
  publicPlans:namespace.plans.filter(p=>Service.effective(p,qualifications.find(q=>q.owner===p.owner),at).approved).map(row)};
}
function create(options){
 options=options||{};const store=options.store,now=options.now||Date.now,current=options.current||(()=>true);
 let active=true,observed=null,lastTime=0;const sessions=new Map();
 function storeCheck(){if(!store||typeof store.read!=='function'||typeof store.transact!=='function'||typeof store.status!=='function')throw fail('V3_STORE_REQUIRED');const status=store.status();if(store.protocolVersion!==3||status.protocolVersion!==3||status.key!==KEY||status.mode!=='synthetic'||status.isSynthetic!==true||status.capabilities?.coordinatedTransactions!==true||status.capability!==CAPABILITY||status.capabilities?.servicePlanSchema4!==true||status.capabilities?.ordinaryWriteGate!==true)throw fail('V3_STORE_REQUIRED');}
 function lifecycle(){if(!active)throw fail('WEB_ADAPTER_CLOSED');const allowed=current();if(allowed&&typeof allowed.then==='function')throw fail('WEB_ASYNC_GUARD_DENIED');if(allowed!==true)throw fail('WEB_CONTEXT_CHANGED');storeCheck();}
 function read(){lifecycle();const value=store.read();fromState(value);return clone(value);}
 function actor(session){lifecycle();const a=sessions.get(session);if(!a)throw fail('WEB_SESSION_CHANGED');const root=read();if(!equalContext(a.context,fromState(root),false))throw fail('WEB_SESSION_CHANGED');return a;}
 function clock(){const t=S.time(now());if(t<lastTime)throw fail('REGISTRATION_CLOCK_ROLLBACK');lastTime=t;return t;}
 function fresh(base,session){actor(session);const root=read(),a=fromState(base),b=fromState(root);if(!equalContext(a,b))throw fail('STALE_REVISION');if(stable(root)!==stable(base))throw fail('WEB_ROOT_CHANGED_WITHOUT_REVISION');return root;}
 function observation(base,session,record){
  fresh(base,session);const c=fromState(base),present=own(base.practitioner,'registration'),journal=present?base.practitioner.registration:null;
  if(observed&&equalContext(observed.context,c,false)){
   if(c.revision<observed.context.revision)throw fail('STALE_REVISION');
   if(observed.present&&!present)throw fail('REGISTRATION_JOURNAL_REMOVED');
   if(observed.present){const events=journal&&journal.events;if(!Array.isArray(events)||events.length<observed.events.length||observed.events.some((e,i)=>stable(e)!==stable(events[i])))throw fail('REGISTRATION_JOURNAL_ROLLBACK');}
  }
  if(record)observed={context:c,present,events:present?clone(journal.events):[]};
 }
 function guard(session,baseContext){try{return !!actor(session)&&equalContext(fromState(read()),baseContext,false);}catch(_){return false;}}
 async function operate(session,kind,rawInput,key,rawIntent){
  let phase='prepare',attempted=false,confirmed=null,prepared=null,planEvidence=null;
  try{
   const who=actor(session),base=read(),baseContext=fromState(base),at=clock();
   let business=null,input=null;
   if(kind!=='snapshot'){
    if(kind==='planCommand'){input=Service.codec.copy(rawInput);Service.codec.exact(input,['action','planId','expectedVersion','content'],'PLAN_COMMAND_FIELDS');}else{S.json(rawInput);input=clone(rawInput);}
    S.key(key);business=context(rawIntent);
    if(kind==='planCommand'&&base.meta.schemaVersion!==4)throw fail('SERVICE_SCHEMA4_REQUIRED');
    if(!equalContext(business,baseContext,false))throw fail('WEB_STALE_BUSINESS_CONTEXT');
    if(business.revision>baseContext.revision)throw fail('WEB_FUTURE_BUSINESS_INTENT');
   }
   observation(base,session,false);
   let staged=clone(base),writes=0;
   const shadow={read:()=>clone(staged),status:()=>({protocolVersion:1}),context:()=>nativeIntent(fromState(staged)),current:t=>guard(session,baseContext)&&t&&t.mode==='synthetic'&&t.accountId==='demo-shen'&&t.generation===staged.meta.generation,
    update(fn,opts={}){if(!guard(session,baseContext))throw fail('WEB_SESSION_CHANGED');if(opts.expectedRevision!==staged.meta.revision)throw fail('SHADOW_REVISION');const draft=clone(staged),result=fn(draft);if(result&&typeof result.then==='function')throw fail('SHADOW_ASYNC');data(draft);if(stable(draft.meta)!==stable(staged.meta)||immutableRest(draft)!==immutableRest(staged))throw fail('SHADOW_DOMAIN_ESCAPE');if(++writes>1)throw fail('SHADOW_MULTIPLE_COMMITS');if(!Number.isSafeInteger(draft.meta.revision+1))throw fail('WEB_REVISION_OVERFLOW');draft.meta.revision++;staged=draft;return clone(staged);}};
   let output;const bridge=K.createBridge({core:shadow,current:()=>guard(session,baseContext),now:()=>at});
   try{const temporary=bridge.login(who.persona);output=kind==='snapshot'||kind==='planCommand'?await bridge.snapshot(temporary):await bridge[kind](temporary,input,key,nativeIntent(business));}finally{bridge.dispose();}
   // The actual Kernel has now replayed and verified registration history,
   // including expiry maintenance, into staged. Never use directory seed approval
   // or a caller-supplied qualification/actor as registration authority.
   const qualifications=serviceQualifications(staged);
   if(kind==='planCommand'){
    const request={key,context:Service.codec.copy(business),...input};
    const transition=Service.transition(staged.practitioner.servicePlans,request,{actor:who.persona,context:Service.codec.copy(baseContext),now:at,qualifications});
    staged.practitioner.servicePlans=transition.namespace;
    const anyChange=stable(staged.practitioner)!==stable(base.practitioner);
    if(anyChange&&!Number.isSafeInteger(baseContext.revision+1))throw fail('WEB_REVISION_OVERFLOW');
    // Maintenance and plan mutation are one atomic outer transaction, not two
    // commits or two revision increments. A replay may still maintain expiry.
    staged.meta.revision=baseContext.revision+(anyChange?1:0);
    output.context.revision=staged.meta.revision;output.view.context.revision=staged.meta.revision;
    output.replayed=transition.replayed;output.planChanged=transition.changed;
    output.planResult=Service.codec.copy(transition.result);
    planEvidence={key,result:Service.codec.copy(transition.result)};
   }
   output.view.servicePlans=serviceView(staged,who.persona,qualifications,at);
   fresh(base,session);observation(base,session,true);
   if(business&&business.revision!==baseContext.revision&&output.replayed!==true)throw fail('STALE_REVISION');
   const candidate=clone(staged.practitioner),changed=stable(candidate)!==stable(base.practitioner);
   if(staged.meta.revision!==baseContext.revision+(changed?1:0))throw fail('SHADOW_RESULT_MISMATCH');
   S.validateJournal(candidate.registration);
   // Capture deadlines that the candidate considered valid at preparation time; never filter them at commit time.
   const deadlines=candidate.profiles.filter(p=>p.status==='SYNTHETIC_APPROVED'&&p.validUntil>at).map(p=>S.time(p.validUntil));
   function finalCheck(draft){actor(session);const c=fromState(draft);if(!equalContext(c,baseContext)||stable(draft)!==stable(base))throw fail('STALE_REVISION');const end=clock();if(end<at||deadlines.some(t=>end>=t))throw fail('REGISTRATION_EXPIRED_DURING_OPERATION');}
   clock();phase='commit';prepared={base:clone(base),candidate:clone(candidate),changed};
   const receipt=await store.transact((draft,tx)=>{
    finalCheck(draft);
    if(!changed){if(!tx||typeof tx.noop!=='function')throw fail('V3_NOOP_REQUIRED');return tx.noop(null);}
    draft.practitioner=clone(candidate);attempted=true;return null;
   },{context:clone(baseContext),expectedRevision:baseContext.revision,guard:()=>guard(session,baseContext),reason:'registration:'+kind});
   if(!receipt||typeof receipt.committed!=='boolean'||receipt.committed!==changed||!receipt.state)throw fail('WEB_COMMIT_UNVERIFIED');
   const saved=receipt.state,savedContext=fromState(saved);
   if(!equalContext(savedContext,baseContext,false)||savedContext.revision!==baseContext.revision+(changed?1:0)||immutableRest(saved)!==immutableRest(base)||stable(saved.practitioner)!==stable(candidate))throw fail('WEB_COMMIT_UNVERIFIED');
   confirmed={committed:changed,context:clone(savedContext)};phase='render';
   observation(saved,session,true);const end=clock();if(deadlines.some(t=>end>=t))throw fail('REGISTRATION_VIEW_EXPIRED');
   // The engine's result was produced from exactly the candidate committed above, at the same resulting revision.
   if(output.context.revision!==savedContext.revision||output.context.generation!==savedContext.generation)throw fail('WEB_RESULT_CONTEXT_MISMATCH');
   const result=clone(output);result.context=clone(savedContext);result.view.context=clone(savedContext);
   result.committed=changed;result.persistent=receipt.persistent===true;result.viewExpiresAt=deadlines.length?Math.min(...deadlines):null;
   if(planEvidence)result.planOutcome='committed';
   return result;
  }catch(error){
   // Only this genuine core's readback proof may classify an error as committed; error flags are not authority.
   if(!confirmed&&phase==='commit'&&attempted&&prepared&&prepared.changed&&Core&&typeof Core.commitReceipt==='function'){
    try{const proof=Core.commitReceipt(store,error);if(proof&&proof.committed===true&&proof.state){const saved=proof.state,c=fromState(saved),b=fromState(prepared.base);if(equalContext(c,b,false)&&c.revision===b.revision+1&&immutableRest(saved)===immutableRest(prepared.base)&&stable(saved.practitioner)===stable(prepared.candidate))confirmed={committed:true,context:c};}}catch(_){}
   }
   // Normalize rather than deleting potentially frozen/accessor exception properties.
   const e=fail('WEB_OPERATION_FAILED');for(const k of ['name','message','code','status','unavailable','migrationOutcome','retryAutomatically','inspectionCode']){try{const d=error&&Object.getOwnPropertyDescriptor(Object(error),k);if(d&&own(d,'value')&&['string','number','boolean'].includes(typeof d.value))e[k]=d.value;}catch(_){}}
   if(confirmed){e.outcome=confirmed.committed?'committed':'not-committed';e.committed=confirmed.committed;e.commitContext=clone(confirmed.context);}else e.outcome=e.migrationOutcome==='unknown'||phase==='commit'&&attempted?'unknown':'not-committed';
   if(kind==='planCommand')e.planOutcome=confirmed&&planEvidence?'committed':e.outcome;throw e;
  }
 }
 storeCheck();
 return Object.freeze({protocolVersion:3,contract:'registration-adapter-service-plan-v1',
  login(persona){lifecycle();if(!S.PERSONAS.includes(persona))throw fail('REGISTRATION_PERSONA_DENIED');const token=Object.freeze({});sessions.set(token,{persona,context:fromState(read())});return token;},
  logout(session){sessions.delete(session);},dispose(){active=false;sessions.clear();observed=null;},
  snapshot:session=>operate(session,'snapshot'),
  request:(session,input,key,intent)=>operate(session,'request',input,key,intent),
  review:(session,input,key,intent)=>operate(session,'review',input,key,intent),
  command:(session,input,key,intent)=>operate(session,'command',input,key,intent),
  planCommand:(session,input,key,intent)=>operate(session,'planCommand',input,key,intent)
 });
}
// Batch B account ownership. No default account is created or initialized here.
function createAccount(options){
 const o=options||{};if(!Core||Core.buildId!=='registration-core-service-v4'||Core.capability!==CAPABILITY)throw fail('V3_CORE_REQUIRED');
 if(typeof o.healthSeed!=='function'||typeof o.commerceSeed!=='function')throw fail('CANONICAL_FACTORIES_REQUIRED');
 const seedCheck=K.contract.validateSeed;
 const raw=Core.create({storage:o.storage,locks:o.locks,eventTarget:o.eventTarget,now:o.now,id:o.id,memory:o.memory,sha256:o.sha256,
  factories:{health:o.healthSeed,commerce:o.commerceSeed,practitioner:K.seed},validatePractitionerSeed:seedCheck,validatePractitionerState:K.contract.validateDomain});
 let active=true;const services=new Set();
 const facade=Object.freeze({protocolVersion:3,read:raw.read,context:raw.context,current:raw.current,status:raw.status,
  initialize:raw.initialize,resetAsync:raw.resetAsync,restoreAccountAsync:raw.restoreAccountAsync,listArticleArchives:raw.listArticleArchives,restoreArticleAsync:raw.restoreArticleAsync,
  inspectRecovery:raw.inspectRecovery,recoverAdoptionAsync:raw.recoverAdoptionAsync,subscribe:raw.subscribe,
  update:raw.update,reset:raw.reset,registerDomain:raw.registerDomain,
  defineDomain(name,factory){if(!active)throw fail('STORE_CLOSED');if(!['health','commerce','practitioner'].includes(name)||typeof factory!=='function')throw fail('INVALID_DOMAIN');},
  transact(fn,opts){if(typeof fn!=='function')throw fail('MUTATOR_REQUIRED');return raw.transact((draft,tx)=>{
   const before=clone(draft),result=fn(draft,tx);if(result&&typeof result.then==='function')throw fail('ASYNC_MUTATOR_NOT_ALLOWED');data(draft);
   const rest=value=>{const copy=clone(value);delete copy.health;delete copy.commerce;return copy;};
   if(stable(rest(draft))!==stable(rest(before)))throw fail('PUBLIC_DOMAIN_ESCAPE');return result;
  },opts);}
 });
 function dispose(){if(!active)return;active=false;services.forEach(service=>service.dispose());services.clear();raw.dispose();}
 return Object.freeze({capability:CAPABILITY,store:facade,dispose,createRegistrationService(opts={}){
  if(!active)throw fail('STORE_CLOSED');const current=opts.current||(()=>true);
  const service=create({store:raw,now:o.now,current:()=>active&&current()});services.add(service);return service;
 }});
}
return Object.freeze({create,createAccount,STORAGE_KEY:KEY,buildId:'registration-store-service-v4-plan-v1',accountBuildId:'registration-account-service-v4-plan-v1',adapterRevision:'readback-proof-v2-service-plan-v2',capability:CAPABILITY});
});
