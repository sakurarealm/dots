/* Unmounted synthetic-local coordinator. Explicit storage/locks only; no ambient
   account, network, initialization, UI mounting, or automatic retry. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(
 require('./nutri-registration-store-v1.js'),require('./nutri-service-plan-contract-v1.js'),
 require('./nutri-service-migration-pure-v1.js'),require('./nutri-service-legacy-validator-v1.js'));
else root.NutriServiceMigrationCoordinatorV1=factory(root.NutriRegistrationStore,root.NutriServicePlanContractV1,
 root.NutriServiceMigrationPureV1,root.NutriServiceLegacyValidatorV1);
})(typeof globalThis==='object'?globalThis:this,function(Account,S,Migration,Validator){
'use strict';
const BUILD='service-migration-coordinator-v1',KEY='nutri:synthetic:v3:demo-shen';
const MARKER=KEY+':adopted',CHECKPOINT=KEY+':source-checkpoint',JOURNAL=KEY+':service-migration:v1:journal';
const NEW=[0,1,2].map(i=>KEY+':service-recovery:v1:'+i),OLD=[0,1,2].map(i=>KEY+':article-recovery:'+i);
const KEYS=[KEY,MARKER,CHECKPOINT,JOURNAL,...NEW,...OLD],FORMAT='synthetic-service-migration-journal-v2';
const TERMINAL=['COMMITTED','ABORTED_NOT_COMMITTED','ACKNOWLEDGED_UNKNOWN'];
function error(code){return Object.assign(Error(code),{code});}
if(Account?.buildId!=='registration-store-v1-batch-a'||Account.accountBuildId!=='registration-account-v3-batch-b'||
 Account.adapterRevision!=='readback-proof-v2'||Account.STORAGE_KEY!==KEY||S?.buildId!=='service-plan-pure-v1'||
 typeof S.codec?.serialize!=='function'||Migration?.buildId!=='service-migration-pure-v1'||Validator?.buildId!=='service-legacy-validator-v1')throw error('COORDINATOR_DEPENDENCY_MISMATCH');
const {copy,json,serialize,canonical,exact,integer,id,check}=S.codec,own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function forbidden(){throw error('READ_ONLY_LEGACY_OPERATION');}
function fields(input,allowed,required=allowed){
 check(input&&Object.getPrototypeOf(input)===Object.prototype,'COORDINATOR_OPTIONS');
 const keys=Reflect.ownKeys(input);check(keys.every(k=>typeof k==='string'&&allowed.includes(k))&&required.every(k=>keys.includes(k)),'COORDINATOR_OPTIONS');
 const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(input,k);check(d&&own(d,'value')&&d.enumerable,'COORDINATOR_OPTIONS');out[k]=d.value;}return out;
}
function create(input){
 const opts=fields(input,['storage','locks','sha256']);
 check(opts.storage&&typeof opts.storage.getItem==='function'&&typeof opts.storage.setItem==='function','COORDINATOR_STORAGE_REQUIRED');
 check(opts.locks&&typeof opts.locks.request==='function'&&typeof opts.sha256==='function','COORDINATOR_LOCK_AND_HASH_REQUIRED');
 const storage=opts.storage,get=storage.getItem,set=storage.setItem,locks=opts.locks,requestLock=locks.request,hashFunction=opts.sha256;
 let alive=true;
 function digest(text){let h;try{h=hashFunction(text);}catch(_){throw error('HASH_UNAVAILABLE');}check(typeof h==='string'&&/^[0-9a-f]{64}$/.test(h),'HASH_PROVIDER');return h;}
 // Used only for strict identity/journal shape, never as a root validator.
 const packet=Migration.create({contract:S,sha256:digest,validateLegacy:forbidden});
 function raw(key){let value;try{value=get.call(storage,key);}catch(_){throw error('STORAGE_READ_FAILED');}check(value===null||typeof value==='string','STORAGE_READ_TYPE');return value;}
 function parse(text,max,code){check(typeof text==='string'&&text.length<=max,code);let x;try{x=JSON.parse(text);}catch(_){throw error(code);}json(x);return x;}
 function journal(text){
  if(text===null)return {format:FORMAT,operations:[]};
  const j=parse(text,262144,'JOURNAL_INVALID');exact(j,['format','operations'],'JOURNAL_FIELDS');
  check(j.format===FORMAT,'JOURNAL_VERSION_UNSUPPORTED');check(Array.isArray(j.operations)&&j.operations.length<=16,'JOURNAL_CAPACITY');
  for(const op of j.operations){exact(op,['identity','preparedAt','stage'],'JOURNAL_OPERATION_FIELDS');integer(op.preparedAt);check(op.preparedAt<=8640000000000000,'PREPARED_TIME_INVALID');check(['adopt','downgrade'].includes(op.identity?.kind),'JOURNAL_KIND_UNSUPPORTED');}
  packet.validateJournal({format:'synthetic-service-migration-journal-v1',operations:j.operations.map(op=>({identity:op.identity,stage:op.stage}))});return j;
 }
 function snapshot(){
  const bytes={};for(const k of KEYS)bytes[k]=raw(k);
  const j=journal(bytes[JOURNAL]),archives=[];
  for(let slot=0;slot<3;slot++)if(bytes[NEW[slot]]!==null){const a=parse(bytes[NEW[slot]],4100000,'ARCHIVE_INVALID');check(['adopt','downgrade'].includes(a.payload?.kind),'ARCHIVE_KIND_UNSUPPORTED');archives.push({slot,archive:a});}
  for(const a of archives){const entry=j.operations.find(op=>op.identity.archiveRef.slot===a.slot);check(entry,'ORPHAN_SERVICE_ARCHIVE');check(entry.identity.archiveRef.sha256===a.archive.sha256&&entry.identity.operationId===a.archive.payload.operationId,'ARCHIVE_JOURNAL_MISMATCH');}
  check(NEW.reduce((n,k)=>n+(bytes[k]?.length||0),0)+(bytes[JOURNAL]?.length||0)<=12562144,'MIGRATION_TOTAL_CAPACITY');
  return {bytes,journal:j,archives};
 }
 function unchanged(snap){for(const k of KEYS)check(raw(k)===snap.bytes[k],'STORAGE_SNAPSHOT_CHANGED');}
 function lifecycle(input={}){const x=fields(input,['guard','signal'],[]);check(x.guard===undefined||typeof x.guard==='function','INVALID_GUARD');return x;}
 function eligible(life){try{if(!alive||life.signal?.aborted)return false;if(!life.guard)return true;return life.guard()===true;}catch(_){return false;}}
 function requireLife(life){check(eligible(life),'LIFECYCLE_RETIRED');}
 function contextOf(root){return S.codec.context(Object.fromEntries(['mode','accountId','protocolVersion','epoch','generation','revision'].map(k=>[k,root.meta[k]])));}
 async function validateSnapshot(snap){
  const validator=Validator.create({markerRaw:snap.bytes[MARKER],checkpointRaw:snap.bytes[CHECKPOINT],sha256:digest});
  const verified=await validator.validate(snap.bytes[KEY],snap.archives);
  const projected=verified.schemaVersion===3?snap.bytes[KEY]:(await validator.project(snap.bytes[KEY],snap.archives)).projectedRaw;
  // Exact old archive format/hash/lineage rules are executed by the real old Core.
  const oldStorage=Object.freeze({getItem(k){if(k===KEY)return projected;if(k===MARKER||k===CHECKPOINT||OLD.includes(k))return snap.bytes[k];throw error('READ_ONLY_KEY_DENIED');}});
  const account=Account.createAccount({storage:oldStorage,now:forbidden,id:forbidden,healthSeed:forbidden,commerceSeed:forbidden});
  try{account.store.listArticleArchives();}finally{account.dispose();}
  // The old list checks syntax; the production adapter also replays every old state.
  for(const k of OLD)if(snap.bytes[k]!==null){const item=parse(snap.bytes[k],2002000,'LEGACY_ARCHIVE_INVALID');await validator.validate(serialize(item.state),snap.archives);}
  return {validator,root:verified.state,context:verified.context};
 }
 function currentProof(root,rawValue,prepared){
  if(rawValue===prepared.targetRaw)return true;
  const receipt=JSON.parse(prepared.targetRaw).meta.lastServiceMigrationReceipt;
  return !!root.meta.lastServiceMigrationReceipt&&canonical(root.meta.lastServiceMigrationReceipt)===canonical(receipt);
 }
 function phase(snap,verified,prepared){
  if(currentProof(verified.root,snap.bytes[KEY],prepared))return 'target';
  for(const row of snap.archives){const archived=JSON.parse(row.archive.payload.sourceRaw);if(currentProof(archived,row.archive.payload.sourceRaw,prepared))return 'historical-target';}
  if(snap.bytes[KEY]===prepared.archive.payload.sourceRaw)return 'source';return 'changed';
 }
 function requestFor(op){const i=op.identity;return {operationId:i.operationId,key:i.key,kind:i.kind,context:copy(i.fromContext),targetEpoch:i.targetContext.epoch,at:op.preparedAt,slot:i.archiveRef.slot};}
 async function reconstruct(snap,verified,op){
  const identity=op.identity,row=snap.archives.find(x=>x.slot===identity.archiveRef.slot);
  let source;
  if(row){check(row.archive.sha256===identity.archiveRef.sha256,'ARCHIVE_IDENTITY_MISMATCH');source=row.archive.payload.sourceRaw;}
  else if(snap.bytes[KEY]?.length===identity.sourceRawUnits&&digest(snap.bytes[KEY])===identity.sourceRawSHA256)source=snap.bytes[KEY];
  else {const retained=snap.archives.find(x=>x.archive.payload.sourceRaw.length===identity.sourceRawUnits&&digest(x.archive.payload.sourceRaw)===identity.sourceRawSHA256);if(retained)source=retained.archive.payload.sourceRaw;else throw error('SOURCE_FOR_RECONSTRUCTION_UNAVAILABLE');}
  check(source.length===identity.sourceRawUnits&&digest(source)===identity.sourceRawSHA256,'SOURCE_IDENTITY_MISMATCH');
  // Later archives may depend on this operation's adoption archive. They are
  // not inputs to its original preparation and must not create a replay cycle.
  const other=snap.archives.filter(x=>x.slot!==identity.archiveRef.slot&&x.archive.payload.sourceContext.generation<identity.fromContext.generation);
  const rebuilt=(await verified.validator.prepare(source,requestFor(op),other)).prepared;
  check(canonical(rebuilt.identity)===canonical(identity),'PREPARED_TARGET_MISMATCH');
  check(rebuilt.targetRaw.length===identity.targetRawUnits&&digest(rebuilt.targetRaw)===identity.targetRawSHA256,'PREPARED_TARGET_MISMATCH');
  if(row)check(canonical(rebuilt.archive)===canonical(row.archive),'ARCHIVE_IDENTITY_MISMATCH');return rebuilt;
 }
 async function verifyLedger(snap,verified){
  check(snap.journal.operations.filter(x=>!TERMINAL.includes(x.stage)).length<=1,'MULTIPLE_PENDING_OPERATIONS');
  const rebuilt=new Map();
  for(const op of snap.journal.operations){
   const p=await reconstruct(snap,verified,op),observed=phase(snap,verified,p);rebuilt.set(op.identity.operationId,p);
   if(op.stage==='ABORTED_NOT_COMMITTED')check(observed!=='target'&&observed!=='historical-target','ABORTED_STAGE_CONTRADICTION');
   if(op.stage==='ROOT_VERIFIED')check(observed!=='source','ROOT_VERIFIED_STAGE_CONTRADICTION');
   if(op.stage==='COMMITTED')check(observed!=='source'&&verified.context.generation>=op.identity.targetContext.generation&&
    (verified.context.generation!==op.identity.targetContext.generation||verified.context.epoch===op.identity.targetContext.epoch),'COMMITTED_STAGE_CONTRADICTION');
  }
  return rebuilt;
 }
 function outcome(ctx){if(ctx.rootCommitted)return 'committed';if(ctx.rootAttempted&&!ctx.sourceObserved)return 'unknown';if(ctx.sourceObserved||!ctx.existing)return 'not-committed';return 'unknown';}
 function result(ctx,extra={}){
  const o=outcome(ctx),canRender=eligible(ctx.life)&&ctx.displayRaw!==undefined&&(()=>{try{return raw(KEY)===ctx.displayRaw;}catch(_){return false;}})();
  return copy({ok:true,rootOutcome:o,rootCommitted:o==='committed',rootWriteAttempted:!!ctx.rootAttempted,
   artifactWriteAttempted:!!ctx.artifactAttempted,pending:!!ctx.pending,operationId:ctx.op?.identity.operationId||null,
   stage:ctx.op?.stage||null,renderEligible:canRender,storageAcknowledgementOnly:true,realBackend:false,...extra});
 }
 function failure(ctx,cause){
  const code=typeof cause?.code==='string'?cause.code:'COORDINATOR_FAILED',o=outcome(ctx);
  const message=o==='committed'?'迁移根已核验提交；日志或当前页面仍需核对。':o==='unknown'?'迁移根结果未知；保留原请求身份，不能自动回滚或换键重试。':'本次未提交迁移根；已可能写入的日志或备份仍须按原请求核对。';
  return result(ctx,{ok:false,code,message,renderEligible:false});
 }
 function write(snap,key,next,ctx,needLife=true){
  if(needLife)requireLife(ctx.life);unchanged(snap);
  const prior=snap.bytes[key];if(key===KEY){ctx.rootAttempted=true;ctx.sourceObserved=false;}else ctx.artifactAttempted=true;
  let returned;try{returned=set.call(storage,key,next);}catch(_){}
  // This adapter contract is synchronous Storage, not an asynchronous database.
  // A returned promise/value is unsupported after invocation: never misreport
  // its immediate old readback as proof that a deferred write cannot occur.
  if(returned!==undefined){
   try{Promise.prototype.then.call(returned,()=>{},()=>{});}catch(_){}
   if(key===JOURNAL)ctx.pending=true;
   throw error('ASYNC_OR_NONSTANDARD_STORAGE_WRITE');
  }
  let actual;try{actual=raw(key);}catch(_){if(key===JOURNAL)ctx.pending=true;throw error(key===KEY?'ROOT_ACK_UNKNOWN':'ARTIFACT_ACK_UNKNOWN');}
  if(actual===next){snap.bytes[key]=next;if(key===KEY)ctx.rootCommitted=true;return;}
  if(key===KEY&&actual===prior)ctx.sourceObserved=true;
  throw error(actual===prior?(key===KEY?'ROOT_WRITE_NOT_APPLIED':'ARTIFACT_WRITE_NOT_APPLIED'):(key===KEY?'ROOT_WRITE_UNVERIFIED':'ARTIFACT_WRITE_UNVERIFIED'));
 }
 function stage(snap,op,next,ctx,needLife=true){
  const j=copy(snap.journal),i=j.operations.findIndex(x=>x.identity.operationId===op.identity.operationId);check(i>=0,'OPERATION_NOT_FOUND');j.operations[i].stage=next;
  const text=serialize(j);journal(text);write(snap,JOURNAL,text,ctx,needLife);
  snap.journal=j;op.stage=next;ctx.op=op;ctx.pending=!TERMINAL.includes(next);
 }
 function capacity(snap,op,prepared){
  const j=copy(snap.journal);j.operations.push(copy(op));const max=copy(j);max.operations[max.operations.length-1].stage='ACKNOWLEDGED_UNKNOWN';
  const maxText=serialize(max);journal(maxText);const archiveText=serialize(prepared.archive);check(archiveText.length<=4100000,'ARCHIVE_CAPACITY');
  check(NEW.reduce((n,k)=>n+(snap.bytes[k]?.length||0),0)+archiveText.length+maxText.length<=12562144,'MIGRATION_TOTAL_CAPACITY');return j;
 }
 async function finish(snap,verified,op,prepared,ctx){
  ctx.op=op;ctx.pending=!TERMINAL.includes(op.stage);const observed=phase(snap,verified,prepared);
  if(op.stage==='ABORTED_NOT_COMMITTED'){ctx.sourceObserved=observed==='source';return result(ctx,{replayed:true,code:'ABORTED_NOT_COMMITTED'});}
  if(op.stage==='ACKNOWLEDGED_UNKNOWN')return result(ctx,{rootOutcome:'unknown',rootCommitted:false,pending:false,replayed:true,code:'ACKNOWLEDGED_UNKNOWN'});
  if(observed==='target'||observed==='historical-target'){
   ctx.rootCommitted=true;
   if(op.stage!=='COMMITTED'){stage(snap,op,'ROOT_VERIFIED',ctx,false);stage(snap,op,'COMMITTED',ctx,false);}
   ctx.pending=false;ctx.displayRaw=observed==='target'&&snap.bytes[KEY]===prepared.targetRaw?prepared.targetRaw:undefined;
   return result(ctx,{replayed:true,historical:ctx.displayRaw===undefined,commitContext:op.identity.targetContext});
  }
  if(op.stage==='COMMITTED'){
   check(verified.context.generation>=op.identity.targetContext.generation&&
    (verified.context.generation!==op.identity.targetContext.generation||verified.context.epoch===op.identity.targetContext.epoch),'COMMITTED_STAGE_CONTRADICTION');
   return result(ctx,{rootOutcome:'unknown',rootCommitted:false,pending:false,replayed:true,code:'HISTORICAL_COMMIT_NOT_CURRENTLY_PROVABLE',recordedStage:'COMMITTED'});
  }
  check(observed==='source','CURRENT_ROOT_CONFLICT');ctx.sourceObserved=true;
  check(op.stage!=='ROOT_VERIFIED','ROOT_VERIFIED_STAGE_CONTRADICTION');
  requireLife(ctx.life);
  const slot=op.identity.archiveRef.slot;
  if(snap.bytes[NEW[slot]]===null){write(snap,NEW[slot],serialize(prepared.archive),ctx);snap.archives.push({slot,archive:copy(prepared.archive)});}
  else check(canonical(parse(snap.bytes[NEW[slot]],4100000,'ARCHIVE_INVALID'))===canonical(prepared.archive),'ARCHIVE_IDENTITY_MISMATCH');
  if(op.stage!=='BACKUP_VERIFIED')stage(snap,op,'BACKUP_VERIFIED',ctx);
  write(snap,KEY,prepared.targetRaw,ctx);ctx.displayRaw=prepared.targetRaw;
  // Root readback is positive: retirement cannot turn it into an uncommitted result.
  stage(snap,op,'ROOT_VERIFIED',ctx,false);stage(snap,op,'COMMITTED',ctx,false);
  return result(ctx,{replayed:false,commitContext:op.identity.targetContext});
 }
 async function exclusive(mode,value,options){
  let life,argument;try{life=lifecycle(options);argument=copy(value);}catch(e){return failure({life:{},existing:false},e);}
  const ctx={life,existing:false,rootAttempted:false,rootCommitted:false,sourceObserved:false,artifactAttempted:false,pending:false,op:null};
  try{requireLife(life);}catch(e){return failure(ctx,e);}
  let entered=false;
  try{return await requestLock.call(locks,KEY,{mode:'exclusive',...(life.signal?{signal:life.signal}:{})},async()=>{
   entered=true;
   try{
    requireLife(life);if(mode==='commit')check(argument&&typeof argument==='object'&&!Array.isArray(argument),'PREPARE_FIELDS');else if(mode!=='inspect')id(argument);const snap=snapshot();
    let op=mode==='commit'?snap.journal.operations.find(x=>x.identity.key===argument.key):snap.journal.operations.find(x=>x.identity.operationId===argument);
    if(op){ctx.op=copy(op);ctx.existing=true;ctx.pending=!TERMINAL.includes(op.stage);}
    const verified=await validateSnapshot(snap),ledger=await verifyLedger(snap,verified);unchanged(snap);
    if(mode==='inspect')return result(ctx,{rootOutcome:'read-only',rootCommitted:false,context:verified.context,
     operations:snap.journal.operations.map(x=>({operationId:x.identity.operationId,stage:x.stage,slot:x.identity.archiveRef.slot})),reservedSlots:snap.journal.operations.map(x=>x.identity.archiveRef.slot),pending:snap.journal.operations.some(x=>!TERMINAL.includes(x.stage))});
    if(mode==='commit'&&!op){
     check(!snap.journal.operations.some(x=>!TERMINAL.includes(x.stage)),'MIGRATION_PENDING');
     check(!snap.journal.operations.some(x=>x.identity.operationId===argument.operationId),'OPERATION_ID_REUSED');
     check(!snap.journal.operations.some(x=>x.identity.archiveRef.slot===argument.slot),'ARCHIVE_SLOT_RESERVED');
     check(!snap.journal.operations.some(x=>x.identity.targetContext.epoch===argument.targetEpoch),'TARGET_EPOCH_REUSED');
     const prepared=(await verified.validator.prepare(snap.bytes[KEY],argument,snap.archives)).prepared;unchanged(snap);requireLife(life);
     op={identity:copy(prepared.identity),preparedAt:argument.at,stage:'PREPARED'};ctx.op=op;ctx.sourceObserved=true;
     const j=capacity(snap,op,prepared);write(snap,JOURNAL,serialize(j),ctx);snap.journal=j;ctx.pending=true;
     return await finish(snap,verified,op,prepared,ctx);
    }
    check(op,'OPERATION_NOT_FOUND');op=copy(op);ctx.op=op;
    if(mode==='commit')check(canonical(argument)===canonical(requestFor(op)),'ORIGINAL_REQUEST_CONFLICT');
    const prepared=ledger.get(op.identity.operationId);unchanged(snap);
    const observed=phase(snap,verified,prepared);ctx.sourceObserved=observed==='source';ctx.rootCommitted=observed==='target'||observed==='historical-target';
    if(mode==='abortNotCommitted'){
     if(op.stage==='ABORTED_NOT_COMMITTED')return result(ctx,{replayed:true,code:'ABORTED_NOT_COMMITTED',pending:false});
     check(!TERMINAL.includes(op.stage)&&op.stage!=='ROOT_VERIFIED'&&observed==='source','ABORT_NOT_CONFIRMED');
     stage(snap,op,'ABORTED_NOT_COMMITTED',ctx);ctx.displayRaw=snap.bytes[KEY];return result(ctx,{code:'ABORTED_NOT_COMMITTED'});
    }
    if(mode==='acknowledgeUnknown'){
     if(op.stage==='ACKNOWLEDGED_UNKNOWN')return result(ctx,{rootOutcome:'unknown',rootCommitted:false,replayed:true,pending:false,code:'ACKNOWLEDGED_UNKNOWN'});
     check(!TERMINAL.includes(op.stage)&&observed==='changed','ACK_NOT_UNKNOWN');
     stage(snap,op,'ACKNOWLEDGED_UNKNOWN',ctx);return result(ctx,{rootOutcome:'unknown',rootCommitted:false,code:'ACKNOWLEDGED_UNKNOWN',message:'仅停止核对；未证明原提交或回滚，当前根与归档保留。'});
    }
    return await finish(snap,verified,op,prepared,ctx);
   }catch(e){return failure(ctx,e);}
  });}catch(_){return failure(ctx,error(entered?'LOCK_CALLBACK_FAILED':'LOCK_UNAVAILABLE'));}
 }
 return Object.freeze({buildId:BUILD,
  commit:(request,life={})=>exclusive('commit',request,life),resume:(operationId,life={})=>exclusive('resume',operationId,life),
  abortNotCommitted:(operationId,life={})=>exclusive('abortNotCommitted',operationId,life),
  acknowledgeUnknown:(operationId,life={})=>exclusive('acknowledgeUnknown',operationId,life),
  inspect:()=>exclusive('inspect',null,{}),dispose(){alive=false;}
 });
}
return Object.freeze({buildId:BUILD,create,STORAGE_KEY:KEY,JOURNAL_KEY:JOURNAL,ARCHIVE_KEYS:Object.freeze(NEW.slice()),
 LEGACY_ARCHIVE_KEYS:Object.freeze(OLD.slice()),journalFormat:FORMAT});
});
