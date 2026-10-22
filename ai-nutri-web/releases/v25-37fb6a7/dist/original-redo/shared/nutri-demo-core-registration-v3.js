/* Inactive injected synthetic v3 account factory. No singleton, discovery, network or automatic import. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.NutriDemoCoreRegistrationV3=factory();})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const KEY='nutri:synthetic:v3:demo-shen', MARKER=KEY+':adopted', CHECKPOINT=KEY+':source-checkpoint';
const V2='nutri:synthetic:v2:demo-shen', V1='nutri:synthetic:v1:demo-shen';
const DOMAINS=['health','commerce','practitioner'], FIELDS=['mode','accountId','protocolVersion','epoch','generation','revision'];
const MAX=2000000, CHECKPOINT_MAX=4100000, HISTORY_MAX=12000000;
const receiptReaders=new WeakMap();
function commitReceipt(store,error){const read=receiptReaders.get(store);return read?read(error):null;}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),plain=o=>!!o&&Object.getPrototypeOf(o)===Object.prototype;
const clone=o=>JSON.parse(JSON.stringify(o)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function fail(code,outcome){const e=Object.assign(Error(code),{code});if(outcome)e.outcome=outcome;return e;}
// SHA-256/UTF-8 reused from native recovery-codec; corruption detection, not authentication.
function articleHashCheck(v,c){if(!v)throw fail(c);}
function articleUtf8(s){articleHashCheck(typeof s==='string','RECOVERY_TEXT');let size=0;for(let i=0;i<s.length;i++){const n=s.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){const low=s.charCodeAt(++i);articleHashCheck(low>=0xdc00&&low<=0xdfff,'RECOVERY_SURROGATE');size+=4;}else{articleHashCheck(!(n>=0xdc00&&n<=0xdfff),'RECOVERY_SURROGATE');size+=n<128?1:n<2048?2:3;}}const out=new Uint8Array(size);let j=0;for(let i=0;i<s.length;i++){let n=s.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){n=0x10000+((n-0xd800)<<10)+(s.charCodeAt(++i)-0xdc00);out[j++]=240|(n>>>18);out[j++]=128|((n>>>12)&63);out[j++]=128|((n>>>6)&63);out[j++]=128|(n&63);}else if(n<128)out[j++]=n;else if(n<2048){out[j++]=192|(n>>>6);out[j++]=128|(n&63);}else{out[j++]=224|(n>>>12);out[j++]=128|((n>>>6)&63);out[j++]=128|(n&63);}}return out;}
const ARTICLE_SHA_K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function articleSha256(s){const bytes=articleUtf8(s),len=bytes.length,padded=new Uint8Array(Math.ceil((len+9)/64)*64);padded.set(bytes);padded[len]=128;let bits=len*8;for(let i=0;i<8;i++){padded[padded.length-1-i]=bits%256;bits=Math.floor(bits/256);}const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),ro=(x,n)=>(x>>>n)|(x<<(32-n));for(let off=0;off<padded.length;off+=64){for(let i=0;i<16;i++){const p=off+i*4;w[i]=(padded[p]<<24)|(padded[p+1]<<16)|(padded[p+2]<<8)|padded[p+3];}for(let i=16;i<64;i++)w[i]=(w[i-16]+(ro(w[i-15],7)^ro(w[i-15],18)^(w[i-15]>>>3))+w[i-7]+(ro(w[i-2],17)^ro(w[i-2],19)^(w[i-2]>>>10)))>>>0;let[a,b,c,d,e,f,g,k]=h;for(let i=0;i<64;i++){const t1=(k+(ro(e,6)^ro(e,11)^ro(e,25))+((e&f)^(~e&g))+ARTICLE_SHA_K[i]+w[i])>>>0,t2=((ro(a,2)^ro(a,13)^ro(a,22))+((a&b)^(a&c)^(b&c)))>>>0;k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,k].forEach((n,i)=>h[i]=(h[i]+n)>>>0);}return h.map(n=>n.toString(16).padStart(8,'0')).join('');}
function json(v,seen=new Set(),depth=0){
 if(depth>32)throw fail('DATA_TOO_DEEP');
 if(v===null||typeof v==='boolean')return;
 if(typeof v==='string'){if(v.length>200000)throw fail('TEXT_TOO_LONG');return;}
 if(typeof v==='number'){if(!Number.isFinite(v))throw fail('INVALID_NUMBER');return;}
 if((!Array.isArray(v)&&!plain(v))||seen.has(v))throw fail('NON_JSON_VALUE');
 if(Array.isArray(v)&&(Object.keys(v).length!==v.length||Array.from({length:v.length},(_,i)=>i).some(i=>!own(v,i))))throw fail('NON_JSON_VALUE');
 seen.add(v);for(const k of Object.keys(v)){
  if(['__proto__','prototype','constructor'].includes(k))throw fail('UNSAFE_KEY');
  if(/^(api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|password|client[_-]?secret|private[_-]?key|secret)$/i.test(k))throw fail('SECRET_NOT_ALLOWED');
  const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!own(d,'value'))throw fail('NON_JSON_VALUE');
  if(k==='isSynthetic'&&d.value!==true)throw fail('REAL_DATA_NOT_ALLOWED');
  if(k==='mode'&&['real','live','production'].includes(d.value))throw fail('REAL_MODE_NOT_ALLOWED');
  json(d.value,seen,depth+1);
 }seen.delete(v);
}
function integer(n){if(!Number.isSafeInteger(n)||n<0)throw fail('INVALID_REVISION');return n;}
function textId(s){if(typeof s!=='string'||s.length<1||s.length>160)throw fail('INVALID_ID');return s;}
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw fail('INVALID_TIME');return s;}
function instant(s){if(typeof s!=='string'||!Number.isFinite(Date.parse(s)))throw fail('INVALID_TIME');return s;}
function time(t){if(!Number.isSafeInteger(t)||t<0||t>8640000000000000-28800000)throw fail('INVALID_TIME');return t;}
function ctx(s){return Object.fromEntries(FIELDS.map(k=>[k,s.meta[k]]));}
function context(c){json(c);if(!plain(c)||Object.keys(c).length!==6||FIELDS.some(k=>!own(c,k))||c.mode!=='synthetic'||c.accountId!=='demo-shen'||c.protocolVersion!==3)throw fail('INVALID_CONTEXT');textId(c.epoch);integer(c.generation);integer(c.revision);return clone(c);}
function match(a,b,revision=true){return !!a&&FIELDS.every(k=>(!revision&&k==='revision')||a[k]===b[k]);}
function key(k){if(typeof k!=='string'||!/^[A-Za-z0-9_:-]{16,80}$/.test(k))throw fail('INVALID_OPERATION_KEY');return k;}
function profile(){return {id:'demo-shen',name:'沈先生',displayName:'沈先生',nickname:'沈先生',invitationCode:'DEMO-SHEN',timeZone:'Asia/Shanghai',isSynthetic:true};}
function create(options){
 const o=options||{},memory=o.memory===true,storage=o.storage,locks=o.locks,now=o.now||Date.now;
 const factories=o.factories,validateSeed=o.validatePractitionerSeed;
 if(!factories||DOMAINS.some(k=>typeof factories[k]!=='function')||typeof validateSeed!=='function')throw fail('CANONICAL_FACTORIES_REQUIRED');
 const local=new Map(),listeners=new Set(),recoveries=new Map(),operations=new Map(),undos=new Map(),commitProofs=new WeakMap(),transactionAttempts=new WeakMap(),transactionIds=new Set();
 let closed=false,error=null,queue=Promise.resolve(),mutating=false,historySize=0,idSerial=0;
 function ensure(){if(closed)throw fail('STORE_CLOSED');}
 function stamp(){return time(now());}
 function id(kind){const value=o.id?o.id(kind):kind+'-'+stamp()+'-'+(++idSerial)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);return textId(value);}
 function raw(k){ensure();if(memory)return local.has(k)?local.get(k):null;if(!storage||typeof storage.getItem!=='function')throw fail('STORAGE_UNAVAILABLE');try{const v=storage.getItem(k);if(v!==null&&typeof v!=='string')throw Error();return v;}catch(_){throw fail('STORAGE_READ_FAILED');}}
 function artifacts(){return {root:raw(KEY),marker:raw(MARKER),checkpoint:raw(CHECKPOINT)};}
 function verifyRoot(s,version=3){
  json(s);if(!plain(s)||!plain(s.meta)||!plain(s.profile))throw fail('INVALID_STATE');const m=s.meta,p=s.profile;
  if(m.schemaVersion!==version||(version>1&&m.protocolVersion!==version)||m.mode!=='synthetic'||m.accountId!=='demo-shen'||m.isSynthetic!==true||p.id!=='demo-shen'||p.name!=='沈先生'||p.invitationCode!=='DEMO-SHEN'||p.isSynthetic!==true)throw fail('IDENTITY_BOUNDARY');
  integer(m.revision);integer(m.generation);date(m.seedDate);instant(m.createdAt);instant(m.updatedAt);if(version>1)textId(m.epoch);
  if(Object.keys(s).some(k=>!['meta','profile',...DOMAINS].includes(k))||DOMAINS.some(k=>!own(s,k)||(s[k]!==null&&!plain(s[k]))))throw fail('INVALID_DOMAIN');
  if(!plain(m.seedSnapshots)||Object.keys(m.seedSnapshots).some(k=>!DOMAINS.includes(k)||!plain(m.seedSnapshots[k])))throw fail('INVALID_SEED_SNAPSHOTS');
  if(version===3){
   if(own(m,'lastTransactionAttempt')){const r=m.lastTransactionAttempt;if(!plain(r)||Object.keys(r).sort().join(',')!=='from,id,target')throw fail('INVALID_TRANSACTION_ATTEMPT');textId(r.id);context(r.from);context(r.target);if(!match(r.from,r.target,false)||r.target.revision!==r.from.revision+1)throw fail('INVALID_TRANSACTION_ATTEMPT');}
   context(ctx(s));['adoptionId','checkpointId','initialEpoch'].forEach(k=>textId(m[k]));
   if(DOMAINS.some(k=>!plain(s[k])||!plain(m.seedSnapshots[k])))throw fail('MISSING_DOMAIN');
   const checked=validateSeed(clone(m.seedSnapshots.practitioner));if(!same(checked,m.seedSnapshots.practitioner))throw fail('INVALID_SEED_JOURNAL');
   if(!plain(m.source)||!['fresh',V1,V2].includes(m.source.key))throw fail('INVALID_SOURCE');
   if(m.lastAccountOperation!==null){const r=m.lastAccountOperation;json(r);if(!plain(r)||!['reset','restore'].includes(r.kind)||Object.keys(r).sort().join(',')!=='adoptionId,from,key,kind,target')throw fail('INVALID_ACCOUNT_RECEIPT');key(r.key);context(r.from);context(r.target);if(r.adoptionId!==m.adoptionId||r.target.revision>m.revision||!match(r.target,ctx(s),false)||r.target.revision!==r.from.revision+1||r.target.generation!==r.from.generation+1||r.target.epoch===r.from.epoch)throw fail('INVALID_ACCOUNT_RECEIPT');}
  }
  if(JSON.stringify(s).length>MAX)throw fail('STATE_TOO_LARGE');return s;
 }
 function parseRoot(text,version=3){if(typeof text!=='string'||text.length>MAX)throw fail('STATE_TOO_LARGE');let s;try{s=JSON.parse(text);}catch(_){throw fail('CORRUPT_DEMO_STATE');}return verifyRoot(s,version);}
 function lineage(x){return {adoptionId:x.adoptionId,checkpointId:x.checkpointId,initialEpoch:x.initialEpoch};}
 function marker(text){let m;try{m=JSON.parse(text);}catch(_){throw fail('CORRUPT_ADOPTION_MARKER');}json(m);if(!plain(m)||Object.keys(m).sort().join(',')!=='adoptionId,checkpointId,initialEpoch,phase,protocolVersion'||m.protocolVersion!==3||!['reserved','adopted'].includes(m.phase))throw fail('CORRUPT_ADOPTION_MARKER');Object.values(lineage(m)).forEach(textId);return m;}
 function checkpoint(text){
  if(typeof text!=='string'||text.length>CHECKPOINT_MAX)throw fail('CHECKPOINT_TOO_LARGE');let c;try{c=JSON.parse(text);}catch(_){throw fail('CORRUPT_CHECKPOINT');}
  if(!plain(c)||Object.keys(c).sort().join(',')!=='adoptionId,checkpointId,initialEpoch,initialRaw,protocolVersion,sourceContext,sourceKey,sourceRaw'||c.protocolVersion!==3)throw fail('CORRUPT_CHECKPOINT');Object.values(lineage(c)).forEach(textId);
  const initial=parseRoot(c.initialRaw);if(!same(lineage(c),lineage(initial.meta))||initial.meta.epoch!==c.initialEpoch||initial.meta.lastAccountOperation!==null)throw fail('CHECKPOINT_LINEAGE');
  if(c.sourceKey===null){if(c.sourceRaw!==null||c.sourceContext!==null||initial.meta.source.key!=='fresh'||initial.meta.source.context!==null)throw fail('CHECKPOINT_SOURCE');}
  else {if(![V1,V2].includes(c.sourceKey))throw fail('CHECKPOINT_SOURCE');const old=parseRoot(c.sourceRaw,c.sourceKey===V2?2:1);if(!same(c.sourceContext,sourceContext(old,c.sourceKey))||initial.meta.source.key!==c.sourceKey||!same(initial.meta.source.context,c.sourceContext))throw fail('CHECKPOINT_SOURCE');
   // A retained source proves preservation, not merely compatible lineage. Never resume a damaged prepared candidate.
   if(!same(initial.profile,old.profile)||DOMAINS.some(k=>old[k]!==null&&!same(initial[k],old[k])))throw fail('CHECKPOINT_SOURCE_LOSS');
   const changed=['schemaVersion','protocolVersion','epoch','adoptionId','checkpointId','initialEpoch','source','lastAccountOperation','seedSnapshots'];
   for(const k of Object.keys(old.meta))if(!changed.includes(k)&&!same(initial.meta[k],old.meta[k]))throw fail('CHECKPOINT_SOURCE_LOSS');
   for(const k of Object.keys(old.meta.seedSnapshots)){const expected=k==='practitioner'?validateSeed(clone(old.meta.seedSnapshots[k])):old.meta.seedSnapshots[k];if(!same(initial.meta.seedSnapshots[k],expected))throw fail('CHECKPOINT_SOURCE_LOSS');}
  }
  return c;
 }
 function validated(a){
  if(a.root===null){if(a.marker!==null&&marker(a.marker).phase==='adopted')throw fail('STORAGE_STATE_REMOVED');throw fail(a.marker!==null||a.checkpoint!==null?'ADOPTION_RECOVERY_REQUIRED':'NOT_INITIALIZED');}
  if(a.marker===null||a.checkpoint===null)throw fail('ADOPTION_RECOVERY_REQUIRED');
  const m=marker(a.marker),c=checkpoint(a.checkpoint),s=parseRoot(a.root);
  if(!same(lineage(m),lineage(c))||!same(lineage(m),lineage(s.meta)))throw fail('ADOPTION_LINEAGE_MISMATCH');
  if(!same(s.meta.source,JSON.parse(c.initialRaw).meta.source))throw fail('ADOPTION_SOURCE_MISMATCH');
  if(m.phase!=='adopted')throw fail('ADOPTION_RECOVERY_REQUIRED');return s;
 }
 function read(){try{const s=validated(artifacts());error=null;return clone(s);}catch(e){error=e.code;throw e;}}
 function status(){return {protocolVersion:3,schemaVersion:3,key:KEY,mode:'synthetic',isSynthetic:true,persistent:!memory,writable:!closed&&(memory||!!(storage&&typeof storage.setItem==='function'&&locks&&typeof locks.request==='function')),error,capabilities:{coordinatedTransactions:true},notice:memory?'仅本页临时合成演示；关闭或刷新后不保留。':'合成演示 v3 独立分支；旧 v2 数据保留。'};}
 function emit(reason){let s=null;try{s=read();}catch(_){}listeners.forEach(fn=>{try{fn(s&&clone(s),{reason,state:s&&clone(s),status:status()});}catch(_){}});}
 function check(opts,s,revision=true){ensure();if(opts.signal&&opts.signal.aborted)throw fail('ABORTED');if(opts.guard){const yes=opts.guard();if(yes&&typeof yes.then==='function')throw fail('ASYNC_GUARD_NOT_ALLOWED');if(yes!==true)throw fail('STALE_PAGE');}if(s){if(!match(opts.context,ctx(s),false))throw fail('STALE_CONTEXT');if(revision&&opts.expectedRevision!==undefined&&opts.expectedRevision!==s.meta.revision)throw fail('STALE_REVISION');}}
 function optionsCopy(opts={},needContext=false){const c={guard:opts.guard,signal:opts.signal};if(c.guard!==undefined&&typeof c.guard!=='function')throw fail('INVALID_GUARD');if(needContext)c.context=context(opts.context);if(opts.expectedRevision!==undefined)c.expectedRevision=integer(opts.expectedRevision);if(opts.reason!==undefined){if(typeof opts.reason!=='string'||opts.reason.length>100)throw fail('INVALID_REASON');c.reason=opts.reason;}return c;}
 function exclusive(fn,opts){check(opts);if(mutating)throw fail('REENTRANT_TRANSACTION');const work=()=>{check(opts);return fn();};if(memory){const p=queue.then(work);queue=p.catch(()=>{});return p;}if(!storage||typeof storage.setItem!=='function'||!locks||typeof locks.request!=='function')return Promise.reject(fail('LOCK_UNAVAILABLE','not-committed'));try{return Promise.resolve(locks.request(KEY,{mode:'exclusive',signal:opts.signal},work)).catch(e=>{error=e.code||'LOCK_FAILED';throw e;});}catch(e){return Promise.reject(e);}}
 function write(k,next,previous){
  let thrown=false;try{if(memory)local.set(k,next);else storage.setItem(k,next);}catch(_){thrown=true;}
  let actual;try{actual=raw(k);}catch(_){throw fail('STORAGE_ACK_UNKNOWN','unknown');}
  if(actual===next)return;
  if(thrown&&actual===previous)throw fail('STORAGE_WRITE_FAILED','not-committed');
  throw fail('STORAGE_WRITE_UNVERIFIED','unknown');
 }
 function rootCommit(s,prior,reason,opts){
  verifyRoot(s);check(opts);if(opts.expectedRaw!==undefined&&raw(KEY)!==opts.expectedRaw)throw fail('STALE_REVISION');write(KEY,JSON.stringify(s),JSON.stringify(prior));
  const saved=ctx(s),proof={state:clone(s),committed:true,persistent:!memory};emit(reason);
  try{check(opts);}catch(cause){const e=fail('POST_COMMIT_LIFECYCLE');for(const k of ['message','code']){try{const d=cause&&Object.getOwnPropertyDescriptor(Object(cause),k);if(d&&own(d,'value')&&typeof d.value==='string')e[k]=d.value;}catch(_){}}e.outcome='committed';e.committed=true;e.commitContext=clone(saved);commitProofs.set(e,proof);throw e;}
  return clone(s);
 }
 function sourceContext(s,k){const m=s.meta;return k===V2?{mode:m.mode,accountId:m.accountId,protocolVersion:2,epoch:m.epoch,generation:m.generation,revision:m.revision}:{mode:m.mode,accountId:m.accountId,generation:m.generation,revision:m.revision};}
 function seed(s,t,all){DOMAINS.forEach(k=>{if(all||s[k]===null){const value=factories[k]({profile:clone(s.profile),meta:clone(s.meta),now:t,localDate:s.meta.seedDate});if(!plain(value))throw fail('INVALID_DOMAIN_SEED');json(value);s[k]=clone(value);if(all||!own(s.meta.seedSnapshots,k))s.meta.seedSnapshots[k]=clone(value);}else if(!own(s.meta.seedSnapshots,k)){const value=factories[k]({profile:clone(s.profile),meta:clone(s.meta),now:t,localDate:s.meta.seedDate});if(!plain(value))throw fail('INVALID_DOMAIN_SEED');json(value);s.meta.seedSnapshots[k]=clone(value);}});s.meta.seedSnapshots.practitioner=validateSeed(clone(s.meta.seedSnapshots.practitioner));}
 function prepare(){
  const t=stamp(),ids={adoptionId:id('adoption'),checkpointId:id('checkpoint'),initialEpoch:id('epoch')};
  let sourceKey=null,sourceRaw=null,old=null;
  if(!memory){const v2=raw(V2);if(v2!==null){sourceKey=V2;sourceRaw=v2;old=parseRoot(v2,2);}else {if(raw(V2+':adopted')!==null)throw fail('LEGACY_STATE_REMOVED');const v1=raw(V1);if(v1!==null){sourceKey=V1;sourceRaw=v1;old=parseRoot(v1,1);}}}
  const s=old?clone(old):{meta:{revision:0,generation:0,createdAt:new Date(t).toISOString(),updatedAt:new Date(t).toISOString(),seedDate:new Date(t+28800000).toISOString().slice(0,10),seedSnapshots:{}},profile:profile(),health:null,commerce:null,practitioner:null};
  const sc=old?sourceContext(old,sourceKey):null;
  Object.assign(s.meta,{schemaVersion:3,protocolVersion:3,mode:'synthetic',accountId:'demo-shen',isSynthetic:true,...ids,epoch:ids.initialEpoch,source:{key:sourceKey||'fresh',context:sc},lastAccountOperation:null});seed(s,t,false);verifyRoot(s);
  const c={protocolVersion:3,...ids,sourceKey,sourceRaw,sourceContext:sc,initialRaw:JSON.stringify(s)};const serialized=JSON.stringify(c);checkpoint(serialized);return {c,text:serialized};
 }
 function finish(c,opts){
  const reserved=JSON.stringify({protocolVersion:3,...lineage(c),phase:'reserved'}),adopted=JSON.stringify({protocolVersion:3,...lineage(c),phase:'adopted'});
  let a=artifacts();if(a.checkpoint!==JSON.stringify(c))throw fail('CHECKPOINT_CHANGED');
  if(a.marker===null){check(opts);write(MARKER,reserved,null);}else if(a.marker!==reserved)throw fail('ADOPTION_STATE_CHANGED');
  a=artifacts();if(a.root===null){check(opts);write(KEY,c.initialRaw,null);}else if(a.root!==c.initialRaw)throw fail('ADOPTION_STATE_CHANGED');
  check(opts);write(MARKER,adopted,reserved);let s;try{s=read();}catch(e){e.outcome='unknown';e.adoptionMarkerConfirmed=true;throw e;}emit('initialize');
  try{check(opts);}catch(e){e.outcome='committed';e.committed=true;e.commitContext=ctx(s);throw e;}
  return {state:s,value:null,committed:true,persistent:!memory};
 }
 function initialize(input){const opts=optionsCopy(input);return exclusive(()=>{const a=artifacts();if(Object.values(a).every(v=>v===null)){const p=prepare();check(opts);write(CHECKPOINT,p.text,null);return finish(p.c,opts);}const s=validated(a);return {state:clone(s),value:null,committed:false,persistent:!memory};},opts);}
 function transact(fn,input){const opts=optionsCopy(input,true),retryToken=input?.retryToken;
  if(retryToken!==undefined&&(!retryToken||typeof retryToken!=='object'||!Object.isFrozen(retryToken)))throw fail('INVALID_TRANSACTION_TOKEN');
  if(retryToken!==undefined&&opts.expectedRevision!==opts.context.revision)throw fail('TRANSACTION_REVISION_REQUIRED');if(typeof fn!=='function')throw fail('MUTATOR_REQUIRED');return exclusive(()=>{
  const prior=read(),retained=retryToken&&transactionAttempts.get(retryToken);
  if(retained){
   if(!same(retained.context,opts.context)||retained.expectedRevision!==opts.expectedRevision||retained.reason!==opts.reason)throw fail('TRANSACTION_TOKEN_CONFLICT');
   // Validate lifecycle and account generation, but never relax CAS for a new write.
   check(opts,prior,false);
   const actual=raw(KEY);
   if(actual===retained.nextRaw){check(opts);return {state:clone(retained.next),value:clone(retained.value),committed:false,operationCommitted:true,replayed:true,receiptRecovered:true,persistent:!memory};}
   if(actual!==retained.priorRaw)throw fail('TRANSACTION_ACK_UNRESOLVED','unknown');
   check(opts,prior);
   return {state:rootCommit(retained.next,prior,opts.reason||'transaction',{...opts,expectedRaw:retained.priorRaw}),value:clone(retained.value),committed:true,persistent:!memory};
  }
  check(opts,prior);const draft=clone(prior);let token,value;mutating=true;try{value=fn(draft,{noop:v=>(token={value:v===undefined?null:v})});}finally{mutating=false;}
  if(value&&typeof value.then==='function')throw fail('ASYNC_MUTATOR_NOT_ALLOWED');if(!same(draft.meta,prior.meta))throw fail('IMMUTABLE_META');verifyRoot(draft);check(opts,prior);
  if(token&&value===token){if(!same(draft,prior))throw fail('MUTATED_NOOP');json(token.value);return {state:clone(prior),value:clone(token.value),committed:false,persistent:!memory};}
  if(value===undefined)value=null;json(value);draft.meta.revision=integer(prior.meta.revision+1);draft.meta.updatedAt=new Date(stamp()).toISOString();
  let record;
  if(retryToken){
   // A distinct persisted attempt ID separates identical business effects. It is not authentication.
   if(transactionIds.size>=256)throw fail('TRANSACTION_ATTEMPT_CAPACITY');let uuid;try{uuid=typeof globalThis.crypto?.randomUUID==='function'?globalThis.crypto.randomUUID():null;}catch(_){}if(typeof uuid!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid))throw Object.assign(fail('TRANSACTION_ID_UNAVAILABLE'),{message:'当前页面无法生成安全操作标识，本次聊天未保存，填写已保留。请使用支持安全随机标识的浏览器安全页面重试。'});const attemptId='transaction-'+uuid;if(transactionIds.has(attemptId)||attemptId===prior.meta.lastTransactionAttempt?.id)throw fail('TRANSACTION_ID_REUSED');transactionIds.add(attemptId);
   draft.meta.lastTransactionAttempt={id:attemptId,from:ctx(prior),target:ctx(draft)};verifyRoot(draft);
   record={context:clone(opts.context),expectedRevision:opts.expectedRevision,reason:opts.reason,priorRaw:JSON.stringify(prior),nextRaw:JSON.stringify(draft),next:clone(draft),value:clone(value)};
  }
  try{const state=rootCommit(draft,prior,opts.reason||'transaction',opts);return {state,value:clone(value),committed:true,persistent:!memory};}
  catch(e){if(record&&e.outcome==='unknown')transactionAttempts.set(retryToken,record);throw e;}
 },opts);}
 function recoveryState(a){
  if(a.checkpoint===null)throw fail('RECOVERY_UNAVAILABLE');const c=checkpoint(a.checkpoint);
  if(a.marker!==null){const m=marker(a.marker);if(m.phase!=='reserved'||!same(lineage(m),lineage(c)))throw fail('RECOVERY_UNAVAILABLE');}
  if(a.root!==null&&(a.marker===null||a.root!==c.initialRaw))throw fail('RECOVERY_UNAVAILABLE');return c;
 }
 function oldBytes(){return memory?null:{v2:raw(V2),v2Marker:raw(V2+':adopted'),v1:raw(V1)};}
 function inspectRecovery(){ensure();const a=artifacts();let reason;try{validated(a);return {token:null,reason:'RECOVERY_NOT_REQUIRED',action:null};}catch(e){reason=e.code;}try{recoveryState(a);}catch(_){return {token:null,reason,action:null};}const token=Object.freeze({});if(recoveries.size>=8)throw fail('RECOVERY_TOKEN_CAPACITY');recoveries.set(token,{a,old:oldBytes()});return {token,reason,action:'resume-initial-adoption'};}
 function recoverAdoptionAsync(input={}){const opts=optionsCopy(input),token=input.token,choice=input.choice;return exclusive(()=>{const record=recoveries.get(token);if(!record||choice!=='resume-initial-adoption')throw fail('INVALID_RECOVERY_TOKEN');const a=artifacts();if(!same(a,record.a)||!same(oldBytes(),record.old))throw fail('STALE_RECOVERY');const c=recoveryState(a);const result=finish(c,opts);recoveries.delete(token);return result;},opts);}
 function operationIdentity(kind,k,c){return {kind,key:k,from:clone(c)};}
 function replay(s,identity,record){
  const receipt=s.meta.lastAccountOperation;
  if(record&&!same(record.identity,identity))throw fail('ACCOUNT_KEY_CONFLICT');
  if(!receipt||receipt.key!==identity.key)return null;
  if(receipt.kind!==identity.kind||!match(receipt.from,identity.from)||receipt.adoptionId!==s.meta.adoptionId)throw fail('ACCOUNT_KEY_CONFLICT');
  if(!match(receipt.target,ctx(s)))throw Object.assign(fail('ACCOUNT_COMMITTED_STATE_CHANGED','committed'),{committed:true,commitContext:clone(receipt.target)});
  if(record&&!same(s,record.next))throw fail('ACCOUNT_RECEIPT_STATE_CHANGED','unknown');
  return {state:clone(s),operationCommitted:true,replayed:true,committed:false,persistent:!memory,undoToken:identity.kind==='reset'&&record?record.token:null};
 }
 function remember(identity,prior,next,token){const cost=JSON.stringify(prior).length+JSON.stringify(next).length;const resetCount=Array.from(operations.values()).filter(r=>r.identity.kind==='reset').length;if(identity.kind==='reset'&&resetCount>=4||historySize+cost>HISTORY_MAX)throw fail('UNDO_CAPACITY');const record={identity,prior:clone(prior),next:clone(next),token};operations.set(identity.key,record);historySize+=cost;return record;}
 function nextReceipt(s,identity){s.meta.lastAccountOperation={...clone(identity),target:ctx(s),adoptionId:s.meta.adoptionId};}
 function nextEpoch(prior){const epoch=id('epoch');if(epoch===prior.meta.epoch||epoch===prior.meta.initialEpoch)throw fail('EPOCH_REUSED');return epoch;}
 function resetAsync(input={}){
  const opts=optionsCopy(input,true),k=key(input.key);if(opts.expectedRevision===undefined||opts.expectedRevision!==opts.context.revision)throw fail('RESET_REVISION_REQUIRED');const identity=operationIdentity('reset',k,opts.context);
  return exclusive(()=>{const prior=read();let record=operations.get(k);const repeated=replay(prior,identity,record);if(repeated){check(opts);return repeated;}check(opts,prior);
   if(!record){const t=stamp(),next=clone(prior);Object.assign(next.meta,{epoch:nextEpoch(prior),generation:integer(prior.meta.generation+1),revision:integer(prior.meta.revision+1),updatedAt:new Date(t).toISOString(),seedDate:new Date(t+28800000).toISOString().slice(0,10),seedSnapshots:{},lastAccountOperation:null});next.profile=profile();seed(next,t,true);nextReceipt(next,identity);verifyRoot(next);const token=Object.freeze({});record=remember(identity,prior,next,token);undos.set(token,record);}else if(!same(record.prior,prior))throw fail('STALE_REVISION');
   const state=rootCommit(record.next,prior,'reset',opts);return {state,operationCommitted:true,replayed:false,committed:true,persistent:!memory,undoToken:record.token};
  },opts);
 }
 function restoreAccountAsync(input={}){
  const opts=optionsCopy(input),k=key(input.key),token=input.token;
  return exclusive(()=>{const reset=undos.get(token);if(!reset)throw fail('INVALID_UNDO_TOKEN');const identity=operationIdentity('restore',k,ctx(reset.next)),prior=read();let record=operations.get(k);const repeated=replay(prior,identity,record);if(repeated){check(opts);return repeated;}
   if(!match(ctx(reset.next),ctx(prior))||!same(prior,reset.next))throw fail('STALE_UNDO');
   if(!record){const next=clone(reset.prior);Object.assign(next.meta,{...lineage(prior.meta),epoch:nextEpoch(prior),generation:integer(prior.meta.generation+1),revision:integer(prior.meta.revision+1),updatedAt:new Date(stamp()).toISOString(),source:clone(prior.meta.source)});nextReceipt(next,identity);verifyRoot(next);record=remember(identity,prior,next,null);}else if(!same(record.prior,prior))throw fail('STALE_UNDO');
   const state=rootCommit(record.next,prior,'restore',opts);return {state,operationCommitted:true,replayed:false,committed:true,persistent:!memory,undoToken:null};
  },opts);
 }
 const articleValidate=s=>{if(typeof o.validatePractitionerState!=='function')throw fail('ARTICLE_VALIDATOR_REQUIRED');o.validatePractitionerState(s.practitioner);};
 const articleTokens=new WeakMap(),articleKeys=[0,1,2].map(i=>KEY+':article-recovery:'+i);
 function articleRows(prior){const rows=articleKeys.map((k,slot)=>{const value=raw(k);if(value===null)return {slot,raw:null};let item;try{item=JSON.parse(value);}catch(_){throw fail('ARTICLE_ARCHIVE_CORRUPT');}
  if(value.length>MAX+2000||!plain(item)||Object.keys(item).sort().join(',')!=='format,operation,selection,sha256,state'||item.format!=='article-recovery-v2')throw fail('ARTICLE_ARCHIVE_INVALID');json(item);if(typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256)||articleSha256(JSON.stringify({format:item.format,operation:item.operation,selection:item.selection,state:item.state}))!==item.sha256)throw fail('ARTICLE_ARCHIVE_INTEGRITY');key(item.operation);verifyRoot(item.state);articleValidate(item.state);
  if(!same(lineage(item.state.meta),lineage(prior.meta))||!same(item.state.meta.source,prior.meta.source)||!['checkpoint','0','1','2'].includes(item.selection))throw fail('ARTICLE_ARCHIVE_LINEAGE');return {slot,raw:value,item};});const ids=rows.filter(r=>r.item).map(r=>r.item.operation);if(new Set(ids).size!==ids.length)throw fail('ARTICLE_ARCHIVE_DUPLICATE');return rows;}
 function listArticleArchives(){const prior=read();articleValidate(prior);return articleRows(prior).filter(r=>r.item).map(r=>{const token=Object.freeze({});articleTokens.set(token,{slot:r.slot,raw:r.raw,adoptionId:prior.meta.adoptionId});return {slot:r.slot,token,generation:r.item.state.meta.generation,revision:r.item.state.meta.revision,schema:r.item.state.practitioner?.registration?.schema||'legacy',updatedAt:r.item.state.meta.updatedAt};});}
 function restoreArticleAsync(input={}){
  const opts=optionsCopy(input,true),k=key(input.key),selected=input.token===undefined?null:articleTokens.get(input.token);if(input.token!==undefined&&!selected)throw fail('ARTICLE_SELECTION_EXPIRED');
  const selection=selected?String(selected.slot):'checkpoint',identity=operationIdentity('restore',k,opts.context);
  return exclusive(()=>{const prior=read();articleValidate(prior);const rows=articleRows(prior),existing=rows.find(r=>r.item?.operation===k);if(existing&&existing.item.selection!==selection)throw fail('ACCOUNT_KEY_CONFLICT');
   const repeated=replay(prior,identity,null);if(repeated){if(!existing)throw fail('ARTICLE_BACKUP_MISSING');check(opts);return repeated;}check(opts,prior);
   let target;if(selected){const r=rows[selected.slot];if(selected.adoptionId!==prior.meta.adoptionId||r.raw!==selected.raw)throw fail('ARTICLE_ARCHIVE_CHANGED');target=clone(r.item.state);}else{const j=prior.practitioner?.registration;if(j?.schema!=='native-registration-v2'||!j.checkpoint)throw fail('ARTICLE_CHECKPOINT_UNAVAILABLE');target=JSON.parse(j.checkpoint);}
   verifyRoot(target);articleValidate(target);if(!same(lineage(target.meta),lineage(prior.meta))||!same(target.meta.source,prior.meta.source))throw fail('ARTICLE_CHECKPOINT_LINEAGE');
   if(existing&&!same(existing.item.state,prior))throw fail('ACCOUNT_KEY_CONFLICT');const slot=existing||rows.find(r=>r.raw===null);if(!slot)throw fail('ARTICLE_ARCHIVES_FULL');
   const payload={format:'article-recovery-v2',operation:k,selection,state:prior},backup=JSON.stringify({...payload,sha256:articleSha256(JSON.stringify(payload))});if(backup.length>MAX+2000)throw fail('ARTICLE_ARCHIVE_CAPACITY');
   check(opts,read());if(!existing)write(articleKeys[slot.slot],backup,null);if(raw(articleKeys[slot.slot])!==backup)throw fail('ARTICLE_BACKUP_UNVERIFIED');check(opts,read());
   Object.assign(target.meta,{...lineage(prior.meta),epoch:nextEpoch(prior),generation:integer(prior.meta.generation+1),revision:integer(prior.meta.revision+1),updatedAt:new Date(stamp()).toISOString(),source:clone(prior.meta.source)});nextReceipt(target,identity);verifyRoot(target);
   return {state:rootCommit(target,prior,'article-restore',{...opts,expectedRaw:JSON.stringify(prior)}),operationCommitted:true,replayed:false,committed:true,persistent:!memory,backupSlot:slot.slot};
  },opts);
 }
 function onStorage(event){if(!closed&&event&&(event.key===null||[KEY,MARKER,CHECKPOINT].includes(event.key)))emit('external-change');}
 if(o.eventTarget&&typeof o.eventTarget.addEventListener==='function')o.eventTarget.addEventListener('storage',onStorage);
 const asyncOnly=()=>{throw fail('ASYNC_REQUIRED');};
 const api=Object.freeze({protocolVersion:3,read,context:()=>Object.freeze(ctx(read())),current:c=>{try{return !closed&&match(context(c),ctx(read()),false);}catch(_){return false;}},status,initialize,transact,resetAsync,restoreAccountAsync,listArticleArchives,restoreArticleAsync,inspectRecovery,recoverAdoptionAsync,
  update:asyncOnly,reset:asyncOnly,registerDomain:asyncOnly,
  subscribe(fn){ensure();if(typeof fn!=='function')throw fail('LISTENER_REQUIRED');listeners.add(fn);return ()=>listeners.delete(fn);},
  dispose(){closed=true;listeners.clear();recoveries.clear();operations.clear();undos.clear();local.clear();if(o.eventTarget&&typeof o.eventTarget.removeEventListener==='function')o.eventTarget.removeEventListener('storage',onStorage);}
 });
 receiptReaders.set(api,error=>{const proof=commitProofs.get(error);return proof?clone(proof):null;});return api;
}
return Object.freeze({create,commitReceipt,STORAGE_KEY:KEY,MARKER_KEY:MARKER,CHECKPOINT_KEY:CHECKPOINT,buildId:'registration-core-v3-batch-b'});
});
