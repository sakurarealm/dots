/* Inactive C2 renderer. One shared controller owns all synthetic actor/data authority. */
(function(g,factory){'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {
  g.NutriPractitionerUIV3=api;
  const entry=g.NutriRegistrationEntry,controller=g.NutriPractitionerControllerV3;
  if(!entry||typeof entry.register!=='function'||controller?.buildId!==api.buildId||typeof controller.forEntry!=='function')throw Error('PRACTITIONER_UI_DEPENDENCY');
  entry.register('practitioner-ui',{buildId:api.buildId,mount(e){const c=controller.forEntry(e);const r=api.create({root:g.document.getElementById('practitioner-root'),document:g.document,window:g,controller:c});try{c.attach('relationship',r);}catch(error){r.dispose();throw error;}return r;}});
 }
})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
 const BUILD='registration-web-v3-c1';
 const PERSONAS=[['client-a','沈先生 · 合成访客 A'],['client-b','合成访客 B'],['fictional-lin','林小禾 · 虚构营养师'],['fictional-zhou','周青 · 虚构营养师'],['synthetic-reviewer','独立合成审核员']];
 const TOPICS=[['MEAL_ROUTINE','日常膳食安排'],['FOOD_EDUCATION','食物与营养知识'],['HABIT_SUPPORT','饮食习惯陪伴']];
 const FILTERS=[['all','全部'],['pending','待处理'],['active','服务中'],['closed','已结束']];
 const RELATIONS=new Set(['inquire','invite','accept','reject','revoke','answer','closeInquiry']);
 const ACTIONS=new Set(['enter','logout','refresh','retryInitialize','choosePersona','selectPractitioner','setTopic','setConsent','setFilter','setTab','navigate',...RELATIONS]);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const list=x=>Array.isArray(x)?x:[];
 const topic=x=>TOPICS.find(([key])=>key===x)?.[1]||'未核对需求类别';
 function create(options={}){
  const {root,controller:c}=options,d=options.document||root?.ownerDocument,w=options.window||{};
  if(!root||!d||typeof d.createElement!=='function'||typeof root.replaceChildren!=='function'||typeof root.addEventListener!=='function'||!c||typeof c.snapshot!=='function')throw Error('PRACTITIONER_UI_ROOT_REQUIRED');
  let alive=true;
  function attrs(s,action,extra={},eligible=true,policy='write'){
   const a={'data-pr-action':action,'data-pr-render':s.render,'data-pr-attempt':s.attempt,'data-pr-eligible':eligible?'1':'0','data-pr-policy':policy,...extra};
   return Object.entries(a).map(([key,value])=>' '+key+'="'+esc(value)+'"').join('');
  }
  function enabled(s,policy,eligible=true){
   if(!alive||s.phase==='closed'&&policy!=='persona'&&policy!=='initialize')return false;
   if(policy==='refresh')return !!s.canRefresh;
   if(policy==='initialize')return !!s.canInitialize;
   if(policy==='persona'||policy==='navigate')return !!eligible&&!s.busy;
   return !!eligible&&!!s.authorized&&!s.busy&&!s.pending;
  }
  function button(s,action,label,extra={},eligible=true,policy='write',cls=''){
   return '<button type="button"'+attrs(s,action,extra,eligible,policy)+(cls?' class="'+esc(cls)+'"':'')+(enabled(s,policy,eligible)?'':' disabled')+'>'+esc(label)+'</button>';
  }
  const link=(s,href,label)=>'<a href="'+esc(href)+'"'+attrs(s,'navigate',{},true,'navigate')+'>'+esc(label)+'</a>';
  const optionList=(values,value)=>values.map(([key,label])=>'<option value="'+esc(key)+'"'+(key===value?' selected':'')+'>'+esc(label)+'</option>').join('');
  function status(s){return '<p class="notice" data-pr-notice role="status" aria-live="polite"'+(s.notice?'':' hidden')+'>'+esc(s.notice)+'</p><p class="notice error-box" data-pr-error role="alert"'+(s.error?'':' hidden')+'>'+esc(s.error)+'</p><p class="notice error-box" data-pr-unverified'+(s.data&&!s.authorized?'':' hidden')+'>当前显示尚未核对，不能据此认定资质、发布或私人授权仍有效。请刷新当前状态。</p>';}
  function recovery(s){return '<div class="actions">'+button(s,'refresh','刷新当前状态',{},true,'refresh')+button(s,'retryInitialize','重试进入合成体验',{},true,'initialize')+'</div>';}
  function chooser(s){return '<section class="section synthetic-session"><h2>离线合成体验</h2><p class="muted">五个身份均为虚构角色。切换演练身份不代表真实登录；不要输入真实身份、健康或联系方式。</p><label for="pr-persona">演练身份</label><select id="pr-persona"'+attrs(s,'choosePersona',{'data-pr-value':s.persona},true,'persona')+(enabled(s,'persona')?'':' disabled')+'>'+optionList(PERSONAS,s.persona)+'</select><div class="actions">'+button(s,'enter',s.data?'重新进入所选角色':'进入所选角色',{},true,'persona')+button(s,'logout','退出当前角色',{},!!s.data,'persona')+'</div><p class="badge" data-pr-identity'+(s.data?'':' hidden')+'>'+esc(s.data?.identity?.label||'')+'</p>'+recovery(s)+'</section>';}
  function row(item,s,invitation){
   const role=s.data.identity.role,p=list(s.data.directory).find(p=>p.id===item.practitionerId);
   let buttons='';
   if(invitation&&item.state==='PENDING'&&role==='practitioner')buttons+=button(s,'accept','接受合成邀请',{'data-pr-id':item.id})+button(s,'reject','婉拒邀请',{'data-pr-id':item.id});
   if(invitation&&['PENDING','ACCEPTED'].includes(item.state))buttons+=button(s,'revoke',role==='client'?'撤销邀请 / 授权':'结束合成服务关系',{'data-pr-id':item.id});
   if(!invitation&&item.state==='OPEN'&&role==='practitioner')buttons+=button(s,'answer','发送合成回应',{'data-pr-id':item.id});
   if(!invitation&&item.state!=='CLOSED')buttons+=button(s,'closeInquiry','关闭咨询',{'data-pr-id':item.id});
   return '<article class="demand-card"><h3>'+esc(topic(item.topic))+'</h3><p>'+esc(item.clientLabel)+' · '+esc(p?.name||'虚构营养师（当前不在目录）')+'</p><p class="status">'+esc(item.statusLabel)+'</p><p class="muted">合成记录版本 '+esc(item.version)+' · 只共享所选需求类别</p>'+(item.reply?'<p>'+esc(item.reply)+'</p>':'')+'<div class="actions">'+buttons+'</div></article>';
  }
  function workbench(s){
   const data=s.data,role=data.identity.role;if(!['client','practitioner'].includes(role))return '';
   const inquiries=list(data.inquiries),invitations=list(data.invitations),privateClients=list(data.privateClients);
   const matches=item=>s.filter==='all'||(s.filter==='pending'?['OPEN','PENDING'].includes(item.state):s.filter==='active'?item.state==='ACCEPTED':['CLOSED','ANSWERED','REJECTED','REVOKED','INVALIDATED'].includes(item.state));
   const rows=[...inquiries.filter(matches).map(item=>row(item,s,false)),...invitations.filter(matches).map(item=>row(item,s,true))];
   return '<section class="section" id="practitioner-workbench"><h2>'+(role==='practitioner'?'营养师需求工作台':'我的需求与私人营养师')+'</h2><div class="demand-stats"><span>'+inquiries.filter(x=>x.state==='OPEN').length+' 待回应咨询</span><span>'+invitations.filter(x=>x.state==='PENDING').length+' 待处理邀请</span></div><div class="actions">'+button(s,'setTab','查看目录',{'data-pr-tab':'directory'})+button(s,'setTab','查看全部需求',{'data-pr-tab':'demands'})+'</div>'+(s.tab==='demands'||role==='practitioner'?'<label for="pr-demand-filter">需求筛选</label><select id="pr-demand-filter"'+attrs(s,'setFilter',{'data-pr-value':s.filter})+(enabled(s,'write')?'':' disabled')+'>'+optionList(FILTERS,s.filter)+'</select><div class="demand-list">'+(rows.join('')||'<p class="empty">暂无符合条件的合成需求。</p>')+'</div>':'')+'<h3>当前有效的私人服务授权</h3><div data-pr-private-authority'+(s.authorized?'':' hidden')+'>'+(privateClients.map(item=>'<p class="notice">'+esc(item.clientLabel)+' · '+esc(topic(item.topic))+'<br>'+esc(item.scope)+'</p>').join('')||'<p class="muted">暂无有效授权。接受邀请后才建立关系，撤销或资质失效后停止共享。</p>')+'</div><p class="muted" data-pr-private-unavailable'+(s.authorized?' hidden':'')+'>当前授权尚未核对，授权详情暂不展示。</p></section>';
  }
  function directory(s){
   const data=s.data;if(data.identity.role!=='client'||s.tab!=='directory')return '';
   return '<section class="section" id="practitioner-directory"><h2>虚构营养师目录</h2><p class="muted">先选择一个虚构营养师，再选择需求类别。目录中的合成审核不代表真实资质认证。</p><div class="demand-list">'+(list(data.directory).map(p=>'<article class="demand-card"><span class="badge">'+esc(p.label)+'</span><h3>'+esc(p.name)+'</h3><p>'+esc(p.scope)+'</p><p class="muted">'+esc(p.bio)+'</p><p class="muted">资质修订 '+esc(p.revision)+'</p><div class="actions">'+button(s,'selectPractitioner',s.selected?.id===p.id?'已选择此虚构营养师':'选择此虚构营养师',{'data-pr-id':p.id,'aria-pressed':s.selected?.id===p.id?'true':'false'})+'</div></article>').join('')||'<p class="empty">暂无当前可用的合成角色。</p>')+'</div><label for="pr-topic">想了解的方向</label><select id="pr-topic"'+attrs(s,'setTopic',{'data-pr-value':s.topic})+(enabled(s,'write')?'':' disabled')+'>'+optionList(TOPICS,s.topic)+'</select><label class="consent"><input id="pr-consent" type="checkbox"'+attrs(s,'setConsent',{'data-pr-value':s.consent?'1':'0'},!!s.selected)+(s.consent?' checked':'')+(enabled(s,'write',!!s.selected)?'':' disabled')+'>邀请时，同意仅向所选虚构营养师共享此需求类别。不会共享饮食记录、健康指标、聊天或联系方式；可随时撤销。</label><div class="actions">'+button(s,'inquire','发起合成咨询',{},!!s.selected)+button(s,'invite','邀请为私人营养师',{},!!s.selected&&!!s.consent)+'</div>'+status(s)+'<p class="muted">'+(s.selected?'当前对象：'+esc(list(data.directory).find(p=>p.id===s.selected.id)?.name||'虚构营养师')+'；共享范围仅为：'+esc(topic(s.topic))+'。接受前不建立私人关系，可在工作台撤销。':'请先选择虚构营养师。')+'</p>'+link(s,'#practitioner-workbench','查看咨询、邀请及撤销状态')+'</section>';
  }
  function publications(s){return '<section class="section"><h2>本机合成公开文章</h2><p class="muted">仅展示当前核对可见的合成发布内容。来源网址为纯文本，未访问或验证；不构成健康建议。</p><p class="muted" data-pr-publications-unavailable'+(s.authorized?' hidden':'')+'>文章当前可见性尚未核对，内容暂不展示。</p><div class="demand-list" data-pr-publications'+(s.authorized?'':' hidden')+'>'+(list(s.data.publications).map(a=>'<article class="demand-card"><span class="badge">合成内容 · 非真实专业审核</span><h3>'+esc(a.title)+'</h3><p>'+esc(a.authorDisplayName||'虚构作者')+'</p><p>'+esc(a.bodyText)+'</p><p class="muted">来源：'+esc(a.sourceTitle)+' · '+esc(a.sourceDate)+'</p><p class="muted">'+esc(a.sourceUrl)+'</p><h4>适用范围</h4><p>'+esc(a.applicability)+'</p><h4>限制与注意事项</h4><p>'+esc(a.limitations)+'</p></article>').join('')||'<p class="empty">暂无可见的合成文章。</p>')+'</div></section>';}
  function prepare(s){
   if(!alive)throw Error('PRACTITIONER_UI_DISPOSED');
   const box=d.createElement('div');
   box.innerHTML='<section class="hero"><span class="eyebrow">AI-NUTRI · 专业陪伴</span><h1>找到适合你的营养师</h1><p>浏览服务方向，先咨询，再邀请成为私人营养师。</p><p class="muted">真实营养师服务尚未连接。这里的角色、审核和服务均为离线合成演练，不提供真实认证、诊疗或预约。</p><nav class="actions" aria-label="营养师平台导航">'+link(s,'#practitioner-directory','营养师目录')+link(s,'#practitioner-workbench','需求工作台')+link(s,'#registration','登记与文章发布')+'</nav></section><section class="section"><h2>真实服务</h2><p class="status">尚未连接</p><p>真实目录 0 条。尚未加载经核验的营养师；合成角色不会混入真实目录。</p></section>'+chooser(s)+status(s)+(s.data?workbench(s)+directory(s)+publications(s):'<p class="notice">'+esc(s.phase==='loading'?'正在等待同一合成账号核对；当前尚未获得角色权限。':'当前没有已核对的合成角色。请从这里重试进入，或先完成页面顶部的账号状态核对。')+'</p>');
   return Array.from(box.childNodes);
  }
  function ticket(el){
   const integer=name=>{const raw=el.getAttribute(name);return typeof raw==='string'&&/^(0|[1-9]\d*)$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;};
   const render=integer('data-pr-render'),attempt=integer('data-pr-attempt');
   return render===null||attempt===null?null:{render,attempt};
  }
  function own(el){return alive&&el&&root.contains(el)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';}
  function reportUnexpected(){const e=root.querySelector('[data-pr-error]');if(e){e.textContent='操作未完成核对。当前内容保留，请刷新状态后再操作。';e.hidden=false;}}
  async function invoke(fn,restore){try{const result=await fn();if(result!==true)restore?.();return result===true;}catch(_){restore?.();if(alive)reportUnexpected();return false;}}
  function restore(el,value,checked){if(!alive||!root.contains(el))return;if(checked)el.checked=value==='1';else el.value=value;}
  function change(event){
   const el=event.target;if(!own(el))return;const action=el.getAttribute('data-pr-action'),t=ticket(el),previous=el.getAttribute('data-pr-value');if(!t||!ACTIONS.has(action))return;
   const value=el.value;
   if(action==='choosePersona'){if(!PERSONAS.some(([p])=>p===value)){restore(el,previous);return;}void invoke(()=>c.choosePersona(value,t),()=>restore(el,previous));}
   else if(action==='setTopic'){if(!TOPICS.some(([p])=>p===value)){restore(el,previous);return;}void invoke(()=>c.setTopic(value,t),()=>restore(el,previous));}
   else if(action==='setFilter'){if(!FILTERS.some(([p])=>p===value)){restore(el,previous);return;}void invoke(()=>c.setFilter(value,t),()=>restore(el,previous));}
   else if(action==='setConsent')void invoke(()=>c.setConsent(!!el.checked,t),()=>restore(el,previous,true));
  }
  function click(event){
   if(!alive||!root.contains(event.target))return;
   const el=event.target.closest?.('[data-pr-action]');if(el?.tagName==='A')event.preventDefault();if(!own(el)||!['BUTTON','A'].includes(el.tagName))return;
   const action=el.getAttribute('data-pr-action');if(!ACTIONS.has(action)||['choosePersona','setTopic','setConsent','setFilter'].includes(action))return;
   event.preventDefault();const t=ticket(el);if(!t)return;
   if(action==='enter'){const chooser=root.querySelector('#pr-persona');if(!own(chooser)||!PERSONAS.some(([p])=>p===chooser.value))return;void invoke(()=>c.choosePersona(chooser.value,t));}
   else if(action==='logout')void invoke(()=>c.logout(t));
   else if(action==='refresh')void invoke(()=>c.refresh(t));
   else if(action==='retryInitialize')void invoke(()=>c.retryInitialize(t));
   else if(action==='selectPractitioner')void invoke(()=>c.selectPractitioner(el.getAttribute('data-pr-id'),t));
   else if(action==='setTab'){const tab=el.getAttribute('data-pr-tab');if(['directory','demands'].includes(tab))void invoke(()=>c.setTab(tab,t));}
   else if(RELATIONS.has(action))void invoke(()=>c.relationshipAction(action,el.getAttribute('data-pr-id')||null,t));
   else if(action==='navigate'){const href=el.getAttribute('href');void invoke(()=>{if(c.confirmNavigation(href,t)!==true)return false;if(!alive)return false;if(typeof w.location?.assign==='function')w.location.assign(href);else if(w.location)w.location.href=href;return true;});}
  }
  function updateStatus(s){
   if(!alive)return;
   for(const [key,value] of [['notice',s.notice],['error',s.error]])for(const el of root.querySelectorAll('[data-pr-'+key+']')){el.textContent=String(value||'');el.hidden=!value;}
   for(const el of root.querySelectorAll('[data-pr-unverified]'))el.hidden=!s.data||!!s.authorized;
   for(const el of root.querySelectorAll('[data-pr-identity]')){el.textContent=s.data?.identity?.label||'';el.hidden=!s.data;}
   for(const el of root.querySelectorAll('[data-pr-private-authority]'))el.hidden=!s.authorized||!s.data;
   for(const el of root.querySelectorAll('[data-pr-private-unavailable]'))el.hidden=!!s.authorized&&!!s.data;
   for(const el of root.querySelectorAll('[data-pr-publications]'))el.hidden=!s.authorized||!s.data;
   for(const el of root.querySelectorAll('[data-pr-publications-unavailable]'))el.hidden=!!s.authorized&&!!s.data;
   for(const el of root.querySelectorAll('[data-pr-action]')){
    const policy=el.getAttribute('data-pr-policy');
    if(['refresh','initialize'].includes(policy)){el.setAttribute('data-pr-render',s.render);el.setAttribute('data-pr-attempt',s.attempt);}
    const current=el.getAttribute('data-pr-render')===String(s.render),yes=current&&enabled(s,policy,el.getAttribute('data-pr-eligible')==='1');
    if(el.tagName==='A')el.setAttribute('aria-disabled',yes?'false':'true');else el.disabled=!yes;
   }
  }
  function clear(message){if(!alive)return;const s={...c.snapshot(),data:null,form:null,authorized:false,notice:message||'原角色已退出，等待重新核对。',error:''};root.replaceChildren(...prepare(s));}
  function dispose(){if(!alive)return;alive=false;root.removeEventListener('click',click);root.removeEventListener('change',change);for(const el of root.querySelectorAll('[data-pr-action]')){if(el.tagName==='A')el.setAttribute('aria-disabled','true');else el.disabled=true;}}
  root.addEventListener('click',click);root.addEventListener('change',change);
  return Object.freeze({root,prepare,updateStatus,clear,dispose});
 }
 return Object.freeze({buildId:BUILD,create});
});
