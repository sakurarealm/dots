/* C1 inactive complete merchant/reviewer workbench. */
(function(g){'use strict';
const entry=g.NutriRegistrationEntry;
if(!entry||entry.buildId!=='registration-entry-v3-c1'||typeof entry.register!=='function')throw Error('REGISTRATION_ENTRY_REQUIRED');
let mounted=false;
async function mount(){
 if(mounted)return;mounted=true;
 const root=document.getElementById('admin-content'),status=document.getElementById('commerce-status'),role=document.getElementById('admin-role');
 if(!root||!status||!role)throw Error('COMMERCE_ADMIN_ROOT_REQUIRED');
 const store=g.NutriDemo,CTX=['mode','accountId','protocolVersion','epoch','generation','revision'];
 const same=(a,b)=>!!a&&!!b&&CTX.every(k=>a[k]===b[k]);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let active=true,api,unsubscribe=()=>{},unsubscribeEntry=()=>{},editing=null,busy=false,formDirty=false,formIntent=null,viewIntent=null,viewState=null,editor=0,renderSerial=0,renderToken=0,renderEditor=0,currentRole=role.value;
 g.addEventListener('pagehide',()=>{active=false;editor++;unsubscribe();unsubscribeEntry();if(api)api.dispose();});
 root.textContent='正在等待共享合成工作台…';
 try{api=g.NutriCommerce.createEngine({guard:()=>active});await api.ready;if(!active)return;}
 catch(error){if(active){root.innerHTML='<p class="notice">演示结果尚未核对，现有数据保留。可通过账号入口重新读取，或重新打开本页再核对。</p><a href="commerce-admin.html">重新打开并核对</a>';status.textContent=error.message;}return;}
 function markup(s,nextEditing,renderRole){
// Transient busy/pending locks belong to controls(); never persist them as view eligibility.
if(g.NutriCommerceAdminGlassV1)return g.NutriCommerceAdminGlassV1.render(s,{role:renderRole,editing:nextEditing,renderToken,renderEditor,locked:false,authorized:true,productImages:g.NutriCommerceProductIllustrations});
const p=s.products.find(x=>x.id===nextEditing)||{};const input=(name,label,value,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="1"':''} maxlength="500" required></label>`;return (renderRole==='merchant'?`<form class="card" id="product-form" data-editor="${renderEditor}"><h2>${nextEditing?'编辑商品并重新送审':'新增演示商品'}</h2>${input('name','商品名称',p.name||'')}${input('category','类别',p.category||'维生素')}${input('spec','规格（仅标签资料）',p.spec||'')}${input('priceCents','演示价格（整数分）',p.priceCents||0,'number')}${input('stock','演示库存',p.stock||0,'number')}${input('manufacturer','生产商（未核验请写待核验）',p.manufacturer||'待核验')}${input('ingredients','配料表',p.ingredients||'待核验')}${input('qualification','资质/标签核验资料',p.qualification||'待核验')}${input('shelfLife','保质期',p.shelfLife||'待核验')}<label>商品描述<textarea name="description" maxlength="2000">${esc(p.description||'')}</textarea></label><p class="muted">保存后自动下架并进入待审核；图片仅允许后续本地映射，不开放上传。</p><button>保存并提交演示审核</button>${nextEditing?' <button type="button" data-view="'+renderToken+'" data-action="clear">取消编辑</button>':''}</form>`:'<p class="notice">审核员只能操作本地演示商品。真实上架必须由服务器校验资料完整性、权限及资质。</p>')+s.products.map(p=>`<article class="card"><div class="row"><h3>${esc(p.name)}</h3><span class="badge">${({pending:'待演示审核',approved:'演示审核通过',rejected:'演示审核未通过'})[p.status]} · ${p.listed?'已上架':'未上架'}</span></div><p>${esc(p.category)} · ${esc(p.spec)} · ¥${(p.priceCents/100).toFixed(2)} · 库存 ${p.stock}</p><details><summary>检查商品资料</summary><p>生产商：${esc(p.manufacturer||'待核验')}</p><p>配料：${esc(p.ingredients||'待核验')}</p><p>资质：${esc(p.qualification||'待核验')}</p><p>保质期：${esc(p.shelfLife||'待核验')}</p><p>${esc(p.description)}</p><p>图片：待恢复，不伪装原商品照。</p></details><div class="row">${renderRole==='merchant'?`<button data-view="${renderToken}" data-action="edit" data-id="${esc(p.id)}">编辑/重新送审</button>`:`<button data-view="${renderToken}" data-action="approve" data-id="${esc(p.id)}">演示审核通过</button><button class="danger" data-view="${renderToken}" data-action="reject" data-id="${esc(p.id)}">演示驳回</button>${p.status==='approved'?`<button class="secondary" data-view="${renderToken}" data-action="${p.listed?'unlist':'list'}" data-id="${esc(p.id)}">${p.listed?'下架':'上架'}</button>`:''}`}</div></article>`).join('')+`<details class="card"><summary>操作审计（最近 20 项）</summary>${s.audit.slice(-20).reverse().map(a=>`<p>版本 ${a.revision} · ${esc(a.action)}</p>`).join('')}</details>`;}
function current(intent){try{return active&&same(intent?.context,store.context());}catch(_){return false;}}
function controls(){
 const locked=busy||entry.hasPending();role.disabled=locked;
 root.querySelectorAll('button,input,select,textarea').forEach(el=>{const recovery=['refresh','clear'].includes(el.dataset?.action);el.disabled=locked||el.dataset?.cagDisabled==='true'||(!recovery&&(!current(viewIntent)||role.value!==currentRole||!['merchant','reviewer'].includes(currentRole)));});
}
function clearAuthority(message){viewIntent=null;if(message)status.textContent=message;controls();}
function render(options={}){
 if(!active||(busy||entry.hasPending()||formDirty)&&!options.force)return false;
 const nextEditing=Object.prototype.hasOwnProperty.call(options,'editing')?options.editing:editing;
 try{
  for(let attempt=0;attempt<2;attempt++){
   const snapshot=api.snapshot();
   if(options.receiptContext&&!same(snapshot.intent.context,options.receiptContext)){clearAuthority('写入已核验，但更新的记录已到达；当前填写与原版本保留，请明确刷新核对。');return false;}
   if(!current(snapshot.intent))continue;
   renderToken=renderSerial+1;renderEditor=editor+1;
   const html=markup(snapshot.state,nextEditing,currentRole)+'<p class="muted">'+esc(store.status().notice||'合成演示 v3 独立分支')+'</p><button type="button" data-view="'+renderToken+'" data-action="refresh">核对最新数据</button>';
   if(!current(snapshot.intent))continue;
   root.innerHTML=html;renderSerial=renderToken;editor=renderEditor;editing=nextEditing;
   formIntent=snapshot.intent;viewIntent=snapshot.intent;viewState=snapshot.state;formDirty=false;controls();return true;
  }
  clearAuthority('数据再次变化，当前填写保留。请核对最新数据。');
 }catch(error){clearAuthority('数据读取失败，当前填写保留。'+error.message);}
 return false;
}
function refresh(nextEditing=null){
 if(!entry.confirmLeave(formDirty,'核对最新数据会关闭当前编辑并放弃未保存填写，是否继续？'))return false;
 return render({force:true,editing:nextEditing});
}
async function run(method,params,intent){
 if(busy||!active||entry.hasPending()||role.value!==currentRole||!((['saveProduct','transition'].includes(method)&&currentRole==='merchant')||(method==='reviewProduct'&&currentRole==='reviewer')))return;
 if(!intent||!current(intent)){clearAuthority('显示的数据已变化，当前填写保留。请先核对最新数据。');return;}
 const ticket=editor,actor=currentRole,guard=()=>active&&ticket===editor&&role.value===actor&&currentRole===actor;
 if(method==='transition'){const order=viewState.orders.find(o=>o.id===params[0]);if(!order||!(params[1]==='shipped'&&order.status==='paid'||params[1]==='refunded'&&['paid','shipped','completed'].includes(order.status)))return;}
 const requestKey=crypto.randomUUID(),args=[...params,requestKey,intent];busy=true;status.textContent='正在保存合成操作，请勿重复提交…';controls();
 try{
  await entry.execute({kind:'commerce-admin:'+method,context:intent.context,input:{method,args,actor},guard,
   run:({input})=>{const frozen=input.args,display=frozen[frozen.length-1];return api[input.method](...frozen.slice(0,-1),Object.freeze({...display,guard}));},
   onSuccess:()=>{if(guard()){const receipt=api.lastReceipt(requestKey,intent);if(!receipt){clearAuthority('操作结果尚未完成核对，当前填写保留。请核对最新数据。');return;}if(render({force:true,receiptContext:receipt.context,editing:null}))status.textContent='演示操作已核验保存；可回商城检查结果。';else status.textContent='写入已核验，当前填写保留；数据已变化，请刷新核对。';}},
   onError:error=>{if(guard()){status.textContent=error.outcome==='unknown'?'结果尚未核对，当前填写与原请求保留。请在账号入口重试原操作或核对记录。':error.message;controls();}}
  });
 }catch(error){if(guard())status.textContent=error.message;}
 finally{busy=false;if(active)controls();}
}
function liveTarget(target){return target&&root.contains(target);}
role.addEventListener('change',()=>{
 const next=role.value;
 if(!active||busy||entry.hasPending()){role.value=currentRole;return;}
 if(!['merchant','reviewer'].includes(next)||!entry.confirmLeave(formDirty,'切换角色会关闭当前编辑并放弃未保存填写，是否继续？')){role.value=currentRole;return;}
 // Retire the old actor synchronously. A failed refresh keeps the old draft inert.
 editor++;currentRole=next;viewIntent=null;formIntent=null;render({force:true,editing:null});
});
root.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!liveTarget(b)||b.dataset.view!==String(renderSerial))return;
 e.preventDefault();const {action,id}=b.dataset;
 if(action==='refresh'||action==='clear'){refresh(null);return;}
 if(busy||entry.hasPending()||!current(viewIntent)){if(!busy&&!entry.hasPending())clearAuthority('显示的数据已变化，请核对最新数据。');return;}
 if(role.value!==currentRole||!['merchant','reviewer'].includes(currentRole))return;
 if(action==='edit'&&currentRole==='merchant'){if(refresh(id))scrollTo(0,0);}
 else if(currentRole==='merchant'&&['ship','refund'].includes(action)){
  const order=viewState.orders.find(x=>x.id===id),to=action==='ship'?'shipped':'refunded';
  if(!order||!(to==='shipped'&&order.status==='paid'||to==='refunded'&&['paid','shipped','completed'].includes(order.status)))return;
  if(formDirty){status.textContent='请先提交商品填写，或取消编辑并核对最新数据，再操作订单。';return;}
  if(!g.confirm('确认对合成订单 '+id+' '+(to==='shipped'?'记录演示发货？不会联系物流。':'记录演示全额退款？只冲回合成库存、优惠券及适用佣金，不退款真实资金。'))){status.textContent='已取消，订单未修改。';return;}
  run('transition',[id,to],viewIntent);
 }
 else if(currentRole==='reviewer'&&['approve','reject','list','unlist'].includes(action)){
  const p=viewState.products.find(x=>x.id===id);if(!p||(['approve','reject'].includes(action)?p.status!=='pending':p.status!=='approved'))return;
  run('reviewProduct',[id,action==='approve'?'approved':action==='reject'?'rejected':p.status,action==='list'],viewIntent);
 }
});
root.addEventListener('input',e=>{const form=e.target.closest('form');if(liveTarget(form)&&form.dataset.editor===String(editor)&&!busy&&!entry.hasPending())formDirty=true;});
root.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;
 if(!liveTarget(form)||form.id!=='product-form'||form.dataset.editor!==String(editor)||currentRole!=='merchant'||role.value!=='merchant'||busy||entry.hasPending())return;
 if(!current(formIntent)){clearAuthority('显示的数据已变化，当前填写保留。请先核对最新数据。');return;}
 if(editing&&!viewState.products.some(p=>p.id===editing)){status.textContent='原商品已不存在，请明确核对最新数据后重新填写。';return;}
 if(typeof form.reportValidity==='function'&&!form.reportValidity())return;
 const p=Object.fromEntries(new FormData(form));
 for(const key of ['priceCents','stock']){const raw=p[key];if(typeof raw!=='string'||raw.trim()===''||!Number.isSafeInteger(Number(raw))||Number(raw)<0){status.textContent='演示价格与库存必须明确填写非负安全整数；空白不是零。';return;}p[key]=Number(raw);}
 p.id=editing;
 run('saveProduct',[p],formIntent);
});
function changed(){
 if(!active)return;
 try{const previous=formIntent?.context,now=store.context();if(previous&&CTX.some(k=>k!=='revision'&&previous[k]!==now[k])){editor++;currentRole='merchant';role.value='merchant';clearAuthority('账号分支已变化，原编辑与请求已停用。当前填写保留，请核对最新数据。');return;}}catch(error){clearAuthority('数据无法核对，当前填写保留。'+error.message);return;}
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
g.addEventListener('storage',e=>{if(e.key===api.key||e.key===null)changed();});
document.addEventListener('click',e=>{const link=e.target.closest('a[href]');if(link&&!String(link.getAttribute('href')).startsWith('#')&&!entry.confirmLeave(formDirty,'离开会丢失本页填写；未核对请求只能在本页重试，是否离开？'))e.preventDefault();});
g.addEventListener('beforeunload',e=>{if(active&&(busy||entry.hasPending()||formDirty)){e.preventDefault();e.returnValue='';}});
render();
}
entry.register('commerce-admin',{buildId:'registration-web-v3-c1',mount});
})(window);
