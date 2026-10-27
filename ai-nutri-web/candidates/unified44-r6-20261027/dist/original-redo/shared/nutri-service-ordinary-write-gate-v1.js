/* Unmounted ordinary-write gate. Explicit synthetic Storage/locks only.
   Compose its paired storage+locks into the real account factory; no old build spoof. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(
 require('./nutri-service-migration-coordinator-v1.js'),require('./nutri-service-plan-contract-v1.js'));
else root.NutriServiceOrdinaryWriteGateV1=factory(root.NutriServiceMigrationCoordinatorV1,root.NutriServicePlanContractV1);
})(typeof globalThis==='object'?globalThis:this,function(Coordinator,S){
'use strict';
const BUILD='service-ordinary-write-gate-v1',KEY='nutri:synthetic:v3:demo-shen',MARKER=KEY+':adopted',CHECKPOINT=KEY+':source-checkpoint';
const JOURNAL=KEY+':service-migration:v1:journal',NEW=[0,1,2].map(i=>KEY+':service-recovery:v1:'+i),OLD=[0,1,2].map(i=>KEY+':article-recovery:'+i);
const KEYS=[KEY,MARKER,CHECKPOINT,JOURNAL,...NEW,...OLD],WRITABLE=[KEY,...OLD],READABLE=[...KEYS,'nutri:synthetic:v1:demo-shen','nutri:synthetic:v2:demo-shen','nutri:synthetic:v2:demo-shen:adopted'];
const STABLE=[MARKER,CHECKPOINT,JOURNAL,...NEW],own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function fail(code,detail){const e=Object.assign(Error(code),{code,outcome:'unknown',migrationOutcome:'unknown',retryAutomatically:false});if(typeof detail==='string')e.inspectionCode=detail;return e;}
if(Coordinator?.buildId!=='service-migration-coordinator-v1'||Coordinator.STORAGE_KEY!==KEY||Coordinator.journalFormat!=='synthetic-service-migration-journal-v2'||S?.buildId!=='service-plan-pure-v1'||typeof S.codec?.serialize!=='function')throw fail('WRITE_GATE_DEPENDENCY_MISMATCH');
function fields(x,allowed,required=allowed){
 if(!x||Object.getPrototypeOf(x)!==Object.prototype)throw fail('WRITE_GATE_OPTIONS');
 const keys=Reflect.ownKeys(x);if(!keys.every(k=>typeof k==='string'&&allowed.includes(k))||!required.every(k=>keys.includes(k)))throw fail('WRITE_GATE_OPTIONS');
 const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!own(d,'value')||!d.enumerable)throw fail('WRITE_GATE_OPTIONS');out[k]=d.value;}return out;
}
function create(input){
 const o=fields(input,['storage','locks','sha256']),storage=o.storage,locks=o.locks;
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||!locks||typeof locks.request!=='function'||typeof o.sha256!=='function')throw fail('WRITE_GATE_DEPENDENCIES_REQUIRED');
 const get=storage.getItem,set=storage.setItem,request=locks.request,sha=o.sha256;
 let alive=true,lease=null,unverifiedAckKey=null;
 function live(signal){if(!alive||signal?.aborted)throw fail('WRITE_GATE_RETIRED');}
 function raw(k){let v;try{v=get.call(storage,k);}catch(_){throw fail('WRITE_GATE_READ_FAILED');}if(v!==null&&typeof v!=='string')throw fail('WRITE_GATE_READ_TYPE');return v;}
 function equal(bytes,keys=KEYS){for(const k of keys)if(raw(k)!==bytes[k])throw fail('WRITE_GATE_SNAPSHOT_CHANGED');}
 function digest(text){let h;try{h=sha(text);}catch(_){throw fail('WRITE_GATE_HASH_FAILED');}if(typeof h!=='string'||!/^[0-9a-f]{64}$/.test(h))throw fail('WRITE_GATE_HASH_FAILED');return h;}
 function retainedSources(bytes){
  if(bytes[JOURNAL]===null)return;
  // These exact bytes already passed the production coordinator's full ledger.
  const j=S.codec.copy(JSON.parse(bytes[JOURNAL])),archives=NEW.filter(k=>bytes[k]!==null).map(k=>S.codec.copy(JSON.parse(bytes[k])));
  for(const op of j.operations){const i=op.identity;
   if(!archives.some(a=>a.payload.sourceRaw.length===i.sourceRawUnits&&digest(a.payload.sourceRaw)===i.sourceRawSHA256))throw fail('WRITE_GATE_SOURCE_NOT_ARCHIVED');
  }
 }
 async function inspect(signal){
  live(signal);const bytes=Object.create(null);let attempted=false;
  const readOnly={getItem(k){if(!KEYS.includes(k))throw fail('WRITE_GATE_INSPECTION_KEY');const value=raw(k);bytes[k]=value;return value;},setItem(){attempted=true;throw fail('WRITE_GATE_INSPECTION_WRITE');}};
  let c,result;
  try{c=Coordinator.create({storage:readOnly,locks:{request:(...args)=>request.apply(locks,args)},sha256:digest});result=await c.inspect();S.codec.json(result);}
  catch(_){throw fail('MIGRATION_INSPECTION_REJECTED');}
  finally{if(c)c.dispose();}
  live(signal);
  if(attempted||KEYS.some(k=>!own(bytes,k))||!result||result.ok!==true||result.rootOutcome!=='read-only')throw fail('MIGRATION_INSPECTION_FAILED',result?.code);
  if(result.pending!==false)throw fail('MIGRATION_PENDING');
  // Do not let an ordinary write destroy the only reconstructable source left
  // after a no-backup abort. No implicit archival, deletion or repair is made.
  try{retainedSources(bytes);}catch(e){if(e?.code==='WRITE_GATE_SOURCE_NOT_ARCHIVED')throw e;throw fail('MIGRATION_INSPECTION_REJECTED');}
  return bytes;
 }
 const pairedStorage=Object.freeze({
  getItem(k){if(!READABLE.includes(k))throw fail('WRITE_GATE_READ_KEY');if(unverifiedAckKey===k){unverifiedAckKey=null;throw fail('WRITE_GATE_WRITE_ACK_UNKNOWN');}return raw(k);},
  setItem(k,value){
   if(!lease||!alive)throw fail('WRITE_GATE_OUTSIDE_LOCK');if(!WRITABLE.includes(k)||typeof value!=='string')throw fail('WRITE_GATE_WRITE_KEY');
   equal(lease.bytes,STABLE);
   const returned=set.call(storage,k,value);
   if(returned!==undefined){
    try{Promise.prototype.then.call(returned,()=>{},()=>{});}catch(_){}
    // The old Core catches setter exceptions; force its immediate readback to
    // remain unknown instead of treating a deferred old-value read as no write.
    unverifiedAckKey=k;throw fail('WRITE_GATE_NONSTANDARD_STORAGE');
   }
  }
 });
 const pairedLocks=Object.freeze({async request(k,options,work){
  const opts=fields(options,['mode','signal'],['mode']);
  if(k!==KEY||opts.mode!=='exclusive'||typeof work!=='function')throw fail('WRITE_GATE_LOCK_ARGUMENT');
  const bytes=await inspect(opts.signal);let entered=false,invoked=false;
  try{return await request.call(locks,KEY,{mode:'exclusive',...(opts.signal?{signal:opts.signal}:{})},async()=>{
   entered=true;live(opts.signal);equal(bytes);if(lease)throw fail('WRITE_GATE_LOCK_REENTRY');
   lease={bytes};
   try{invoked=true;return await work();}finally{lease=null;}
  });}catch(e){
   // Preserve exact old-Core errors/WeakMap commit receipts after invocation.
   if(invoked||entered)throw e;throw fail('WRITE_GATE_LOCK_UNAVAILABLE');
  }
 }});
 return Object.freeze({buildId:BUILD,capability:'synthetic-service-ordinary-write-gate-v1',storage:pairedStorage,locks:pairedLocks,dispose(){alive=false;}});
}
return Object.freeze({buildId:BUILD,create,STORAGE_KEY:KEY});
});
