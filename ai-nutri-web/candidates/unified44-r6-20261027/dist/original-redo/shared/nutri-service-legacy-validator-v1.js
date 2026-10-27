/* Unmounted production adapter: fixed legacy implementations, explicit synthetic bytes,
   read-only verification. No caller-supplied validation predicate or ambient storage. */
(function(root,factory){'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(
  require('./nutri-demo-core-registration-v3.js'),require('./nutri-registration-kernel-v1.js'),
  require('./nutri-service-plan-contract-v1.js'),require('./nutri-service-migration-pure-v1.js'));
 else root.NutriServiceLegacyValidatorV1=factory(root.NutriDemoCoreRegistrationV3,
  root.NutriRegistrationKernel,root.NutriServicePlanContractV1,root.NutriServiceMigrationPureV1);
})(typeof globalThis==='object'?globalThis:this,function(Core,K,S,Migration){
'use strict';
const BUILD='service-legacy-validator-v1',KEY='nutri:synthetic:v3:demo-shen';
const EXPECTED_KERNEL_HASHES={
 'registration-bridge.js':'4542b9a7bb7c0abd73de6d510381a5efb5dc9669b69b2fd09eb475609d58feea',
 'registration-schema.js':'1de7ee55b71450623f63c1ddad713eeb1627522f2a838b2dba0fcbff80a62ca6',
 'practitioner-model.js':'1d915e01f331c82ab095f3a27e8fc191c05f7037bd93e9f67816d7c659c0a9da',
 'registration-vendor/nutritionistPlatform.js':'189e7f969901a160db5f3d4d31101039aa99d56642899dec762acd6451064875',
 'registration-vendor/nutritionistSynthetic.js':'18cbd091739aff0ae99bf63d093ab7c0c43afdebc394979e02a9a7cdb8aab1af',
 'practitioner-forms.js':'39d83ceb3118895048631f1b297c9bef60e0365c31961d309032dadfada091a2'
};
function fail(code){throw Object.assign(Error(code),{code});}
if(!Core||Core.buildId!=='registration-core-v3-batch-b'||Core.STORAGE_KEY!==KEY||
 !K||K.buildId!=='registration-kernel-v1'||!S||S.buildId!=='service-plan-pure-v1'||
 typeof S.codec?.serialize!=='function'||!Migration||Migration.buildId!=='service-migration-pure-v1')fail('VALIDATOR_DEPENDENCY_MISMATCH');
const {copy,json,serialize,canonical,exact,context,check,integer}=S.codec;
if(canonical(K.sourceHashes)!==canonical(EXPECTED_KERNEL_HASHES))fail('VALIDATOR_KERNEL_MISMATCH');
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const emptyJournal=copy(K.seed({now:0}).registration);
function parse(raw,max,code){check(typeof raw==='string'&&raw.length<=max,code);let value;try{value=JSON.parse(raw);}catch(_){fail(code);}json(value);return value;}
function rootContext(root){return context(Object.fromEntries(['mode','accountId','protocolVersion','epoch','generation','revision'].map(k=>[k,root.meta[k]])));}
function nativeContext(root){return {mode:'synthetic',accountId:'demo-shen',generation:root.meta.generation,revision:root.meta.revision};}
function forbidden(){fail('READ_ONLY_VALIDATOR_OPERATION');}
function options(raw){
 check(raw&&Object.getPrototypeOf(raw)===Object.prototype,'VALIDATOR_OPTIONS');
 const keys=Reflect.ownKeys(raw);check(keys.length===3&&keys.every(k=>['markerRaw','checkpointRaw','sha256'].includes(k)),'VALIDATOR_OPTIONS');
 const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(raw,k);check(d&&own(d,'value')&&d.enumerable,'VALIDATOR_OPTIONS');out[k]=d.value;}
 check(typeof out.sha256==='function','VALIDATOR_HASH_REQUIRED');
 parse(out.markerRaw,4100000,'VALIDATOR_MARKER_INVALID');parse(out.checkpointRaw,4100000,'VALIDATOR_CHECKPOINT_INVALID');
 return out;
}
function seedCheck(input){
 const value=copy(input);check(value&&typeof value==='object'&&!Array.isArray(value),'INVALID_SEED_JOURNAL');
 if(!own(value,'registration'))value.registration=copy(emptyJournal);
 K.contract.validateJournal(value.registration);
 check(canonical(value.registration)===canonical(emptyJournal),'NONEMPTY_REGISTRATION_SEED');return value;
}
function create(input){
 const {markerRaw,checkpointRaw,sha256}=options(input);
 // Frozen strings, not a facade over live browser localStorage or a synthetic Map backend.
 function readLegacy(raw){
  parse(raw,2000000,'VALIDATOR_ROOT_INVALID');
  const storage=Object.freeze({getItem(key){
   if(key===KEY)return raw;if(key===Core.MARKER_KEY)return markerRaw;
   if(key===Core.CHECKPOINT_KEY)return checkpointRaw;fail('READ_ONLY_KEY_DENIED');
  }});
  const core=Core.create({storage,now:forbidden,id:forbidden,
   factories:{health:forbidden,commerce:forbidden,practitioner:forbidden},
   validatePractitionerSeed:seedCheck});
  try{const root=core.read();K.contract.validateJournal(root.practitioner.registration||copy(emptyJournal));return root;}
  finally{core.dispose();}
 }
 // Exercise the real frozen kernel's complete replay and A-domain validation at its
 // last recorded historical instant. Never advance today's expiry or return this
 // historical view as current qualification/authentication.
 async function probe(root,seed=false){
  let local=copy(root);
  if(seed)local.practitioner=copy(root.meta.seedSnapshots.practitioner);
  const original=copy(local),journal=local.practitioner.registration||copy(emptyJournal);
  K.contract.validateJournal(journal);
  const at=journal.events.length?journal.events[journal.events.length-1].at:1000;
  const expected=copy(local.practitioner);
  if(!own(expected,'registration'))expected.registration=copy(emptyJournal);
  let normalizations=0;
  const facade=Object.freeze({
   status:()=>({protocolVersion:1}),read:()=>copy(local),context:()=>nativeContext(local),
   current:c=>!!c&&c.mode==='synthetic'&&c.accountId==='demo-shen'&&c.generation===local.meta.generation,
   update(fn,opts={}){
    check(opts.expectedRevision===local.meta.revision,'VALIDATOR_PROBE_REVISION');
    const next=copy(local),returned=fn(next);check(!(returned&&typeof returned.then==='function'),'VALIDATOR_PROBE_ASYNC');
    // Only the old kernel's optional empty-registration materialization is allowed
    // in this disposable local probe; no original bytes or actual storage change.
    const comparable=copy(next);comparable.practitioner=copy(original.practitioner);
    check(canonical(comparable)===canonical(original)&&canonical(next.practitioner)===canonical(expected),
     'VALIDATOR_REPLAY_WOULD_CHANGE_STATE');
    check(!own(original.practitioner,'registration')&&++normalizations===1,'VALIDATOR_REPLAY_WOULD_CHANGE_STATE');
    integer(next.meta.revision+1);next.meta.revision++;local=next;return copy(local);
   }
  });
  const bridge=K.createBridge({core:facade,current:()=>true,now:()=>at});
  try{await bridge.snapshot(bridge.login('synthetic-reviewer'));
   check(canonical(local.practitioner)===canonical(expected),'VALIDATOR_REPLAY_WOULD_CHANGE_STATE');
  }finally{bridge.dispose();}
  return {historicalAt:at,optionalEmptyRegistrationNormalized:normalizations===1};
 }
 async function operate(kind,raw,args,providedArchives){
  check(typeof raw==='string','VALIDATOR_ROOT_INVALID');
  const archives=copy(providedArchives),request=args===null?null:copy(args),pending=new Set();
  check(Array.isArray(archives)&&archives.length<=3,'ARCHIVES');
  function scheduleLegacy(candidate){
   const checked=readLegacy(candidate);pending.add(candidate);
   if(checked.practitioner.registration?.schema==='native-registration-v2'){
    const nested=checked.practitioner.registration.checkpoint;
    // The real journal validator already limits this to one native-v1 checkpoint.
    // Validate its complete core lineage and replay it too, not only its syntax.
    readLegacy(nested);pending.add(nested);
   }
   return true;
  }
  const pure=Migration.create({contract:S,sha256,validateLegacy:scheduleLegacy});
  const slots=new Set();for(const item of archives){exact(item,['slot','archive'],'ARCHIVE_ITEM_FIELDS');check(Number.isInteger(item.slot)&&item.slot>=0&&item.slot<=2&&!slots.has(item.slot),'ARCHIVE_SLOT');slots.add(item.slot);pure.validateArchive(item.archive,archives);}
  let value;
  if(kind==='validate')value=pure.validateRoot(raw,archives);
  else if(kind==='project')value=pure.projection(raw,archives);
  else value=pure.prepare(raw,request,archives);
  // Core.read already verified this retained adoption checkpoint in full. Also
  // replay its initial practitioner state instead of trusting only current fields.
  const checkpoint=parse(checkpointRaw,4100000,'VALIDATOR_CHECKPOINT_INVALID');
  check(typeof checkpoint.initialRaw==='string','VALIDATOR_CHECKPOINT_INVALID');scheduleLegacy(checkpoint.initialRaw);
  const observations=[];
  for(const candidate of pending){
   const root=readLegacy(candidate),current=await probe(root),seed=await probe(root,true);
   observations.push({rawSHA256:pure.digest(candidate),current,seed});
  }
  // Hash calls are explicit trusted dependencies, not authentication. Revalidate
  // our JSON boundary after each callback and before returning any object.
  const binding={sourceRawSHA256:pure.digest(raw),markerRawSHA256:pure.digest(markerRaw),checkpointRawSHA256:pure.digest(checkpointRaw)};
  const base={readOnly:true,persisted:false,connected:false,binding,legacyReplayCount:observations.length,observations};
  if(kind==='validate')return copy({...base,state:value,context:rootContext(value),schemaVersion:value.meta.schemaVersion});
  if(kind==='project')return copy({...base,projectedRaw:serialize(value),context:rootContext(value),schemaVersion:3});
  return copy({...base,prepared:value});
 }
 return Object.freeze({buildId:BUILD,readOnly:true,
  validate:(raw,archives=[])=>operate('validate',raw,null,archives),
  project:(raw,archives=[])=>operate('project',raw,null,archives),
  prepare:(raw,request,archives=[])=>operate('prepare',raw,request,archives)
 });
}
return Object.freeze({buildId:BUILD,create,notice:'只读验证显式本机合成字节；不代表当前身份、持久提交或真实服务。'});
});
