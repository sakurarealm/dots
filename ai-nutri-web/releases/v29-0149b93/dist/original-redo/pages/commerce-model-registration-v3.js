/* C1 inactive protocol-3 adaptation of the complete offline synthetic commerce model. */
(function(g){'use strict';
const KEY='nutri:synthetic:v3:demo-shen', clone=x=>JSON.parse(JSON.stringify(x));
const assert=(x,m)=>{if(!x)throw Error(m);};
// Only these explicit pre-write inviter validations are transient business refusals.
const businessAssert=(x,m)=>{if(!x)throw Object.assign(Error(m),{code:'COMMERCE_BUSINESS_REJECTION',businessSource:'commerce:bindInviter',outcome:'not-committed'});};
const amount=(n,signed=false)=>{assert(Number.isSafeInteger(n)&&(signed||n>=0),'金额或数量必须是安全整数且不可为负');return n;};
function validate(s){s.products.forEach(p=>{amount(p.priceCents);amount(p.stock);});s.coupons.forEach(c=>{amount(c.threshold);amount(c.value);});s.orders.forEach(o=>{['subtotal','discount','shipping','payable'].forEach(k=>amount(o[k]));});s.ledger.forEach(l=>amount(l.cents,true));return s;}
function initial(catalog){return {schema:1,revision:0,sequence:0,mode:'synthetic',user:{id:'demo-shen',name:'沈先生'},products:clone(catalog),cart:[],addresses:[{id:'demo-address',name:'沈先生',phone:'演示号码',address:'演示省 演示市 营养路 1 号（虚构）',isDefault:true}],orders:[],coupons:[{id:'WELCOME10',title:'演示满 100 减 10',threshold:10000,value:1000,status:'available'}],referral:{code:'DEMO-SHEN',inviter:null,invitees:[],basisPoints:500,notice:'演示规则：实付商品金额 × 5%，向下取整到分；完成订单后可结算，退款全额冲回。仅模拟记账，不构成真实收益。'},ledger:[],receipts:{},audit:[]};}
const CTX=['mode','accountId','protocolVersion','epoch','generation','revision'];
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
const equalContext=(a,b,revision=true)=>!!a&&!!b&&CTX.every(k=>(!revision&&k==='revision')||a[k]===b[k]);
function frozenIntent(raw){
 assert(raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.isFrozen(raw)&&Object.isFrozen(raw.context),'DISPLAY_INTENT_REQUIRED');
 assert(Object.keys(raw).every(k=>['context','revision','guard'].includes(k))&&Number.isSafeInteger(raw.revision)&&raw.revision>=0,'INVALID_DISPLAY_INTENT');
 const c=raw.context;assert(c&&Object.keys(c).length===6&&CTX.every(k=>Object.prototype.hasOwnProperty.call(c,k)),'INVALID_DISPLAY_CONTEXT');
 assert(c.mode==='synthetic'&&c.accountId==='demo-shen'&&c.protocolVersion===3&&typeof c.epoch==='string'&&c.epoch.length>0&&c.epoch.length<=160&&Number.isSafeInteger(c.generation)&&c.generation>=0&&Number.isSafeInteger(c.revision)&&c.revision>=0,'INVALID_DISPLAY_CONTEXT');
 assert(raw.guard===undefined||typeof raw.guard==='function','INVALID_DISPLAY_GUARD');
 return Object.freeze({context:deepFreeze(clone(c)),revision:raw.revision,guard:raw.guard});
}
function createEngine(options){
 const o=options||{},catalog=o.catalog||g.NutriCommerceCatalog||[],store=o.store||g.NutriDemo;
 assert(store&&store.protocolVersion===3&&['read','context','status','defineDomain','initialize','transact'].every(k=>typeof store[k]==='function'),'V3_COMMERCE_STORE_REQUIRED');
 const status=store.status();assert(status.protocolVersion===3&&status.key===KEY&&status.mode==='synthetic'&&status.isSynthetic===true&&status.capabilities?.coordinatedTransactions===true,'V3_COMMERCE_CAPABILITY_REQUIRED');
 let active=true,lastVerified=null;const allowed=()=>active&&(!o.guard||o.guard()===true);
 store.defineDomain('commerce',()=>initial(catalog));const ready=store.initialize({domains:['commerce'],guard:allowed});
 function read(){assert(allowed(),'COMMERCE_PAGE_RETIRED');const s=store.read().commerce;assert(s&&s.schema===1,'存储版本不兼容，请保留数据并联系维护者');return validate(s);}
 function transact(key,action,fn,expected,intent){
  assert(typeof key==='string'&&key.length>=4&&key.length<=200,'缺少幂等请求号');
  assert(allowed(),'COMMERCE_PAGE_RETIRED');
  const request={action,context:clone(intent.context),revision:intent.revision,input:clone(intent.input)};
  return store.transact((root,tx)=>{
   const s=validate(root.commerce);
   assert(equalContext(intent.context,root.meta,false),'COMMERCE_STALE_CONTEXT');
   assert(intent.context.revision<=root.meta.revision,'COMMERCE_FUTURE_INTENT');
   const receipt=Object.prototype.hasOwnProperty.call(s.receipts,key)&&s.receipts[key];
   if(receipt){assert(receipt.action===action&&JSON.stringify(receipt.request)===JSON.stringify(request),'请求号已被其他操作或输入使用');return tx.noop(clone(receipt.result));}
   if(expected!==undefined)assert(expected===s.revision,'数据已更新，请刷新后重试');
   const result=fn(s);validate(s);s.revision++;s.audit.push({revision:s.revision,action,key});
   s.receipts[key]={action,request,result:clone(result)};return result;
  },{context:intent.context,guard:()=>allowed()&&(!intent.guard||intent.guard()===true),reason:'commerce:'+action.slice(0,85)}).then(r=>{
   // This proof comes from B's actual returned transaction state, never intent revision + 1.
   const receipt=r?.state?.commerce?.receipts?.[key];
   if(typeof r?.committed!=='boolean'||!receipt||receipt.action!==action||JSON.stringify(receipt.request)!==JSON.stringify(request)||JSON.stringify(receipt.result)!==JSON.stringify(r.value))throw Object.assign(Error('COMMERCE_RECEIPT_UNVERIFIED'),{outcome:'unknown'});
   let resultIntent;
   try{resultIntent=frozenIntent(deepFreeze({context:Object.fromEntries(CTX.map(k=>[k,r.state.meta[k]])),revision:r.state.commerce.revision}));}catch(_){throw Object.assign(Error('COMMERCE_RECEIPT_UNVERIFIED'),{outcome:'unknown'});}
   if(!equalContext(intent.context,resultIntent.context,false)||resultIntent.context.revision<intent.context.revision)throw Object.assign(Error('COMMERCE_RECEIPT_UNVERIFIED'),{outcome:'unknown'});
   lastVerified=deepFreeze({key,request:clone(request),context:clone(resultIntent.context),committed:r.committed,persistent:r.persistent===true});
   return clone(r.value);
  });
 }
function total(s,couponId){assert(s.cart.length,'购物车为空');const items=s.cart.map(i=>{const p=s.products.find(p=>p.id===i.id);assert(p&&p.listed&&p.status==='approved','商品未上架或审核未通过');assert(Number.isInteger(i.qty)&&i.qty>0&&i.qty<=p.stock,'商品库存不足');return {id:p.id,name:p.name,priceCents:p.priceCents,qty:i.qty};});const subtotal=items.reduce((n,i)=>amount(n+amount(i.priceCents*i.qty)),0);let discount=0;if(couponId){const c=s.coupons.find(c=>c.id===couponId);assert(c&&c.status==='available'&&subtotal>=c.threshold,'优惠券不可用或未达门槛');discount=Math.min(c.value,subtotal);}return {items,subtotal,discount,shipping:0,payable:subtotal-discount,couponId:couponId||null};}
function snapshot(){assert(allowed(),'COMMERCE_PAGE_RETIRED');const root=store.read(),state=clone(validate(root.commerce)),m=root.meta;return deepFreeze({state,intent:{context:Object.fromEntries(CTX.map(k=>[k,m[k]])),revision:state.revision}});}
const api={ready,snapshot,capture:()=>snapshot().intent,dispose:()=>{active=false;lastVerified=null;},lastReceipt:(key,display)=>{
 assert(allowed(),'COMMERCE_PAGE_RETIRED');const intent=frozenIntent(display);
 if(!lastVerified||lastVerified.key!==key||lastVerified.request.revision!==intent.revision||!equalContext(lastVerified.request.context,intent.context))return null;
 return deepFreeze(clone(lastVerified));
},key:KEY,read:()=>clone(read()),quote:(coupon,state)=>total(state||read(),coupon),
 cartDelta:(id,delta,key,intent)=>transact(key,'cart-delta:'+id+':'+delta,s=>{assert(delta===1||delta===-1,'数量增减无效');const p=s.products.find(p=>p.id===id);assert(p&&p.listed&&p.status==='approved','商品不可购买');const qty=(s.cart.find(i=>i.id===id)?.qty||0)+delta;assert(qty>=0&&qty<=p.stock,'数量超出库存');s.cart=s.cart.filter(i=>i.id!==id);if(qty)s.cart.push({id,qty});return s.cart;},undefined,intent),
 cart:(id,qty,key,intent)=>transact(key,'cart:'+id+':'+qty,s=>{const p=s.products.find(p=>p.id===id);assert(p&&p.listed&&p.status==='approved','商品不可购买');assert(Number.isInteger(qty)&&qty>=0&&qty<=p.stock,'数量超出库存');s.cart=s.cart.filter(i=>i.id!==id);if(qty)s.cart.push({id,qty});return s.cart;},intent.revision,intent),
 address:(address,key,intent)=>transact(key,'address:'+JSON.stringify(address),s=>{assert(address.name&&address.address&&address.phone,'请填写收件人、电话和完整地址');assert(address.name.length<=50&&address.address.length<=200&&address.phone.length<=30,'地址字段过长');const a={id:address.id||'ADDR-'+(++s.sequence),name:address.name,phone:address.phone,address:address.address,isDefault:!!address.isDefault};if(a.isDefault)s.addresses.forEach(x=>x.isDefault=false);s.addresses=s.addresses.filter(x=>x.id!==a.id);s.addresses.push(a);if(!s.addresses.some(x=>x.isDefault))a.isDefault=true;return a;},intent.revision,intent),
 checkout:(addressId,coupon,key,revision,intent)=>transact(key,'checkout:'+addressId+':'+(coupon||''),s=>{const a=s.addresses.find(a=>a.id===addressId);assert(a,'请先选择地址');const q=total(s,coupon);q.items.forEach(i=>s.products.find(p=>p.id===i.id).stock-=i.qty);if(coupon)s.coupons.find(c=>c.id===coupon).status='reserved';const order={id:'DEMO-'+String(++s.sequence).padStart(6,'0'),...q,address:clone(a),status:'pending',referrer:s.referral.inviter,commissionRateBps:s.referral.basisPoints,synthetic:true};s.orders.unshift(order);s.cart=[];return order;},revision,intent),
 transition:(id,to,key,intent)=>transact(key,'order:'+id+':'+to,s=>{const order=s.orders.find(x=>x.id===id);assert(order,'订单不存在');const edges={pending:['paid','cancelled'],paid:['shipped','refunded'],shipped:['completed','refunded'],completed:['refunded']};assert(edges[order.status]&&edges[order.status].includes(to),'订单状态已变化或不允许此操作');const previous=order.status;order.status=to;if(to==='paid'){s.ledger.push({type:'payment',orderId:id,cents:-order.payable});if(order.couponId)s.coupons.find(c=>c.id===order.couponId).status='used';}if(to==='completed'&&order.referrer){s.ledger.push({type:'commission',orderId:id,cents:Math.floor(amount(order.payable*order.commissionRateBps)/10000),beneficiary:order.referrer});}if(to==='cancelled'||to==='refunded'){order.items.forEach(i=>s.products.find(p=>p.id===i.id).stock+=i.qty);if(order.couponId)s.coupons.find(c=>c.id===order.couponId).status='available';if(to==='refunded'){s.ledger.push({type:'refund',orderId:id,cents:order.payable});if(previous==='completed'&&order.referrer)s.ledger.push({type:'commission_reversal',orderId:id,cents:-Math.floor(amount(order.payable*order.commissionRateBps)/10000),beneficiary:order.referrer});}}return order;},intent.revision,intent),
 bindInviter:(code,key,intent)=>transact(key,'inviter:'+code,s=>{if(s.referral.inviter===code)return code;businessAssert(!s.referral.inviter,'邀请关系已绑定，不能重复更改');businessAssert(/^DEMO-[A-Z0-9]{3,20}$/.test(code)&&code!==s.referral.code,'请输入其他演示邀请码，如 DEMO-FRIEND');businessAssert(!s.orders.some(o=>o.status!=='cancelled'),'首次下单前才能绑定');s.referral.inviter=code;return code;},intent.revision,intent),
 saveProduct:(input,key,intent)=>transact(key,'product-save:'+JSON.stringify(input),s=>{assert(input.name&&input.name.length<=80&&input.spec&&input.category,'请填写商品名称、规格、类别');amount(input.priceCents);amount(input.stock);const existing=s.products.find(p=>p.id===input.id);const p={...(existing||{}),id:existing?existing.id:'MERCHANT-'+(++s.sequence),name:input.name,spec:input.spec,category:input.category,priceCents:input.priceCents,stock:input.stock,description:String(input.description||'待商家补充'),manufacturer:String(input.manufacturer||'待核验'),ingredients:String(input.ingredients||'待核验'),qualification:String(input.qualification||'待核验'),shelfLife:String(input.shelfLife||'待核验'),image:null,imageStatus:'原商品图片待恢复',source:'商家本地演示录入',status:'pending',listed:false};s.products=s.products.filter(x=>x.id!==p.id);s.products.push(p);return p;},intent.revision,intent),
 referralExample:(refund,key,intent)=>transact(key,'referral-example:'+refund,s=>{const id='FICTIONAL-REFERRAL-EXAMPLE';const row=s.ledger.find(l=>l.orderId===id&&l.type==='commission');if(!refund){assert(!row,'虚构结算示例已生成');s.referral.examples=[{id:'FICTIONAL-A',name:'虚构体验者 A',isSynthetic:true,consent:'仅虚构情境，不代表真实授权',paidCents:11990,refunded:false}];s.ledger.push({type:'commission',orderId:id,cents:599,beneficiary:s.referral.code,isSynthetic:true});}else{assert(row&&!s.ledger.some(l=>l.orderId===id&&l.type==='commission_reversal'),'请先生成示例或退款已完成');s.referral.examples[0].refunded=true;s.ledger.push({type:'commission_reversal',orderId:id,cents:-599,beneficiary:s.referral.code,isSynthetic:true});}return s.referral.examples;},intent.revision,intent),
 reviewProduct:(id,status,listed,key,intent)=>transact(key,'review:'+id+':'+status+':'+listed,s=>{assert(['pending','approved','rejected'].includes(status),'审核状态错误');assert(!listed||status==='approved','仅审核通过商品可以上架');const p=s.products.find(p=>p.id===id);assert(p,'商品不存在');p.status=status;p.listed=!!listed;return p;},intent.revision,intent),
 summary:state=>{const s=state||read();return {inviter:s.referral.inviter,inviteCode:s.referral.code,invitees:clone(s.referral.invitees),ownConsumption:s.orders.filter(o=>['paid','shipped','completed'].includes(o.status)).reduce((n,o)=>amount(n+o.payable),0),earnedCommission:s.ledger.filter(l=>l.beneficiary===s.referral.code).reduce((n,l)=>amount(n+l.cents,true),0),rule:s.referral.notice};},
 live:{configured:false,checkout:async()=>{throw Error('真实支付、订单与佣金服务尚未配置；不会发起付款');}}};
 // Capture complete call arguments before the store can queue or await a lock.
 const writers={cartDelta:3,cart:3,address:2,checkout:4,transition:3,bindInviter:2,saveProduct:2,referralExample:2,reviewProduct:4};
 for(const [name,index] of Object.entries(writers)){
  const operation=api[name];api[name]=function(...args){
   lastVerified=null;
   const intent=frozenIntent(args[index]),params=deepFreeze(clone(args.slice(0,index)));
   if(name==='checkout')assert(params[3]===intent.revision,'CHECKOUT_QUOTE_INTENT_MISMATCH');
   return operation(...params,Object.freeze({...intent,input:params}));
  };
 }
 return Object.freeze(api);
}
g.NutriCommerce=Object.freeze({createEngine,initial,storageKey:KEY,buildId:'commerce-model-registration-v3-c1'});if(typeof module!=='undefined')module.exports=g.NutriCommerce;
})(typeof window!=='undefined'?window:globalThis);
