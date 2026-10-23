/* C1 inactive complete commerce pages. Registered only after all declarations. */
(function(g){'use strict';
const entry=g.NutriRegistrationEntry;
if(!entry||entry.buildId!=='registration-entry-v3-c1'||typeof entry.register!=='function')throw Error('REGISTRATION_ENTRY_REQUIRED');
let mounted=false;
async function mount(){
 if(mounted)return;mounted=true;
 let model,active=true,unsubscribe=()=>{},unsubscribeEntry=()=>{};
 const root=document.getElementById('commerce-root'),status=document.getElementById('commerce-status'),page=document.body.dataset.commercePage;
 if(!root||!status||!['shop','orders','wallet','address'].includes(page))throw Error('COMMERCE_ROOT_REQUIRED');
 const store=g.NutriDemo,CTX=['mode','accountId','protocolVersion','epoch','generation','revision'];
 const same=(a,b)=>!!a&&!!b&&CTX.every(k=>a[k]===b[k]);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>'¥'+(n/100).toFixed(2);
 const note='<div class="notice">本地合成演示 · 沈先生。所有订单、金额、配送及推荐关系均为模拟数据；无真实支付、发货或收益。请勿填写真实个人资料。</div>';
 g.addEventListener('pagehide',()=>{active=false;unsubscribe();unsubscribeEntry();if(model)model.dispose();});
 root.textContent='正在等待共享合成账号…';
 try{model=g.NutriCommerce.createEngine({guard:()=>active});await model.ready;if(!active)return;}
 catch(error){if(active){root.innerHTML='<p class="notice">演示结果尚未核对，现有数据保留。可通过账号入口重新读取，或重新打开本页再核对。</p><a href="'+page+'.html">重新打开并核对</a>';status.textContent=error.message;}return;}
const incomingRef=new URLSearchParams(location.search).get('ref')||'',validIncoming=/^DEMO-[A-Z0-9]{3,20}$/.test(incomingRef)?incomingRef:'';
function shareLink(code){const u=new URL('wallet.html',location.href);u.searchParams.set('ref',code);return u.href;}
let category='全部',search='',detail=null,coupon='',addressId='';
let editing=null,formIntent=null,quoteIntent=null,viewIntent=null,viewState=null,formDirty=false,busy=false,editor=0,renderSerial=0,renderToken=0,renderEditor=0;
const labels={pending:'待支付',paid:'待发货',shipped:'待收货',completed:'已完成',cancelled:'已取消',refunded:'已退款'},ledgerLabels={payment:'模拟支付',refund:'模拟退款',commission:'推荐佣金入账',commission_reversal:'退款冲回佣金'};
const btn=(text,action,id='',cls='')=>`<button class="${cls}" data-view="${renderToken}" data-action="${action}" data-id="${esc(id)}">${text}</button>`;
function picture(p){const skuImage=window.NutriCommerceProductIllustrations?.[String(p.id)];if(skuImage&&/^images\/commerce\/products\/sku-[0-9]+-original-v[0-9]+\.png$/.test(skuImage))return `<figure class="product-illustration product-illustration-sku"><img src="${esc(skuImage)}" loading="lazy" decoding="async" alt="${esc(p.name)}原创演示商品图，非实物照；图中意象不代表真实配料"><figcaption>原创演示商品图 · 非实物照</figcaption></figure>`;const image=window.NutriCommerceIllustrations?.[p.category];if(image&&/^images\/commerce\/[a-z0-9-]+\.(png|svg|webp)$/.test(image))return `<figure class="product-illustration"><img src="${esc(image)}" alt="${esc(p.category)}原创类别说明图，非实物商品照"><figcaption>原创类别说明图 · 原商品照待恢复</figcaption></figure>`;return `<div class="product-picture" role="img" aria-label="${esc(p.name)}：原商品图片待恢复"><b>◻</b><span>原商品图片待恢复</span></div>`;}
function shop(s){if(detail&&!s.products.some(p=>p.id===detail))detail=null;const categories=['全部',...new Set(s.products.map(p=>p.category))];if(detail){const p=s.products.find(p=>p.id===detail);return note+btn('‹ 返回商品列表','close','','secondary')+`<article class="card"><h1>${esc(p.name)}</h1>${picture(p)}<p class="price">${money(p.priceCents)} <small>演示价</small></p><dl class="detail-facts"><dt>生产商</dt><dd>${esc(p.manufacturer||'待核验')}</dd><dt>配料表</dt><dd>${esc(p.ingredients||'待核验')}</dd><dt>商品资质</dt><dd>${esc(p.qualification||'待核验')}</dd><dt>保质期</dt><dd>${esc(p.shelfLife||'待核验')}</dd><dt>原规格</dt><dd>${esc(p.spec)}</dd><dt>类别</dt><dd>${esc(p.category)}</dd><dt>演示库存</dt><dd>${p.stock} 件</dd><dt>审核状态</dt><dd>${p.status==='approved'?'演示审核通过':'待审核或未通过'} · ${p.listed?'演示上架':'已下架'}</dd></dl><p>${esc(p.description)}</p><p class="notice">规格来自原项目，不能用于剂量或疗效判断。真实商品需补齐标签、资质与审核记录后才能销售。原创演示图中的包装与装饰意象不代表真实外观、配料、剂量或生产商。</p>${btn('加入演示购物车','add',p.id)} <a href="#cart" data-view="${renderToken}" data-action="close">查看购物车</a><details><summary>商品来源与评价</summary><p>资料来源：原项目 shop.products。没有真实购买评价；不会生成虚假销量或好评。</p><p>供应商、配料表、营养标签及商品原图：待恢复与审核。</p></details></article>`;}
const products=s.products.filter(p=>p.listed&&p.status==='approved'&&(category==='全部'||p.category===category)&&p.name.includes(search));let quote=null;try{quote=model.quote(coupon,s);}catch(e){if(coupon){coupon='';try{quote=model.quote('',s);}catch(_){}}}
return `<section class="hero"><small>AI-NUTRI / EVERYDAY NUTRITION</small><h1>认真挑选，每一份营养</h1><p>原项目 40 款商品资料 · 透明的订单与权益</p></section>${note}<div class="row"><h2>自选商品</h2><a href="commerce-admin.html">演示商家/审核台</a><a href="#cart">购物车 · ${s.cart.reduce((n,i)=>n+i.qty,0)}</a></div><div class="toolbar"><input id="product-search" aria-label="搜索商品" placeholder="搜索维生素、蛋白质…" value="${esc(search)}"><span class="muted">${products.length} 款</span></div><div class="chips">${categories.map(c=>btn(esc(c),'category',c,'secondary '+(category===c?'active':''))).join('')}</div><section class="grid">${products.map(p=>`<article class="card">${picture(p)}<h3>${esc(p.name)}</h3><small>${esc(p.spec)}</small><div class="price">${money(p.priceCents)}</div><small>演示库存 ${p.stock}</small><div class="product-actions">${btn('详情','detail',p.id,'secondary')}${btn('加入','add',p.id)}</div></article>`).join('')||'<p class="empty">未找到匹配商品，换个关键词试试。</p>'}</section><section id="cart" class="card anchor"><h2>演示购物车</h2>${s.cart.map(i=>{const p=s.products.find(p=>p.id===i.id);return `<div class="cart-line"><div class="cart-product">${picture(p)}<div><b>${esc(p.name)}</b><p>${money(p.priceCents*i.qty)}</p></div></div><div class="qty">${btn('−','minus',i.id,'secondary')}<span>${i.qty}</span>${btn('+','add',i.id,'secondary')}</div></div>`;}).join('')||'<p class="empty">购物车还是空的，先挑选一件商品吧。</p>'}${quote?`<label>配送地址<select id="checkout-address">${s.addresses.map(a=>`<option value="${esc(a.id)}" ${(addressId||s.addresses.find(a=>a.isDefault)?.id)===a.id?'selected':''}>${esc(a.name)} · ${esc(a.address)}</option>`).join('')}</select></label><a href="address.html">管理演示地址</a><label>优惠券<select id="checkout-coupon"><option value="">不使用</option>${s.coupons.filter(c=>c.status==='available').map(c=>`<option value="${esc(c.id)}" ${coupon===c.id?'selected':''}>${esc(c.title)}${quote.subtotal<c.threshold?'（未达门槛）':''}</option>`).join('')}</select></label><p>商品 ${money(quote.subtotal)} − 优惠 ${money(quote.discount)} + 演示运费 ¥0.00</p><div class="row"><strong>合计 ${money(quote.payable)}</strong>${btn('创建演示订单','checkout')}</div><p class="muted">创建后锁定库存与优惠券；取消或退款会恢复。实际运费和交易条款待后端配置。</p>`:''}</section>`;}
function orders(s){return note+`<h1>我的订单</h1><p class="steps">创建 → 模拟支付 → 模拟发货 → 确认收货；退款同步冲回优惠与佣金。</p>${s.orders.map(o=>`<article class="card"><div class="row"><b>${esc(o.id)}</b><span class="badge">${labels[o.status]}</span></div>${o.items.map(i=>`<p>${esc(i.name)} × ${i.qty}<span> · ${money(i.qty*i.priceCents)}</span></p>`).join('')}<p class="muted">${esc(o.address.name)} · ${esc(o.address.address)}</p><p>商品 ${money(o.subtotal)} − 优惠 ${money(o.discount)} = <b>${money(o.payable)}</b></p><p class="muted">推荐人 ${esc(o.referrer||'未绑定')} · 全额退款</p><div class="row">${o.status==='pending'?btn('取消订单','cancelled',o.id,'secondary')+btn('模拟支付','paid',o.id):''}${o.status==='paid'?btn('模拟发货','shipped',o.id):''}${o.status==='shipped'?btn('确认演示收货','completed',o.id):''}${['paid','shipped','completed'].includes(o.status)?btn('模拟全额退款','refunded',o.id,'danger'):''}</div><details><summary>此订单流水</summary>${s.ledger.filter(l=>l.orderId===o.id).map(l=>`<p>${ledgerLabels[l.type]} ${money(l.cents)}${l.beneficiary?' · 受益人 '+esc(l.beneficiary):''}</p>`).join('')||'<p>暂无资金流水。</p>'}</details></article>`).join('')||'<div class="card empty"><h2>还没有演示订单</h2><a href="shop.html">去商城挑选</a></div>'}`;}
function wallet(s){const sum=model.summary(s),hasBlockingOrder=s.orders.some(o=>o.status!=='cancelled'),canBind=!sum.inviter&&!hasBlockingOrder;return note+`${incomingRef?'<div class="notice">'+(validIncoming?'收到演示邀请码 '+esc(validIncoming)+'。'+(canBind?'请检查后在下方确认绑定；':sum.inviter?'已绑定邀请人，不能更改关系；':'当前不符合绑定条件，请查看下方原因；')+'打开链接不会自动建立关系。':'此链接的邀请码格式无效，未绑定。')+'</div>':''}<section class="hero"><small>沈先生 · 推荐权益</small><h1>分享有据，收益清楚</h1><div class="numbers"><div><small>本人净消费 · 演示</small><b>${money(sum.ownConsumption)}</b></div><div><small>本人佣金 · 演示</small><b>${money(sum.earnedCommission)}</b></div></div></section><article class="card"><h2>我的邀请码</h2><div class="row"><strong>${esc(sum.inviteCode)}</strong>${btn('显示分享内容','share','','secondary')}</div><div id="share-text" hidden><p>邀请你体验 AI-Nutri 演示。演示邀请码：${esc(sum.inviteCode)}。</p><label>可复制演示链接<input readonly aria-label="演示邀请链接" value="${esc(shareLink(sum.inviteCode))}"></label><p class="muted">链接仅在接收者能够访问此站点时可用。当前固定沈先生演示账号不能绑定自己的邀请码；符合下方绑定条件时，可用 DEMO-FRIEND 验证其他演示邀请人的流程。真实跨账户归因未接入。</p></div><p class="muted">仅生成本地可复制内容，不会向任何人自动发送。</p><p>邀请人：<b>${esc(sum.inviter||'尚未绑定')}</b></p>${!sum.inviter?'<p id="inviter-eligibility" class="'+(hasBlockingOrder?'notice':'muted')+'">'+(hasBlockingOrder?'当前不能绑定：已有未取消的演示订单（包括已退款订单）。退款或净消费为 0 不会恢复绑定资格。':'可绑定：尚无订单，或全部演示订单已取消。')+'仅在尚无订单或全部订单已取消时可绑定；绑定后不能更改。</p>':''}${canBind?'<form id="inviter-form" data-editor="'+renderEditor+'"><label>绑定演示邀请人<input name="code" aria-describedby="inviter-eligibility" placeholder="DEMO-FRIEND" value="'+esc(validIncoming)+'" pattern="DEMO-[A-Z0-9]{3,20}" required></label><button>确认绑定演示关系</button></form>':''}</article><article class="card"><h2>权益怎么计算？</h2><p>${esc(sum.rule)}</p><p>举例：商品 ¥129.90 − 优惠 ¥10.00 = 实付 ¥119.90；推荐佣金 = floor(11990 分 × 5%) = 599 分（¥5.99）。</p><p>待支付不计佣金；确认收货后入账给邀请人。取消不计收益；退款后消费金额与佣金同步冲回。本人订单产生的佣金不会算作本人收入。</p><p class="muted">演示无提现、无充值、无真实余额。多级分佣未开放。</p></article><article class="card"><h2>受邀人授权消费汇总</h2><p>已授权受邀人：${sum.invitees.length} 人</p><p class="empty">暂无真实受邀人授权数据。不会推测好友消费、伪造购买或展示未授权个人订单。</p></article><article class="card"><h2>虚构推荐结算沙盒</h2><p>主动生成一次虚构体验者 A 的结算算例，用于核对 ¥119.90 × 5% = ¥5.99 与退款冲回；不代表真实受邀人、真实授权或真实收益。</p>${!(s.referral.examples||[]).length?btn('生成虚构结算示例','example-create','','secondary'):(s.referral.examples[0].refunded?'<p>虚构示例已退款，佣金净额 ¥0.00。</p>':btn('模拟示例退款冲回','example-refund','','secondary'))}</article><article class="card"><h2>我的优惠券</h2>${s.coupons.map(c=>`<div class="row"><p><b>${esc(c.title)}</b><br><small>满 ${money(c.threshold)} 可减 ${money(c.value)}</small></p><span class="badge">${({available:'可使用',reserved:'订单锁定',used:'已使用'})[c.status]}</span></div>`).join('')}<p class="muted">退款/取消后演示券恢复可用；真实券有效期与退券规则待业务确认。</p></article><article class="card"><h2>消费、退款与佣金明细</h2>${s.ledger.map(l=>`<div class="row"><p>${ledgerLabels[l.type]}<br><small>${esc(l.orderId)}${l.beneficiary?' · '+esc(l.beneficiary):''}</small></p><b>${money(l.cents)}</b></div>`).join('')||'<p class="empty">没有流水，所有合计均从实际演示订单计算。</p>'}</article><a href="orders.html">查看订单与退款进度 →</a>`;}
function address(s,nextEditing=editing){const a=s.addresses.find(x=>x.id===nextEditing)||{};return note+`<h1>配送地址</h1><p class="muted">保存范围见账号状态；订单保留创建时的地址快照。</p>${s.addresses.map(a=>`<article class="card"><div class="row"><b>${esc(a.name)} · ${esc(a.phone)}</b>${a.isDefault?'<span class="badge">默认地址</span>':''}</div><p>${esc(a.address)}</p>${btn('编辑','edit-address',a.id,'secondary')}${!a.isDefault?btn('设为默认','default-address',a.id,'secondary'):''}</article>`).join('')}<form id="address-form" data-editor="${renderEditor}" class="card"><h2>${nextEditing?'编辑地址':'添加演示地址'}</h2><label>收件人<input name="name" required maxlength="50" value="${esc(a.name||'沈先生')}"></label><label>演示电话<input name="phone" required maxlength="30" placeholder="演示号码" value="${esc(a.phone||'')}"></label><label>完整地址<textarea name="address" required maxlength="200" placeholder="请使用虚构地址">${esc(a.address||'')}</textarea></label><label class="check"><input name="isDefault" type="checkbox" ${a.isDefault?'checked':''}>设为默认地址</label><button>保存演示地址</button> ${nextEditing?btn('取消编辑','cancel-edit','','secondary'):''}</form><a href="shop.html#cart">返回结算 →</a>`;}

function current(intent){try{return active&&same(intent?.context,store.context());}catch(_){return false;}}
function controls(){
 const locked=busy||entry.hasPending();
 root.querySelectorAll('button,input,select,textarea').forEach(el=>{
  const readOnly=['refresh','cancel-edit','close'].includes(el.dataset?.action);
  el.disabled=locked||(!viewIntent&&!readOnly);
 });
}
function clearAuthority(message){viewIntent=null;quoteIntent=null;if(message)status.textContent=message;controls();}
// Snapshot state and intent come from one read. A second overtaking read ends authority.
function render(options={}){
 if(!active)return false;
 if((busy||entry.hasPending()||formDirty)&&!options.force)return false;
 const nextEditing=Object.prototype.hasOwnProperty.call(options,'editing')?options.editing:editing;
 try{
  for(let attempt=0;attempt<2;attempt++){
   const snapshot=model.snapshot(),s=snapshot.state;
   if(options.receiptContext&&!same(snapshot.intent.context,options.receiptContext)){clearAuthority('写入已核验，但更新的记录已到达；当前填写与原版本保留，请明确刷新核对。');return false;}
   if(!current(snapshot.intent))continue;
   renderToken=renderSerial+1;renderEditor=editor+1;
   const html=(page==='address'?address(s,nextEditing):({shop,orders,wallet})[page](s))+
    '<p class="muted">'+esc(store.status().notice||'合成演示 v3 独立分支')+'</p>'+btn('核对最新数据','refresh','','secondary');
   if(!current(snapshot.intent))continue;
   root.innerHTML=html;renderSerial=renderToken;editor=renderEditor;
   viewState=s;viewIntent=snapshot.intent;quoteIntent=page==='shop'?snapshot.intent:null;
   formIntent=snapshot.intent;editing=nextEditing;formDirty=false;
   document.querySelectorAll('.commerce-nav a').forEach(a=>{if(a.getAttribute('href')===page+'.html')a.setAttribute('aria-current','page');});
   controls();return true;
  }
  clearAuthority('数据再次变化，当前填写保留。请核对最新数据后操作。');
 }catch(error){clearAuthority('数据读取失败，当前填写保留。'+error.message);}
 return false;
}
function retireSelections(){detail=null;category='全部';search='';coupon='';addressId='';}
function refresh(nextEditing=editing){
 if(!active||!entry.confirmLeave(formDirty,'核对最新数据会关闭当前编辑并放弃未保存填写，是否继续？'))return false;
 retireSelections();
 return render({force:true,editing:nextEditing});
}
async function run(method,params,intent,message,clearEditor=false){
 if(busy||!active||entry.hasPending())return;
 if(!intent||!current(intent)){clearAuthority('显示的数据已变化，当前填写保留。请先核对最新数据。');return;}
 const ticket=editor,guard=()=>active&&ticket===editor;
 // UUID and all business values are captured once, outside the retryable callback.
 const requestKey=crypto.randomUUID(),args=[...params,requestKey];
 if(method==='checkout')args.push(intent.revision);
 args.push(intent);
 busy=true;controls();
 try{
  await entry.execute({kind:'commerce:'+method,context:intent.context,input:{method,args},guard,
   run:({input})=>{
    const frozen=input.args,display=frozen[frozen.length-1];
    return model[input.method](...frozen.slice(0,-1),Object.freeze({...display,guard}));
   },
   verifiedBusinessSuccess:()=>guard()&&model.lastReceipt(requestKey,intent),
   onSuccess:()=>{
    if(!guard())return;
    const receipt=model.lastReceipt(requestKey,intent);
    if(!receipt){clearAuthority('操作结果尚未完成核对，当前填写保留。请核对最新数据。');return;}
    if(render({force:true,receiptContext:receipt.context,...(clearEditor?{editing:null}:{})}))status.textContent=message||'演示数据已核验保存。';
    else status.textContent='写入已核验，当前填写保留；数据已变化，请刷新核对。';
   },
   onError:error=>{if(guard()){status.textContent=error.outcome==='unknown'?'结果尚未核对，当前填写与原请求保留。请在账号入口重试原操作或核对记录。':error.message;controls();}}
  });
 }catch(error){if(guard())status.textContent=error.message;}
 finally{busy=false;if(active)controls();}
}
function liveTarget(target){return target&&root.contains(target);}
root.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!liveTarget(b)||b.dataset.view!==String(renderSerial))return;
 e.preventDefault();const a=b.dataset.action,id=b.dataset.id,s=viewState,intent=viewIntent;
 if(a==='refresh'){refresh(null);return;}
 if(a==='cancel-edit'){refresh(null);return;}
 if(a==='close'&&!current(intent)){refresh(null);return;}
 if(busy||entry.hasPending()||!intent||!current(intent)){if(!busy&&!entry.hasPending())clearAuthority('显示的数据已变化，请核对最新数据。');return;}
 if(a==='category'){category=id;render();}
 else if(a==='detail'){detail=id;render();scrollTo(0,0);}
 else if(a==='close'){detail=null;render();}
 else if(a==='add'||a==='minus')run('cartDelta',[id,a==='add'?1:-1],intent,'购物车已核验更新。');
 else if(a==='checkout'){const adr=document.getElementById('checkout-address').value;run('checkout',[adr,coupon],quoteIntent,'演示订单已核验创建，请到“订单”模拟支付。');}
 else if(['paid','cancelled','shipped','completed','refunded'].includes(a))run('transition',[id,a],intent,'订单已核验更新为'+labels[a]+'（演示）。');
 else if(a==='example-create'||a==='example-refund')run('referralExample',[a==='example-refund'],intent,'虚构结算示例已核验更新，不是真实收益。');
 else if(a==='share')document.getElementById('share-text').hidden=false;
 else if(a==='edit-address'){if(refresh(id))document.getElementById('address-form').scrollIntoView();}
 else if(a==='default-address')run('address',[{...s.addresses.find(x=>x.id===id),isDefault:true}],intent);
});
root.addEventListener('change',e=>{
 if(!liveTarget(e.target)||busy||entry.hasPending()||!current(viewIntent))return;
 if(e.target.id==='product-search'){search=e.target.value.trim();render();}
 if(e.target.id==='checkout-coupon'){coupon=e.target.value;try{model.quote(coupon,viewState);render();}catch(error){coupon='';render();status.textContent=error.message;}}
 if(e.target.id==='checkout-address')addressId=e.target.value;
});
root.addEventListener('input',e=>{
 const form=e.target.closest('form');if(liveTarget(form)&&form.dataset.editor===String(editor)&&!busy&&!entry.hasPending())formDirty=true;
});
root.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;
 if(!liveTarget(form)||form.dataset.editor!==String(editor)||busy||entry.hasPending())return;
 const d=new FormData(form);
 if(form.id==='address-form')run('address',[{id:editing,name:d.get('name').trim(),phone:d.get('phone').trim(),address:d.get('address').trim(),isDefault:d.has('isDefault')}],formIntent,undefined,true);
 else if(form.id==='inviter-form')run('bindInviter',[d.get('code').trim()],formIntent,'演示邀请关系已核验绑定。');
});
function changed(){
 if(!active)return;
 try{const previous=formIntent?.context,now=store.context();if(previous&&CTX.some(k=>k!=='revision'&&previous[k]!==now[k])){editor++;retireSelections();clearAuthority('账号分支已变化，原编辑与请求已停用。当前填写保留，请核对最新数据。');return;}}catch(error){clearAuthority('数据无法核对，当前填写保留。'+error.message);return;}
 if(busy||entry.hasPending()||formDirty){clearAuthority('共享数据已变化；当前填写与原请求保留，请在操作结束后核对。');return;}
 render();
}
unsubscribe=store.subscribe(changed);
// Entry-only transitions (including stop-retry) must update actual disabled controls.
// An overtaken snapshot loses authority; neither the draft nor its original base is rebased.
let entryPending=entry.hasPending();
unsubscribeEntry=entry.subscribe(()=>{
 if(!active)return;const pending=entry.hasPending(),settled=entryPending&&!pending;entryPending=pending;
 if(viewIntent&&!current(viewIntent))clearAuthority();else controls();
 if(settled&&!busy&&!viewIntent&&status.textContent.startsWith('结果尚未核对'))status.textContent='原请求已停止重试，当前填写保留。请先核对最新数据后再操作。';
});
g.addEventListener('storage',e=>{if(e.key===model.key||e.key===null)changed();});
document.addEventListener('click',e=>{
 const link=e.target.closest('a[href]');if(!link||String(link.getAttribute('href')).startsWith('#'))return;
 if(!entry.confirmLeave(formDirty,'离开会丢失本页填写；未核对的请求只能在本页重试，是否离开？'))e.preventDefault();
});
g.addEventListener('beforeunload',e=>{if(active&&(busy||entry.hasPending()||formDirty)){e.preventDefault();e.returnValue='';}});
render();
}
entry.register('commerce-ui',{buildId:'registration-web-v3-c1',mount});
})(window);
