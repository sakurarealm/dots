/* Unified fourteen-consumer service-v4 candidate entry; explicit schema3-to4 migration, no automatic bootstrap/recovery and no external services. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports){module.exports=factory();return;}
 const lib=factory(),NAME='__nutriRegistrationEntrySingletonV3',VERSION='registration-entry-singleton-service-v4-v4';
 const ENTRY=['buildId','store','register','start','view','status','report','ready','choosePersistent','chooseMemory','recheck','recover','execute','retryPending','reconcilePending','hasPending','confirmLeave','resetAccount','restoreAccount','canUndo','subscribe','createRegistrationService','enableServicePlans','resumeServiceMigration','dispose'];
 const STORE=['protocolVersion','status','read','context','current','defineDomain','initialize','transact','subscribe','update','reset','registerDomain','resetAsync','restoreAccountAsync'];
 const own=(object,key)=>Object.getOwnPropertyDescriptor(object,key),data=d=>!!d&&Object.prototype.hasOwnProperty.call(d,'value');
 const disposeSource=Function.prototype.toString.call(lib.create).match(/function dispose\(\)\{[^\n]*\}/)?.[0];
 function shape(value,keys){
  try{if(!value||typeof value!=='object'||!Object.isFrozen(value))return false;
  const actual=Reflect.ownKeys(value);if(actual.length!==keys.length||actual.some(k=>typeof k!=='string'||!keys.includes(k)))return false;
  return keys.every(k=>data(own(value,k)));}catch(_){return false;}
 }
 function known(entry,store){
  try{if(!shape(entry,ENTRY)||!shape(store,STORE)||own(entry,'buildId').value!==lib.buildId||own(entry,'store').value!==store||own(store,'protocolVersion').value!==3)return false;
  if(!ENTRY.filter(k=>!['buildId','store'].includes(k)).every(k=>typeof own(entry,k).value==='function')||!STORE.filter(k=>k!=='protocolVersion').every(k=>typeof own(store,k).value==='function'))return false;
  return !!disposeSource&&Function.prototype.toString.call(own(entry,'dispose').value)===disposeSource;}catch(_){return false;}
 }
 function compatible(e,s){return data(e)&&data(s)&&s.writable===false&&s.configurable===false&&known(e.value,s.value);}
 function marker(d){
  try{if(!data(d)||d.writable!==false||d.configurable!==false||!shape(d.value,['wrapperVersion','buildId','entry','store','retire']))return null;
  const m=d.value,entry=own(m,'entry').value,store=own(m,'store').value;
  if(own(m,'wrapperVersion').value!==VERSION||own(m,'buildId').value!==lib.buildId||!known(entry,store)||own(m,'retire').value!==own(entry,'dispose').value)return null;
  return m;}catch(_){return null;}
 }
 // Only the exact frozen same-application legacy wrappers may be retired.
 // Unknown globals/accessors/native/proxy functions are never invoked.
 const LEGACY_RETIRE_PINS=[{"wrapperVersion": "registration-entry-singleton-c3-v1", "buildId": "registration-entry-v3-c1", "disposeSource": "function dispose(){if(!alive)return;alive=false;attempt++;phase='closed';operation=null;undo=null;unsub?.();account?.dispose();listeners.clear();uiListeners.clear();}", "extra": false}, {"wrapperVersion": "registration-entry-singleton-service-v4-v1", "buildId": "registration-entry-service-v4-c1", "disposeSource": "function dispose(){if(!alive)return;alive=false;attempt++;phase='closed';operation=null;undo=null;unsub?.();account?.dispose();migrationCoordinator?.dispose();migrationCoordinator=null;migrationRecovery=null;listeners.clear();uiListeners.clear();}", "extra": true}, {"wrapperVersion": "registration-entry-singleton-service-v4-v2", "buildId": "registration-entry-service-v4-c1", "disposeSource": "function dispose(){versionObserver?.disconnect();versionObserver=null;if(!alive)return;alive=false;attempt++;phase='closed';operation=null;undo=null;unsub?.();account?.dispose();migrationCoordinator?.dispose();migrationCoordinator=null;migrationRecovery=null;listeners.clear();uiListeners.clear();}", "extra": true}, {"wrapperVersion": "registration-entry-singleton-service-v4-v3", "buildId": "registration-entry-service-v4-c1", "disposeSource": "function dispose(){retireMounts();versionObserver?.disconnect();versionObserver=null;if(!alive)return;alive=false;attempt++;phase='closed';operation=null;undo=null;unsub?.();account?.dispose();migrationCoordinator?.dispose();migrationCoordinator=null;migrationRecovery=null;listeners.clear();uiListeners.clear();}", "extra": true}];
 function recognizedLegacy(md,e,s){
  try{if(!data(md)||md.writable!==false||md.configurable!==false||!data(e)||!data(s)||s.writable!==false||s.configurable!==false||!shape(md.value,['wrapperVersion','buildId','entry','store','retire']))return null;
   const m=md.value,entry=e.value,store=s.value,pin=LEGACY_RETIRE_PINS.find(p=>p.wrapperVersion===own(m,'wrapperVersion').value&&p.buildId===own(m,'buildId').value);
   if(!pin)return null;const keys=pin.extra?ENTRY:ENTRY.filter(k=>!['enableServicePlans','resumeServiceMigration'].includes(k));
   if(!shape(entry,keys)||!shape(store,STORE)||own(entry,'buildId').value!==pin.buildId||own(entry,'store').value!==store||own(store,'protocolVersion').value!==3||own(m,'entry').value!==entry||own(m,'store').value!==store||own(m,'retire').value!==own(entry,'dispose').value)return null;
   if(!keys.filter(k=>!['buildId','store'].includes(k)).every(k=>typeof own(entry,k).value==='function')||!STORE.filter(k=>k!=='protocolVersion').every(k=>typeof own(store,k).value==='function'))return null;
   const fn=own(entry,'dispose').value;return Function.prototype.toString.call(fn)===pin.disposeSource?fn:null;
  }catch(_){return null;}
 }
 function retire(fn){try{fn();}catch(_){} }
 function notice(){
  const d=root.document;if(!d?.body||d.querySelector?.('[data-registration-entry-conflict]'))return;
  const p=d.createElement('p');p.setAttribute('role','alert');p.setAttribute('data-registration-entry-conflict','');p.textContent='演示模块版本冲突，已拒绝本次入口。已识别的旧入口停止继续写入，但停止不等于撤回已发生的写入。旧版私有请求身份可能无法保留；请打开完整版本核对，不要用新请求重试。';d.body.prepend(p);
 }
 function conflict(m,e,s){
  if(m)retire(own(m,'retire').value);
  else if(compatible(e,s))retire(own(e.value,'dispose').value);
  else {const legacy=recognizedLegacy(own(root,NAME),e,s);if(legacy)retire(legacy);}
  notice();throw Error('ENTRY_SINGLETON_CONFLICT');
 }
 function register(entry,store){
  Object.defineProperty(root,NAME,{value:Object.freeze({wrapperVersion:VERSION,buildId:lib.buildId,entry,store,retire:own(entry,'dispose').value}),writable:false,configurable:false,enumerable:false});
 }
 const md=own(root,NAME),ed=own(root,'NutriRegistrationEntry'),sd=own(root,'NutriDemo'),m=marker(md);
 if(md){
  if(m&&compatible(ed,sd)&&ed.value===own(m,'entry').value&&sd.value===own(m,'store').value)return;
  return conflict(m,ed,sd);
 }
 if(ed||sd){
  if(!compatible(ed,sd))return conflict(null,ed,sd);
  try{register(ed.value,sd.value);return;}catch(error){retire(own(ed.value,'dispose').value);notice();throw error;}
 }
 let entry,installed=false;
 try{
  entry=lib.create({window:root,document:root.document,identityGuard:()=>{if(!installed)return true;const e=own(root,'NutriRegistrationEntry'),s=own(root,'NutriDemo'),m=marker(own(root,NAME));return !!m&&data(e)&&data(s)&&e.value===entry&&s.value===entry.store&&own(m,'entry').value===entry&&own(m,'store').value===entry.store;},accountModule:root.NutriRegistrationStoreServiceV4,legacyAccountModule:root.NutriRegistrationStore,coreModule:root.NutriDemoCoreServiceV4,kernel:root.NutriRegistrationKernelServiceV2,hashModule:root.NutriServiceHashV1,migrationModule:root.NutriServiceMigrationCoordinatorV1,health:root.NutriHealthDemo,commerce:root.NutriCommerce,catalog:root.NutriCommerceCatalog});
  Object.defineProperty(root,'NutriRegistrationEntry',{value:entry,writable:true,configurable:true,enumerable:true});
  Object.defineProperty(root,'NutriDemo',{value:entry.store,writable:false,configurable:false});
  register(entry,entry.store);installed=true;
 }catch(error){if(entry)retire(entry.dispose);notice();throw error;}
})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const BUILD='registration-entry-service-v4-c1',BUNDLE='registration-web-service-v4-c1',KEY='nutri:synthetic:v3:demo-shen',FIELDS=['mode','accountId','protocolVersion','epoch','generation','revision'];
const TAILS={family:['family-ui'],aiAgent:['health-ui'],diet:['health-pages'],'health-calendar':['health-pages'],intake:['family-ui','health-pages'],shop:['commerce-ui'],orders:['commerce-ui'],wallet:['commerce-ui'],address:['commerce-ui'],'commerce-admin':['commerce-admin'],student:['practitioner-controller','practitioner-ui','student-platform'],profile:['account-shell'],'profile-management':['account-shell'],settings:['account-shell']};
const clone=x=>JSON.parse(JSON.stringify(x)),fail=(code,outcome)=>Object.assign(Error(code),{code,...(outcome?{outcome}:{})});
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function json(value,seen=new Set(),depth=0){if(depth>32)throw fail('OPERATION_TOO_DEEP');if(value===null||typeof value==='boolean')return;if(typeof value==='string'){if(value.length>200000)throw fail('OPERATION_TEXT_TOO_LONG');return;}if(typeof value==='number'){if(!Number.isFinite(value))throw fail('OPERATION_INVALID_NUMBER');return;}if(!value||typeof value!=='object'||seen.has(value)||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype))throw fail('OPERATION_INVALID_JSON');if(Array.isArray(value)&&(Object.keys(value).length!==value.length||Array.from({length:value.length},(_,i)=>i).some(i=>!Object.prototype.hasOwnProperty.call(value,i))))throw fail('OPERATION_INVALID_JSON');seen.add(value);for(const key of Object.keys(value)){if(['__proto__','prototype','constructor'].includes(key)||/^(api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|password|client[_-]?secret|private[_-]?key|secret)$/i.test(key))throw fail('OPERATION_UNSAFE_KEY');const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.prototype.hasOwnProperty.call(d,'value'))throw fail('OPERATION_INVALID_JSON');json(d.value,seen,depth+1);}seen.delete(value);}
function equal(a,b,revision=true){return !!a&&!!b&&FIELDS.every(k=>(!revision&&k==='revision')||a[k]===b[k]);}
function ctx(state){return Object.fromEntries(FIELDS.map(k=>[k,state.meta[k]]));}
function create(options){
 const o=options||{},w=o.window||{},d=o.document||null,A=o.accountModule,C=o.coreModule,K=o.kernel,H=o.health,M=o.commerce,Legacy=o.legacyAccountModule,Hash=o.hashModule,Migration=o.migrationModule;
 const mounted=[],mountedSeen=new WeakSet();let mountsRetired=false;const page=o.page||String(w.location?.pathname||'').split('/').pop().replace(/\.html$/,''),required=TAILS[page],modules=new Map(),listeners=new Set(),uiListeners=new Set();
 let knownBranch=false,fatal=false,alive=true,loaded=o.documentComplete===true||d?.readyState==='complete',started=false,mountStarted=false,phase='loading',notice='正在检查合成演示模块…',account=null,unsub=null,attempt=0,busyInit=false,mode=null,recovery=null,adoptAllowed=false,lastError=null,operation=null,opSeq=0,undo=null,surface=null;
 // Durable account/storage/recovery notice remains independent of a business refusal.
 let businessNotice=null,migrationCoordinator=null,migrationRecovery=null,versionConflict=false,versionObserver=null;
 function visibleNotice(){return businessNotice?notice+' '+businessNotice.message:notice;}
 let resolveReady;const readiness=new Promise(resolve=>{resolveReady=resolve;});
 const confirm=o.confirm||(text=>typeof w.confirm==='function'&&w.confirm(text)),now=o.now||Date.now;
 function checkVersion(){
  if(!alive||versionConflict)return false;
  let valid=false;try{valid=(o.bundle||d?.body?.dataset?.registrationBundle)===BUNDLE&&!d?.querySelector?.('[data-registration-entry-conflict]')&&(typeof o.identityGuard!=='function'||o.identityGuard()===true);}catch(_){}
  if(valid)return true;versionConflict=true;fatal=true;++attempt;phase='blocked';adoptAllowed=false;migrationRecovery=null;lastError=fail('ENTRY_VERSION_CONFLICT');
  notice='页面版本冲突，当前入口及旧角色已停用。此前操作可能已经写入；保留现有数据和本页原请求，不会自动回滚或换键重试。请重新打开完整版本后核对。';retireMounts();publish();return false;
 }
 function checkAlive(){if(!alive)throw fail('ENTRY_CLOSED');if(!checkVersion())throw fail('ENTRY_VERSION_CONFLICT');if(fatal)throw lastError||fail('ENTRY_BLOCKED');}
 function allowed(guard){if(!checkVersion())return false;try{return (!guard||guard()===true)&&checkVersion();}catch(_){return false;}}
 function status(){checkVersion();const s=account?.store.status();return {...(s||{protocolVersion:3,schemaVersion:null,key:KEY,mode:'synthetic',isSynthetic:true,persistent:false,capabilities:{coordinatedTransactions:true}}),writable:alive&&phase==='ready'&&!operation&&s?.writable===true,pending:phase!=='ready',entryPhase:phase,notice:visibleNotice()};}
 function view(){checkVersion();return {buildId:BUILD,page,phase,notice:visibleNotice(),mode,busy:busyInit||operation?.state==='running',pending:operation?.state||null,error:lastError?.code||null,missing:(required||[]).filter(x=>!modules.has(x)),canAdopt:adoptAllowed&&!busyInit,canRecover:false,canResumeServiceMigration:!!migrationRecovery&&!busyInit,servicePlansAvailable:mode==='persistent'&&account?.store.status().schemaVersion===4,canEnableServicePlans:mode==='persistent'&&phase==='ready'&&account?.store.status().schemaVersion===3&&!busyInit&&!operation,canUndo:canUndo()};}
 function publish(){renderSurface();for(const fn of uiListeners){try{fn(view());}catch(_){}}}
 function report(text){if(!alive)return;notice=String(text);publish();}
 function common(){if(!required)throw fail('ENTRY_PAGE_UNSUPPORTED');if((o.bundle||d?.body?.dataset?.registrationBundle)!==BUNDLE)throw fail('ENTRY_BUNDLE_MISMATCH');if(A?.buildId!=='registration-store-service-v4-plan-v1'||A.accountBuildId!=='registration-account-service-v4-plan-v1'||A.adapterRevision!=='readback-proof-v2-service-plan-v2'||C?.buildId!=='registration-core-service-v4'||K?.buildId!=='registration-kernel-service-v2'||Legacy?.accountBuildId!=='registration-account-v3-batch-b'||Hash?.buildId!=='service-hash-v1'||Migration?.buildId!=='service-migration-coordinator-v1'||typeof Hash.sha256!=='function'||typeof A.createAccount!=='function'||typeof H?.seed!=='function'||M?.buildId!=='commerce-model-registration-v3-c1'||typeof M.initial!=='function'||!Array.isArray(o.catalog))throw fail('ENTRY_DEPENDENCY_MISMATCH');}

 function moduleReady(){return loaded&&required&&required.every(id=>modules.has(id));}
 function rawStore(){checkAlive();if(phase!=='ready'||!account)throw fail('ENTRY_NOT_READY');return account.store;}
 function writeStore(){const s=rawStore();if(operation?.state==='unknown')throw fail('ENTRY_PENDING_OPERATION');return s;}
 function retainGuard(local,ticket){return ()=>alive&&attempt===ticket&&allowed(local);}
 function providerId(kind){if(typeof o.id==='function')return o.id(kind);const crypto=w.crypto;if(typeof crypto?.randomUUID!=='function')throw fail('OPERATION_ID_UNAVAILABLE','not-committed');const value=crypto.randomUUID();if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw fail('OPERATION_ID_UNAVAILABLE','not-committed');return kind+'_'+value;}
 function accountOptions(memory){let storage,locks;try{storage=o.storage!==undefined?o.storage:w.localStorage;}catch(_){}try{locks=o.locks!==undefined?o.locks:w.navigator?.locks;}catch(_){}return {storage:memory?undefined:storage,locks:memory?undefined:locks,eventTarget:memory?undefined:w,now,id:providerId,sha256:Hash.sha256,memory,healthSeed:H.seed,commerceSeed:()=>M.initial(o.catalog)};}
 function makeAccount(memory){unsub?.();account?.dispose();migrationCoordinator?.dispose();migrationCoordinator=null;migrationRecovery=null;const options=accountOptions(memory);account=(memory?Legacy:A).createAccount(options);mode=memory?'memory':'persistent';if(!memory)migrationCoordinator=Migration.create({storage:options.storage,locks:options.locks,sha256:Hash.sha256});unsub=account.store.subscribe((s,e)=>{if(!alive)return;for(const fn of listeners){try{fn(s&&clone(s),e);}catch(_){}}if(!s){notice='合成档案暂不可读。保存权限须重新核对；不会自动清空或重建。';}publish();});}

 function readyFrom(receipt,ticket){if(!alive||ticket!==attempt)return false;const s=account.store.read();knownBranch=true;if(!equal(ctx(s),ctx(receipt.state)))throw fail('ENTRY_INITIALIZATION_OVERTAKEN');phase='ready';adoptAllowed=false;recovery=null;lastError=null;notice=mode==='memory'?'仅本页临时合成演示；导航、关闭或刷新后不保留，不会自动写回持久分支。':(s.meta.schemaVersion===4?'本浏览器合成服务计划格式已核对；保存仅在本机，不接真实认证或预约。':'已有本浏览器合成账号已核对；服务计划保存需另行明确备份升级，不会自动迁移。');resolveReady(store);publish();return true;}
 async function existing(s,ticket){const base=ctx(s);const receipt=await account.store.initialize({guard:()=>alive&&ticket===attempt&&equal(ctx(account.store.read()),base,false)});return readyFrom(receipt,ticket);}
 async function diagnose(e){lastError=e;adoptAllowed=false;recovery=null;migrationRecovery=null;phase='blocked';notice='当前合成档案尚未核对，原字节与归档保留；不会重置或猜测恢复。';if(mode==='persistent'&&migrationCoordinator){try{const inspected=await migrationCoordinator.inspect();if(inspected.ok&&inspected.pending){const pending=inspected.operations.filter(x=>!['COMMITTED','ABORTED_NOT_COMMITTED','ACKNOWLEDGED_UNKNOWN'].includes(x.stage));if(pending.length===1){migrationRecovery=pending[0].operationId;notice='存在未完成的本机服务格式升级；仅可明确继续原日志记录，不能新增保存或换新请求。';}}}catch(_){/* Rejection does not prove no previous write. */}}if(e?.code==='NOT_INITIALIZED')notice='未找到已核对的本浏览器合成账号。本入口不创建或恢复缺失根；请先在原版本建立合法合成账号，或使用明确不持久的临时演示。';publish();}

 async function recheck(){checkAlive();if(fatal||!moduleReady()||!started)throw fail('ENTRY_MODULES_NOT_READY');if(busyInit||operation)return false;const ticket=++attempt;busyInit=true;try{if(!account)makeAccount(false);if(!account.store.status().writable){phase='blocked';notice='当前持久分支不能安全写入：存储或 Web Locks 不可用。可选择独立的本页临时演示。';publish();return false;}const s=account.store.read();knownBranch=true;return await existing(s,ticket);}catch(e){if(alive&&ticket===attempt)await diagnose(e);return false;}finally{busyInit=false;if(alive)publish();}}
 async function choose(memory){checkAlive();if(fatal||!moduleReady()||!started)throw fail('ENTRY_MODULES_NOT_READY');if(busyInit||phase==='ready'||operation)throw fail('ENTRY_CHOICE_UNAVAILABLE');if(!memory&&!adoptAllowed)throw fail('ENTRY_ADOPTION_NOT_ALLOWED');const ticket=++attempt;busyInit=true;adoptAllowed=false;try{if(memory){makeAccount(true);recovery=null;}const receipt=await account.store.initialize({guard:retainGuard(null,ticket)});return readyFrom(receipt,ticket);}catch(e){if(e?.outcome==='unknown'||e?.outcome==='committed')knownBranch=true;if(alive&&ticket===attempt)await diagnose(e);return false;}finally{busyInit=false;if(alive)publish();}}
 async function recover(){throw fail('LEGACY_RECOVERY_NOT_SUPPORTED');}

 function retireMount(record){if(record.retired)return;record.retired=true;const value=record.value;try{value.clear?.(notice);}catch(_){}try{if(typeof value.dispose==='function')value.dispose();else if(typeof value.destroy==='function')value.destroy();}catch(_){}}
 function retireMounts(){mountsRetired=true;for(const record of mounted)retireMount(record);}
 function mountFailure(error){if(!alive)return;fatal=true;++attempt;phase='blocked';lastError=fail('ENTRY_MODULE_MOUNT_FAILED');notice='页面模块未能完成挂载，已停止新增写入。此前请求仍可能已写入；保留数据并重新打开完整版本核对：'+String(error?.code||error?.message||'UNKNOWN');retireMounts();publish();}
 function retainMount(value){
  if(value&&typeof value.then==='function'){Promise.resolve(value).then(retainMount,mountFailure);return;}
  if(!value||typeof value!=='object'||mountedSeen.has(value))return;mountedSeen.add(value);const record={value,retired:false};mounted.push(record);
  if(mountsRetired||!alive||fatal)retireMount(record);
  if(value.ready&&typeof value.ready.then==='function')Promise.resolve(value.ready).catch(mountFailure);
 }
 function launch(){if(mountStarted)return;mountStarted=true;for(const id of required){if(!alive||fatal)break;try{retainMount(modules.get(id).mount(api));}catch(error){mountFailure(error);}}}

 function start(){checkAlive();if(fatal||started)return;try{common();if(!moduleReady()){if(loaded){phase='blocked';notice='缺少完整版本页面模块：'+view().missing.join('、')+'。尚未启用合成账号。';publish();}return;}started=true;phase='checking';launch();if(!alive||fatal)return;if(['diet','health-calendar','intake'].includes(page)&&new URLSearchParams(w.location?.search||'').get('legacy')==='1'){phase='legacy';notice='当前为隔离旧版记录；没有采用或写入 v3。';publish();return;}void recheck();}catch(e){fatal=true;lastError=e;phase='blocked';notice='页面版本不完整，尚未启用写入：'+e.code;publish();}}
 function register(id,definition){checkAlive();if(!required?.includes(id)||modules.has(id)||!definition||definition.buildId!==BUNDLE||typeof definition.mount!=='function'){fatal=true;attempt++;lastError=fail('ENTRY_TAIL_MISMATCH');phase='blocked';notice='页面模块版本冲突，当前模块已停用。此前请求仍可能已写入，保留数据与原请求核对。';retireMounts();publish();throw lastError;}modules.set(id,Object.freeze({buildId:definition.buildId,mount:definition.mount}));start();}
 function validateContext(c){K.contract.json(c);if(!c||Object.keys(c).length!==6||FIELDS.some(k=>!Object.prototype.hasOwnProperty.call(c,k))||c.mode!=='synthetic'||c.accountId!=='demo-shen'||c.protocolVersion!==3||typeof c.epoch!=='string'||!c.epoch||!Number.isSafeInteger(c.generation)||c.generation<0||!Number.isSafeInteger(c.revision)||c.revision<0)throw fail('INVALID_CONTEXT');return freeze(clone(c));}
 function safeCallback(fn,arg){if(typeof fn!=='function')return;try{fn(arg);}catch(e){notice='操作已结束，但页面需要刷新核对：'+(e.code||e.message);publish();}}
 function live(op){return alive&&operation===op&&allowed(op.guard);}
 function holdConflict(op,result,error){if(operation===op){op.state='unknown';op.uncertain=true;op.conflictReceipt=result||op.conflictReceipt||null;op.conflictError=error||op.conflictError||null;}notice='当前入口已停用。此前请求可能已写入，原请求与完成证据仅保留在本页；不会回滚、换键或继续重试。请重新打开完整版本核对。';publish();return {ok:false,error:fail(versionConflict?'ENTRY_VERSION_CONFLICT':'ENTRY_MODULE_MOUNT_FAILED','unknown')};}
 async function perform(op){if(!live(op))return {ok:false,error:fail('STALE_PAGE')};op.state='running';publish();let result;
  try{if(!op.account&&!rawStore().current(op.context))throw fail('STALE_CONTEXT','not-committed');result=await op.run({input:op.input,context:op.context,lease:op.lease});}
  catch(e){if(!alive)return {ok:false,error:e};const current=live(op);if(versionConflict||fatal)return holdConflict(op,null,e);if(e?.outcome==='unknown')op.uncertain=true;const shown=op.uncertain&&e?.outcome!=='committed'?Object.assign(Error(e?.message||'结果尚未核对'),{code:e?.code||'OPERATION_UNKNOWN',outcome:'unknown'}):e;if(operation===op){op.state=shown?.outcome==='unknown'&&current?'unknown':'settled';if(op.state!=='unknown')operation=null;if(shown?.code==='COMMERCE_BUSINESS_REJECTION'&&shown?.businessSource==='commerce:bindInviter'&&shown?.outcome==='not-committed'&&op.kind==='commerce:bindInviter'){if(current)businessNotice={message:String(shown.message),context:op.context};}else notice=shown?.outcome==='unknown'?'保存结果尚未核对。停止新增操作；可原请求重试或读取当前记录。关闭/刷新会丢失本页请求身份。':shown?.outcome==='committed'?'写入已核验，请刷新核对当前记录。':String(shown?.message||'操作未确认成功');publish();}if(current)safeCallback(op.onError,shown);return {ok:false,error:shown};}
  const current=live(op);if(versionConflict||fatal)return holdConflict(op,result);if(operation===op)operation=null;op.state='settled';if(current&&!op.account&&op.kind.startsWith('commerce:')&&businessNotice===op.businessNotice&&businessNotice&&typeof op.verifiedBusinessSuccess==='function'){try{const receipt=op.verifiedBusinessSuccess(result);if(receipt&&typeof receipt.committed==='boolean'&&equal(receipt.request?.context,op.context)&&equal(receipt.context,rawStore().context())&&equal(businessNotice.context,op.context)&&businessNotice===op.businessNotice&&operation===null&&allowed(op.guard))businessNotice=null;}catch(_){/* Unverified success never retires a notice. */}}if(current)safeCallback(op.onSuccess,result);if(alive)publish();return {ok:true,value:result};
 }
 async function executeInternal(spec,accountOperation){let op;try{checkAlive();if(accountOperation==='migration'){if(!account||mode!=='persistent')throw fail('SERVICE_PERSISTENCE_NOT_READY');}else rawStore();if(operation)throw fail('ENTRY_OPERATION_BUSY');if(!spec||typeof spec.kind!=='string'||spec.kind.length>100||typeof spec.run!=='function'||!allowed(spec.guard))throw fail('INVALID_OPERATION');const context=validateContext(spec.context);json(spec.input||{});if(JSON.stringify(spec.input||{}).length>2000000)throw fail('OPERATION_TOO_LARGE');op={id:++opSeq,kind:spec.kind,context,input:freeze(clone(spec.input||{})),guard:spec.guard,run:spec.run,onSuccess:spec.onSuccess,onError:spec.onError,verifiedBusinessSuccess:spec.verifiedBusinessSuccess,businessNotice,reconcile:spec.reconcile,state:'running',account:accountOperation,lease:Object.freeze({})};operation=op;return await perform(op);}catch(e){if(alive&&allowed(spec?.guard))safeCallback(spec?.onError,e);return {ok:false,error:e};}}
 function execute(spec){return executeInternal(spec,false);}
 async function retry(){checkAlive();const op=operation;if(!op||op.state!=='unknown')throw fail('ENTRY_NO_PENDING_OPERATION');return perform(op);}
 function reconcile(){checkAlive();const op=operation;if(!op||op.state!=='unknown')throw fail('ENTRY_NO_PENDING_OPERATION');try{const state=rawStore().read();if(!equal(ctx(state),op.context,false)){report('账号代际已变化，不能重放旧请求。请查看当前记录；原请求结果仍需核对。');return {status:'changed'};}let out=typeof op.reconcile==='function'?op.reconcile({state:clone(state),input:op.input,context:op.context}):{status:'changed',message:'已读取当前合成档案。原操作回执仍未确认，请检查记录。'};if(!out||!['base','match','changed'].includes(out.status))throw fail('INVALID_RECONCILIATION');report(out.message||'当前记录已读取；匹配记录不是原操作提交回执。');return clone(out);}catch(e){report('当前结果仍无法核对：'+(e.code||e.message));return {status:'changed',error:e.code||e.message};}}
 function confirmLeave(dirty,message){if(!alive)return false;if(operation?.state==='running'){report('本次操作尚未结束，请稍候；离开不能撤回已发生的写入。');return false;}const pending=operation,ticket=attempt;if(pending||dirty){const text=(pending?'停止原请求重试并核对当前记录？原操作可能已保存；关闭或刷新会丢失本页请求身份与撤销快照。':'')+(dirty?' '+(message||'同时放弃当前尚未保存的填写？'):'');if(!confirm(text)||!alive||attempt!==ticket||operation!==pending)return false;if(pending){operation=null;publish();}}return true;}
 function operationKey(kind){const uuid=o.operationId?o.operationId():w.crypto?.randomUUID?.();if(!uuid)throw fail('OPERATION_ID_UNAVAILABLE');return kind+'_'+String(uuid).replace(/[^A-Za-z0-9_:-]/g,'').slice(0,60);}
 function canUndo(){if(!alive||phase!=='ready'||!undo||operation)return false;try{return equal(ctx(account.store.read()),undo.context);}catch(_){return false;}}
 function resetAccount(spec={}){let context,key;try{if(operation)throw fail('ENTRY_OPERATION_BUSY');context=validateContext(spec.context||rawStore().context());key=operationKey('reset');if(!confirm('重置整个合成账号的健康、商城和营养师状态？旧版副本保留。仅本页可保留撤销快照；刷新后无法继续本页撤销。'))return Promise.resolve({ok:false,cancelled:true});}catch(error){safeCallback(spec.onError,error);return Promise.resolve({ok:false,error});}
  return executeInternal({kind:'account-reset',context,input:{key},guard:spec.guard,run:({input,context})=>account.store.resetAsync({key:input.key,context,expectedRevision:context.revision,guard:()=>alive&&!fatal&&phase==='ready'&&allowed(spec.guard)}),onSuccess:r=>{undo=r.undoToken?{token:r.undoToken,context:ctx(r.state)}:null;safeCallback(spec.onSuccess,r);},onError:spec.onError,reconcile:()=>({status:'changed',message:'请原请求重试核对最后一次重置回执；不会以新键再次重置。'})},true);
 }
 function restoreAccount(spec={}){let retained,key,context;try{if(operation)throw fail('ENTRY_OPERATION_BUSY');if(!canUndo())throw fail('UNDO_UNAVAILABLE');retained=undo;context=validateContext(retained.context);key=operationKey('restore');if(!confirm('恢复本页上次重置前的整个合成账号？包括健康、订单及营养师登记历史。所有旧角色权限仍会失效，过期资格不会恢复为有效。'))return Promise.resolve({ok:false,cancelled:true});}catch(error){safeCallback(spec.onError,error);return Promise.resolve({ok:false,error});}
  return executeInternal({kind:'account-restore',context,input:{key},guard:spec.guard,run:({input})=>account.store.restoreAccountAsync({token:retained.token,key:input.key,guard:()=>alive&&!fatal&&phase==='ready'&&allowed(spec.guard)}),onSuccess:r=>{undo=null;safeCallback(spec.onSuccess,r);},onError:spec.onError,reconcile:()=>({status:'changed',message:'请原请求重试核对恢复回执；当前只保留本页原撤销身份。'})},true);
 }
 let articleSlots=[];
 function restoreArticle(slot){let context,key,token;try{if(operation)throw fail('ENTRY_OPERATION_BUSY');context=validateContext(rawStore().context());key=operationKey('article-restore');if(slot!==undefined){const row=articleSlots.find(r=>r.slot===slot);if(!row)throw fail('ARTICLE_SELECTION_EXPIRED');token=row.token;}
  if(!confirm('恢复所选完整合成账号（含健康、订单和营养师历史）？'+(rawStore().status().persistent?'会先持久保存并核对当前完整档案，可从下方备份返回。':'当前仅本页内存模式；先备份并核对，刷新后档案与备份都会丢失。')+'三个槽满则阻断，不覆盖。旧角色会退出；仅本机虚构资料。'))return Promise.resolve({ok:false,cancelled:true});
 }catch(error){report(error.message);return Promise.resolve({ok:false,error});}
 return executeInternal({kind:'article-restore',context,input:{key,slot:slot===undefined?null:slot},guard:()=>alive&&!fatal&&phase==='ready',run:({input,context})=>account.store.restoreArticleAsync({key:input.key,context,expectedRevision:context.revision,...(token?{token}:{}),guard:()=>alive&&!fatal&&phase==='ready'}),onSuccess:()=>{undo=null;report('完整合成档案已恢复，旧角色已退出。可从文章回退备份返回上一版；请重新进入角色。');},onError:e=>report(e.message),reconcile:()=>({status:'changed',message:'请按原请求重试核对恢复回执；现有备份保留。'})},true);
 }
 function createRegistrationService(opts={}){
  rawStore();let open=true,flight=null,identityCall=false;
  const lifecycle=()=>open&&alive&&!fatal&&phase==='ready'&&allowed(opts.current);
  const validLease=lease=>lifecycle()&&!!operation&&operation.state==='running'&&operation.lease===lease&&allowed(operation.guard);
  const service=account.createRegistrationService({current:()=>lifecycle()&&(identityCall||(flight&&validLease(flight.lease)))});
  async function call(kind,args,lease){
   if(!validLease(lease))throw fail('ENTRY_OPERATION_LEASE_REQUIRED','not-committed');
   if(flight)throw fail('REGISTRATION_SERVICE_BUSY','not-committed');
   const ticket={lease};flight=ticket;
   try{if(typeof service[kind]!=='function')throw fail('SERVICE_PERSISTENCE_NOT_READY','not-committed');return await service[kind](...args);}finally{if(flight===ticket)flight=null;}
  }
  return Object.freeze({protocolVersion:3,contract:service.contract,
   login(persona){if(!lifecycle())throw fail('REGISTRATION_SERVICE_CLOSED');if(flight)throw fail('REGISTRATION_SERVICE_BUSY');identityCall=true;try{return service.login(persona);}finally{identityCall=false;}},
   logout(session){service.logout(session);},dispose(){open=false;flight=null;service.dispose();},
   snapshot:(session,lease)=>call('snapshot',[session],lease),
   request:(session,input,key,intent,lease)=>call('request',[session,input,key,intent],lease),
   review:(session,input,key,intent,lease)=>call('review',[session,input,key,intent],lease),
   command:(session,input,key,intent,lease)=>call('command',[session,input,key,intent],lease),
   planCommand:(session,input,key,intent,lease)=>call('planCommand',[session,input,key,intent],lease)
  });
 }
 function migrationGuard(spec){return ()=>alive&&!fatal&&d?.hidden!==true&&mode==='persistent'&&!!account&&allowed(spec?.guard);}
 async function migrationResult(run,lease,guard){let result;try{result=await run({guard:()=>guard()&&operation?.lease===lease&&operation.state==='running'});}catch(cause){throw Object.assign(fail('SERVICE_MIGRATION_RESULT_UNKNOWN','unknown'),{cause});}if(!result?.ok||!result.rootCommitted||result.pending){const outcome=result?.pending?'unknown':result?.rootCommitted?'committed':result?.rootOutcome==='unknown'?'unknown':'not-committed';throw Object.assign(fail(result?.code||'SERVICE_MIGRATION_UNVERIFIED',outcome),{migrationPending:result?.pending===true,migrationRootCommitted:result?.rootCommitted===true,...(result?.rootCommitted&&result?.pending?{message:'根已写入，但迁移日志确认未完成；请只继续原请求，不是回滚。'}:{})});}if(!guard()||result.renderEligible!==true)throw fail('SERVICE_MIGRATION_SCOPE_RETIRED','committed');const state=account.store.read();if(state.meta.schemaVersion!==4||!equal(ctx(state),result.commitContext))throw fail('SERVICE_MIGRATION_READBACK_UNKNOWN','unknown');return {state,context:ctx(state),committed:true,persistent:true,migration:true};}
 function migrationSuccess(result,spec){migrationRecovery=null;recovery=null;knownBranch=true;phase='ready';adoptAllowed=false;lastError=null;notice='已明确备份并升级本机合成格式；旧角色已退出，请重新进入。无真实服务提交。';resolveReady(store);safeCallback(spec?.onSuccess,result);for(const fn of listeners){try{fn(clone(result.state));}catch(_){}}publish();}
 async function enableServicePlans(spec={}){
  checkAlive();if(mode!=='persistent'||phase!=='ready'||!migrationCoordinator||busyInit||operation||typeof spec.guard!=='function'||!allowed(spec.guard))throw fail('SERVICE_MIGRATION_UNAVAILABLE','not-committed');
  let retained=false;const base=account.store.read(),context=ctx(base),guard=migrationGuard({guard:()=>retained||allowed(spec.guard)});if(base.meta.schemaVersion!==3)throw fail('SERVICE_MIGRATION_REQUIRES_SCHEMA3','not-committed');
  const inspection=await migrationCoordinator.inspect();if(!guard()||operation)throw fail('SERVICE_MIGRATION_INSPECTION_REQUIRED','unknown');if(!inspection.ok||inspection.pending){const error=fail('SERVICE_MIGRATION_INSPECTION_REQUIRED','unknown');await diagnose(error);throw error;}if(!equal(account.store.context(),context))throw fail('SERVICE_MIGRATION_INSPECTION_REQUIRED','unknown');
  const options=accountOptions(false),slot=[0,1,2].find(i=>!inspection.reservedSlots.includes(i)&&options.storage.getItem(Migration.ARCHIVE_KEYS[i])===null);if(slot===undefined)throw fail('SERVICE_MIGRATION_ARCHIVES_FULL','not-committed');
  const input={operationId:operationKey('service_adopt'),key:operationKey('service_request'),kind:'adopt',context:clone(context),targetEpoch:providerId('service_epoch'),at:now(),slot};
  return executeInternal({kind:'service-migration',context,input,guard,run:async({input,lease})=>{try{return await migrationResult(life=>migrationCoordinator.commit(input,life),lease,guard);}finally{retained=true;}},onSuccess:r=>migrationSuccess(r,spec),onError:spec.onError,reconcile:()=>({status:'changed',message:'读取只作观察，不能证明升级回执；必须原请求重试，不用新时间或新请求重建目标。'})},'migration');
 }
 async function resumeServiceMigration(){
  checkAlive();if(!migrationRecovery||!account||mode!=='persistent'||!migrationCoordinator||busyInit||operation)throw fail('SERVICE_MIGRATION_RECOVERY_UNAVAILABLE');
  const operationId=migrationRecovery,context=account.store.context(),ticket=attempt;if(!confirm('仅继续已保存日志中的同一次本机格式升级？使用原 preparedAt、目标hash和备份；不会重建缺失根，也不代表回滚。')||!alive||ticket!==attempt||migrationRecovery!==operationId||operation)return false;
  const guard=migrationGuard({guard:()=>attempt===ticket});return executeInternal({kind:'service-migration-resume',context,input:{operationId},guard,run:({input,lease})=>migrationResult(life=>migrationCoordinator.resume(input.operationId,life),lease,guard),onSuccess:r=>migrationSuccess(r),reconcile:()=>({status:'changed',message:'保留原升级日志；读取不证明提交，请仅继续此日志。'})},'migration');
 }
 const store=Object.freeze({protocolVersion:3,status,read:()=>rawStore().read(),context:()=>rawStore().context(),current:c=>{try{return rawStore().current(c);}catch(_){return false;}},defineDomain(name,fn){if(!['health','commerce','practitioner'].includes(name)||typeof fn!=='function')throw fail('INVALID_DOMAIN');},async initialize(input={}){await readiness;checkAlive();if(!allowed(input.guard))throw fail('STALE_PAGE');const s=rawStore(),base=s.context();return s.initialize({...input,guard:()=>alive&&allowed(input.guard)&&equal(s.context(),base,false)});},transact(fn,opts){const s=writeStore();if(!operation||operation.state!=='running')throw fail('ENTRY_OPERATION_REQUIRED');const current=operation;return s.transact(fn,{...opts,retryToken:opts?.recoverAck===true?current.lease:undefined,guard:()=>alive&&!fatal&&phase==='ready'&&operation===current&&current.state==='running'&&allowed(opts?.guard)&&allowed(current.guard)});},subscribe(fn){if(typeof fn!=='function')throw fail('INVALID_SUBSCRIBER');listeners.add(fn);return ()=>listeners.delete(fn);},update(){throw fail('ASYNC_REQUIRED');},reset(){throw fail('ASYNC_REQUIRED');},registerDomain(){throw fail('ASYNC_REQUIRED');},resetAsync(){throw fail('USE_ACCOUNT_OPERATION');},restoreAccountAsync(){throw fail('USE_ACCOUNT_OPERATION');}});
 function dispose(){/* all-entry lifecycle revision 2 */retireMounts();versionObserver?.disconnect();versionObserver=null;if(!alive)return;alive=false;attempt++;phase='closed';operation=null;undo=null;unsub?.();account?.dispose();migrationCoordinator?.dispose();migrationCoordinator=null;migrationRecovery=null;listeners.clear();uiListeners.clear();}
 let recoveryExpanded=false;
 function renderSurface(){if(!d?.body||!alive)return;if(!surface){surface=d.createElement('section');surface.dataset.registrationEntry='';surface.className='registration-entry-v3';surface.setAttribute('aria-label','合成账号版本与保存状态');d.body.prepend(surface);surface.addEventListener('click',event=>{if(!surface.contains(event.target))return;const action=event.target.closest?.('[data-entry-action]')?.dataset.entryAction;if(!action)return;const actions={'article-checkpoint':()=>restoreArticle(),...Object.fromEntries([0,1,2].map(i=>['article-archive-'+i,()=>restoreArticle(i)])),adopt:()=>choose(false),memory:()=>choose(true),recheck,recover,'service-resume':resumeServiceMigration,retry,reconcile,stop:()=>confirmLeave(false)};try{const result=actions[action]?.();if(result?.catch)result.catch(e=>report(e.message));}catch(e){report(e.message);}});}
  const previousRecovery=surface.querySelector('details[data-article-recovery]'),previousFocus=d.activeElement,restoreRecoveryFocus=!!previousRecovery?.contains(previousFocus);if(previousRecovery)recoveryExpanded=!!previousRecovery.open;let recoverySummary=null;
  surface.replaceChildren();const p=d.createElement('p');p.setAttribute('role','status');p.setAttribute('aria-live','polite');p.textContent=visibleNotice();surface.append(p);const button=(text,action,disabled,parent=surface)=>{const b=d.createElement('button');b.type='button';b.textContent=text;b.dataset.entryAction=action;b.disabled=!!disabled;parent.append(b);};
  if(phase==='ready'&&account?.store.listArticleArchives){try{articleSlots=account.store.listArticleArchives();const state=rawStore().read(),j=state.practitioner?.registration,disabled=busyInit||!!operation||state.meta.schemaVersion===4,checkpoint=j?.schema==='native-registration-v2';if(checkpoint||articleSlots.length){const panel=d.createElement('details');panel.dataset.articleRecovery='';panel.open=recoveryExpanded;const summary=d.createElement('summary');summary.textContent='数据恢复与备份 · '+articleSlots.length+' 份备份'+(checkpoint?' · 可回退文章升级':'');panel.append(summary);recoverySummary=summary;if(checkpoint)button('恢复文章升级前的完整合成档案','article-checkpoint',disabled,panel);for(const row of articleSlots){const label=row.schema==='native-registration-v2'?'新版文章（含驳回记录）':row.schema==='native-registration-v1'?'升级前文章格式':'历史格式（需核对）';button('返回备份 '+(row.slot+1)+' · '+label+' · '+row.updatedAt,'article-archive-'+row.slot,disabled,panel);}surface.append(panel);}}catch(e){articleSlots=[];const warning=d.createElement('p');warning.setAttribute('role','alert');warning.textContent='文章回退档案未核对：'+e.message;surface.append(warning);}}
  if(!started||!loaded)return;if(phase!=='ready'&&phase!=='legacy'){if(adoptAllowed)button('明确采用完整合成副本','adopt',busyInit);if(migrationRecovery)button('明确继续原服务格式升级','service-resume',busyInit);button('重新读取当前分支','recheck',busyInit);button('仅本页新建临时演示','memory',busyInit);}
  if(operation?.state==='unknown'){button('原请求重试','retry',versionConflict||fatal);button('核对当前记录','reconcile',versionConflict||fatal);button('停止重试，保留当前数据','stop',versionConflict||fatal);}
  if(restoreRecoveryFocus&&recoverySummary&&(!d.activeElement||d.activeElement===d.body||d.activeElement===previousFocus))recoverySummary.focus?.();
 }
 const api=Object.freeze({buildId:BUILD,store,register,start,view,status,report,ready:()=>readiness,choosePersistent:()=>choose(false),chooseMemory:()=>choose(true),recheck,recover,execute,retryPending:retry,reconcilePending:reconcile,hasPending:()=>!!operation,confirmLeave,resetAccount,restoreAccount,canUndo,subscribe:fn=>{uiListeners.add(fn);return ()=>uiListeners.delete(fn);},createRegistrationService,enableServicePlans,resumeServiceMigration,dispose});
 try{if(d?.body&&typeof w.MutationObserver==='function'){versionObserver=new w.MutationObserver(()=>{if(alive)checkVersion();});versionObserver.observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-registration-bundle']});}}catch(_){versionObserver=null;}
 w.addEventListener?.('pagehide',dispose);w.addEventListener?.('pageshow',e=>{if(e.persisted)w.location?.reload?.();});w.addEventListener?.('beforeunload',e=>{if(operation){e.preventDefault?.();e.returnValue='';}});d?.addEventListener?.('DOMContentLoaded',()=>{loaded=true;start();});if(loaded)start();return api;
}
return Object.freeze({create,buildId:BUILD,bundleId:BUNDLE});
});
