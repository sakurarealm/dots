/* Unmounted pure preparation/projection. No storage access or commit/CAS implementation. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.NutriServiceMigrationPureV1=factory();})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const BUILD='service-migration-pure-v1', CAPABILITY='service-plan-schema4-migration-v1';
function create(options){
 const o=options||{},S=o.contract;
 if(!S||S.buildId!=='service-plan-pure-v1'||typeof S.codec?.serialize!=='function'||typeof o.validateLegacy!=='function'||typeof o.sha256!=='function')throw Object.assign(Error('PURE_DEPENDENCIES_REQUIRED'),{code:'PURE_DEPENDENCIES_REQUIRED'});
 const {json,exact,copy,canonical,serialize,same,integer,id,key,context,check,fail}=S.codec, own=(a,k)=>Object.prototype.hasOwnProperty.call(a,k), validateLegacy=o.validateLegacy, sha256=o.sha256;
 const KINDS=['adopt','downgrade','cross-schema-restore','article-restore4'];
 const STAGES=['PREPARED','BACKUP_VERIFIED','ROOT_VERIFIED','COMMITTED','ABORTED_NOT_COMMITTED','ACKNOWLEDGED_UNKNOWN'];
 function digest(s){check(typeof s==='string','HASH_INPUT');const h=sha256(s);check(typeof h==='string'&&/^[0-9a-f]{64}$/.test(h),'HASH_PROVIDER');return h;}
 function hash(h){check(typeof h==='string'&&/^[0-9a-f]{64}$/.test(h),'HASH');}
 function ctx(s){return context(Object.fromEntries(['mode','accountId','protocolVersion','epoch','generation','revision'].map(k=>[k,s.meta[k]])));}
 function lineage(m){return {adoptionId:m.adoptionId,checkpointId:m.checkpointId,initialEpoch:m.initialEpoch};}
 function checkLineage(v){exact(v,['adoptionId','checkpointId','initialEpoch'],'LINEAGE_FIELDS');Object.values(v).forEach(id);}
 function schema(n){check(n===3||n===4,'SCHEMA');}
 function ref(v){exact(v,['slot','sha256'],'ARCHIVE_REF_FIELDS');check(Number.isInteger(v.slot)&&v.slot>=0&&v.slot<=2,'ARCHIVE_SLOT');hash(v.sha256);}
 function selection(v){check(v&&typeof v==='object','SELECTION');if(v.type==='current')exact(v,['type'],'SELECTION_FIELDS');else{exact(v,['type','slot','sha256'],'SELECTION_FIELDS');check(v.type==='archive','SELECTION');ref({slot:v.slot,sha256:v.sha256});}}
 function nextContext(from,to){context(from);context(to);check(from.mode===to.mode&&from.accountId===to.accountId&&from.protocolVersion===to.protocolVersion&&to.epoch!==from.epoch&&to.generation===from.generation+1&&to.revision===from.revision+1,'TARGET_CONTEXT');}
 function relation(kind,from,to){check(KINDS.includes(kind),'MIGRATION_KIND');schema(from);schema(to);check(kind==='adopt'?from===3&&to===4:kind==='downgrade'?from===4&&to===3:kind==='cross-schema-restore'?from!==to:from===4&&to===4,'SCHEMA_TRANSITION');}
 function receipt(r){
  exact(r,['format','operationId','kind','fromSchema','targetSchema','fromContext','targetContext','archiveRef','selection'],'MIGRATION_RECEIPT_FIELDS');check(r.format==='synthetic-service-migration-receipt-v1','FORMAT');id(r.operationId);relation(r.kind,r.fromSchema,r.targetSchema);nextContext(r.fromContext,r.targetContext);ref(r.archiveRef);selection(r.selection);
  check((['adopt','downgrade'].includes(r.kind))===(r.selection.type==='current'),'SELECTION_KIND');
 }
 function proof(p){exact(p,['format','operationId','fromContext','initial4Context','archiveRef','lineage'],'ADOPTION_FIELDS');check(p.format==='synthetic-service-adoption-v1','FORMAT');id(p.operationId);nextContext(p.fromContext,p.initial4Context);ref(p.archiveRef);checkLineage(p.lineage);}
 function receiptAtRoot(s){if(!own(s.meta,'lastServiceMigrationReceipt'))return;const r=s.meta.lastServiceMigrationReceipt,c=ctx(s);receipt(r);check(r.targetSchema===s.meta.schemaVersion&&r.targetContext.generation<=c.generation&&r.targetContext.revision<=c.revision&&(r.targetContext.generation!==c.generation||r.targetContext.epoch===c.epoch),'RECEIPT_CONTEXT');}
 function parse(raw){check(typeof raw==='string'&&raw.length<=2000000,'ROOT_SIZE');let s;try{s=JSON.parse(raw);}catch(_){fail('ROOT_CORRUPT');}json(s);check(s&&s.meta&&s.practitioner&&s.meta.seedSnapshots&&s.meta.seedSnapshots.practitioner,'ROOT_SHAPE');schema(s.meta.schemaVersion);check(s.meta.protocolVersion===3,'PROTOCOL');ctx(s);return s;}
 function legacy(s){
  check(s.meta.schemaVersion===3,'LEGACY_SCHEMA');check(!own(s.practitioner,'servicePlans')&&!own(s.meta.seedSnapshots.practitioner,'servicePlans')&&!own(s.meta,'serviceAdoptionProof'),'SERVICE_IN_SCHEMA3');
  receiptAtRoot(s);
  const raw=serialize(s);check(raw.length<=2000000,'ROOT_SIZE');check(validateLegacy(raw)===true,'LEGACY_VALIDATION_REQUIRED');return s;
 }
 function archive(a,validateSource=false,archives=[]){
  json(a);exact(a,['payload','sha256'],'ARCHIVE_FIELDS');hash(a.sha256);const p=a.payload;exact(p,['format','operationId','kind','selection','sourceSchema','sourceContext','lineage','sourceRaw'],'ARCHIVE_PAYLOAD_FIELDS');check(p.format==='synthetic-service-recovery-v1'&&KINDS.includes(p.kind),'FORMAT');id(p.operationId);selection(p.selection);schema(p.sourceSchema);context(p.sourceContext);checkLineage(p.lineage);check(typeof p.sourceRaw==='string'&&p.sourceRaw.length<=2000000,'ROOT_SIZE');
  check((['adopt','downgrade'].includes(p.kind))===(p.selection.type==='current'),'SELECTION_KIND');check(p.kind==='adopt'?p.sourceSchema===3:p.kind==='cross-schema-restore'||p.sourceSchema===4,'ARCHIVE_SOURCE_SCHEMA');
  check(digest(canonical(p))===a.sha256,'ARCHIVE_HASH');check(serialize(a).length<=4100000,'ARCHIVE_CAPACITY');
  const source=parse(p.sourceRaw);check(source.meta.schemaVersion===p.sourceSchema&&same(ctx(source),p.sourceContext)&&same(lineage(source.meta),p.lineage),'ARCHIVE_SOURCE');
  if(validateSource)validateRoot(p.sourceRaw,archives);return copy(a);
 }
 function findArchive(r,archives){ref(r);check(Array.isArray(archives)&&archives.length<=3,'ARCHIVES');const matches=archives.filter(x=>x.slot===r.slot);check(matches.length===1,'ADOPTION_ARCHIVE_REQUIRED');const item=matches[0];exact(item,['slot','archive'],'ARCHIVE_ITEM_FIELDS');const a=archive(item.archive);check(a.sha256===r.sha256,'ADOPTION_ARCHIVE_CHANGED');return a;}
 function strip(s){const p=copy(s);p.meta.schemaVersion=3;delete p.meta.serviceAdoptionProof;delete p.meta.lastServiceMigrationReceipt;delete p.practitioner.servicePlans;delete p.meta.seedSnapshots.practitioner.servicePlans;return p;}
 function validate4(s,archives,depth){
  check(depth<=1,'CHECKPOINT_DEPTH');check(s.meta.schemaVersion===4,'SCHEMA');S.validate(s.practitioner.servicePlans);check(same(S.validate(s.meta.seedSnapshots.practitioner.servicePlans),S.empty()),'SERVICE_SEED_NOT_EMPTY');proof(s.meta.serviceAdoptionProof);
  const p=s.meta.serviceAdoptionProof;check(same(p.lineage,lineage(s.meta)),'ADOPTION_LINEAGE');const current=ctx(s),initial=p.initial4Context;
  check(current.generation>=initial.generation&&current.revision>=initial.revision&&(current.generation!==initial.generation||current.epoch===initial.epoch),'ADOPTION_CONTEXT');
  const a=findArchive(p.archiveRef,archives),ap=a.payload;check(ap.kind==='adopt'&&ap.selection.type==='current'&&ap.sourceSchema===3&&ap.operationId===p.operationId&&same(ap.sourceContext,p.fromContext)&&same(ap.lineage,p.lineage),'ADOPTION_ARCHIVE_BINDING');legacy(parse(ap.sourceRaw));
  receiptAtRoot(s);
  const projected=strip(s),reg=s.practitioner.registration;
  if(reg&&own(reg,'checkpoint')){
   check(depth===0&&typeof reg.checkpoint==='string','CHECKPOINT_DEPTH');const nested=parse(reg.checkpoint);check(!own(nested.practitioner.registration||{},'checkpoint'),'CHECKPOINT_DEPTH');
   if(nested.meta.schemaVersion===4)projected.practitioner.registration.checkpoint=serialize(validate4(nested,archives,depth+1));else legacy(nested);
  }
  legacy(projected);return projected;
 }
 function validateRoot(raw,archives=[]){archives=copy(archives);check(Array.isArray(archives)&&archives.length<=3,'ARCHIVES');const s=parse(raw);if(s.meta.schemaVersion===3)legacy(s);else validate4(s,archives,0);return copy(s);}
 function projection(raw,archives=[]){archives=copy(archives);const s=validateRoot(raw,archives);check(s.meta.schemaVersion===4,'SCHEMA');return validate4(s,archives,0);}
 function identity(i){
  exact(i,['format','operationId','key','kind','fromSchema','targetSchema','fromContext','targetContext','selection','sourceRawSHA256','sourceRawUnits','archiveRef','targetRawSHA256','targetRawUnits'],'IDENTITY_FIELDS');check(i.format==='synthetic-service-migration-identity-v1','FORMAT');id(i.operationId);key(i.key);relation(i.kind,i.fromSchema,i.targetSchema);nextContext(i.fromContext,i.targetContext);selection(i.selection);check((['adopt','downgrade'].includes(i.kind))===(i.selection.type==='current'),'SELECTION_KIND');ref(i.archiveRef);hash(i.sourceRawSHA256);hash(i.targetRawSHA256);integer(i.sourceRawUnits,1);integer(i.targetRawUnits,1);check(i.sourceRawUnits<=2000000&&i.targetRawUnits<=2000000,'ROOT_SIZE');
 }
 function journal(j){json(j);exact(j,['format','operations'],'JOURNAL_FIELDS');check(j.format==='synthetic-service-migration-journal-v1'&&Array.isArray(j.operations)&&j.operations.length<=16,'JOURNAL_CAPACITY');const keys=new Set(),ids=new Set(),slots=new Set();for(const op of j.operations){exact(op,['identity','stage'],'OPERATION_FIELDS');identity(op.identity);check(STAGES.includes(op.stage),'STAGE');check(!keys.has(op.identity.key)&&!ids.has(op.identity.operationId)&&!slots.has(op.identity.archiveRef.slot),'JOURNAL_DUPLICATE');keys.add(op.identity.key);ids.add(op.identity.operationId);slots.add(op.identity.archiveRef.slot);}check(serialize(j).length<=262144,'JOURNAL_CAPACITY');return copy(j);}
 function prepare(raw,input,archives=[]){
  input=copy(input);archives=copy(archives);
  json(input);exact(input,['operationId','key','kind','context','targetEpoch','at','slot'],'PREPARE_FIELDS');id(input.operationId);key(input.key);context(input.context);id(input.targetEpoch);check(['adopt','downgrade'].includes(input.kind),'PURE_KIND_UNIMPLEMENTED');integer(input.at);check(input.at<=8640000000000000,'TIME');check(Number.isInteger(input.slot)&&input.slot>=0&&input.slot<=2,'ARCHIVE_SLOT');
  check(Array.isArray(archives)&&archives.length<=3,'ARCHIVES');const used=new Set();for(const item of archives){exact(item,['slot','archive'],'ARCHIVE_ITEM_FIELDS');check(Number.isInteger(item.slot)&&item.slot>=0&&item.slot<=2&&!used.has(item.slot),'ARCHIVE_SLOT');used.add(item.slot);archive(item.archive,true,archives);check(item.archive.payload.operationId!==input.operationId,'OPERATION_ID_REUSED');}check(!used.has(input.slot),'ARCHIVE_SLOT_OCCUPIED');
  const s=validateRoot(raw,archives),from=ctx(s),fromSchema=s.meta.schemaVersion,targetSchema=input.kind==='adopt'?4:3;
  relation(input.kind,fromSchema,targetSchema);check(same(from,input.context),'STALE_CONTEXT');check(input.targetEpoch!==s.meta.initialEpoch,'EPOCH_REUSED');check(input.at>=Date.parse(s.meta.updatedAt),'CLOCK_ROLLBACK');
  const to={...from,epoch:input.targetEpoch,generation:from.generation+1,revision:from.revision+1};nextContext(from,to);
  const payload={format:'synthetic-service-recovery-v1',operationId:input.operationId,kind:input.kind,selection:{type:'current'},sourceSchema:fromSchema,sourceContext:from,lineage:lineage(s.meta),sourceRaw:raw};
  const a={payload,sha256:digest(canonical(payload))};archive(a);const archiveRef={slot:input.slot,sha256:a.sha256};
  const target=input.kind==='adopt'?copy(s):projection(raw,archives);Object.assign(target.meta,to,{schemaVersion:targetSchema,updatedAt:new Date(input.at).toISOString(),lastAccountOperation:null});delete target.meta.lastTransactionAttempt;
  const r={format:'synthetic-service-migration-receipt-v1',operationId:input.operationId,kind:input.kind,fromSchema,targetSchema,fromContext:from,targetContext:to,archiveRef,selection:{type:'current'}};receipt(r);target.meta.lastServiceMigrationReceipt=r;
  if(input.kind==='adopt'){target.practitioner.servicePlans=S.empty();target.meta.seedSnapshots.practitioner.servicePlans=S.empty();target.meta.serviceAdoptionProof={format:'synthetic-service-adoption-v1',operationId:input.operationId,fromContext:from,initial4Context:to,archiveRef,lineage:lineage(s.meta)};}
  const targetRaw=serialize(target);validateRoot(targetRaw,[...archives,{slot:input.slot,archive:a}]);
  const i={format:'synthetic-service-migration-identity-v1',operationId:input.operationId,key:input.key,kind:input.kind,fromSchema,targetSchema,fromContext:from,targetContext:to,selection:{type:'current'},sourceRawSHA256:digest(raw),sourceRawUnits:raw.length,archiveRef,targetRawSHA256:digest(targetRaw),targetRawUnits:targetRaw.length};identity(i);
  return {archive:a,targetRaw,identity:i,stage:'PREPARED',committed:false,notice:'仅纯函数候选；尚未写入、未做备份/CAS提交。'};
 }
 return Object.freeze({buildId:BUILD,plannedCapability:CAPABILITY,prepare,validateRoot,projection,validateArchive:(a,archives=[])=>archive(a,true,archives),validateJournal:journal,canonical,digest});
}
return Object.freeze({buildId:BUILD,create});
});
