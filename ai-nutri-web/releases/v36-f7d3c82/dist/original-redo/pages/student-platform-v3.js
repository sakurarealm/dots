/* Inactive C2 registration renderer. Pure kernel presentation arrives through the one PC. */
(function(g,factory){'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {
  g.NutriStudentPlatformV3=api;
  const entry=g.NutriRegistrationEntry,controller=g.NutriPractitionerControllerV3;
  if(!entry||typeof entry.register!=='function'||controller?.buildId!==api.buildId||typeof controller.forEntry!=='function')throw Error('STUDENT_PLATFORM_DEPENDENCY');
  entry.register('student-platform',{buildId:api.buildId,mount(e){const c=controller.forEntry(e);const r=api.create({root:g.document.getElementById('platform-root'),document:g.document,window:g,controller:c});try{c.attach('registration',r);}catch(error){r.dispose();throw error;}return r;}});
 }
})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
 const BUILD='registration-web-v3-c1';
 const PROFILE=new Set(['displayName','biography','practiceScope','credentialType','credentialIssuer','credentialJurisdiction','credentialClaimRef']);
 const ARTICLE=new Set(['title','bodyText','sourceUrl','sourceTitle','sourceDate','applicability','limitations']);
 const REQUESTS=new Set(['submitProfile','withdrawProfile','submitArticle','publishArticle','withdrawArticle']);
 const SCENARIOS=new Set(['approved','rejected','revoked','articleApproved','articleRejected']);
 const OWNERS=new Set(['fictional-lin','fictional-zhou']);
 const ACTIONS=new Set(['refresh','retryInitialize','openForm','sample','save','cancelForm','setAck','reviewAction','navigate',...REQUESTS]);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const list=x=>Array.isArray(x)?x:[];
 function create(options={}){
  const {root,controller:c}=options,d=options.document||root?.ownerDocument,w=options.window||{};
  if(!root||!d||typeof d.createElement!=='function'||typeof root.replaceChildren!=='function'||typeof root.addEventListener!=='function'||!c||typeof c.snapshot!=='function')throw Error('STUDENT_PLATFORM_ROOT_REQUIRED');
  let alive=true;
  function attrs(s,action,extra={},eligible=true,policy='write'){
   const a={'data-pr-action':action,'data-pr-render':s.render,'data-pr-attempt':s.attempt,'data-pr-eligible':eligible?'1':'0','data-pr-policy':policy,...(policy==='form'||policy==='cancel'?{'data-pr-form':s.form?.serial}:{}),...extra};
   return Object.entries(a).map(([key,value])=>' '+key+'="'+esc(value)+'"').join('');
  }
  function enabled(s,policy,eligible=true){
   if(!alive)return false;
   if(policy==='refresh')return !!s.canRefresh;
   if(policy==='initialize')return !!s.canInitialize;
   if(policy==='navigate'||policy==='cancel')return !s.busy&&s.phase!=='closed';
   return !!eligible&&s.phase!=='closed'&&!!s.authorized&&!s.busy&&!s.pending;
  }
  function button(s,action,label,extra={},eligible=true,policy='write',cls=''){
   return '<button type="button"'+attrs(s,action,extra,eligible,policy)+(cls?' class="'+esc(cls)+'"':'')+(enabled(s,policy,eligible)?'':' disabled')+'>'+esc(label)+'</button>';
  }
  const link=(s,href,label)=>'<a href="'+esc(href)+'"'+attrs(s,'navigate',{},true,'navigate')+'>'+esc(label)+'</a>';
  function status(s){return '<p class="notice" data-pr-notice role="status" aria-live="polite"'+(s.notice?'':' hidden')+'>'+esc(s.notice)+'</p><p class="notice error-box" data-pr-error role="alert"'+(s.error?'':' hidden')+'>'+esc(s.error)+'</p><p class="notice error-box" data-pr-unverified'+(s.data&&!s.authorized?'':' hidden')+'>当前内容尚未核对，原填写保留。所有保存、审核与发布权限需刷新后重新取得。</p>';}
  function recovery(s){return '<div class="actions">'+button(s,'refresh','刷新当前状态',{},true,'refresh')+button(s,'retryInitialize','重试进入合成体验',{},true,'initialize')+'</div>';}
  function fieldRows(fields,allowed){return list(fields).filter(f=>allowed.has(f.key)).map(f=>'<p><strong>'+esc(f.label)+'：</strong>'+esc(f.value)+'</p>').join('');}
  function editor(s){
   const f=s.form;if(!f)return '';const allowed=f.kind==='profile'?PROFILE:f.kind==='article'?ARTICLE:null;if(!allowed)throw Error('REGISTRATION_FORM_KIND');
   const seen=new Set();
   const fields=list(f.fields).filter(field=>allowed.has(field.key)&&!seen.has(field.key)&&seen.add(field.key)).map(field=>{
    const id='pr-'+f.kind+'-'+field.key,value=esc(field.value),error=field.error||f.errors?.[field.key]||'',meta=attrs(s,'editField',{'data-pr-field':field.key},true,'form');
    return '<label for="'+id+'">'+esc(field.label)+'</label>'+(field.multiline?'<textarea':'<input type="'+(field.key==='sourceUrl'?'url':field.key==='sourceDate'?'date':'text')+'"')+' id="'+id+'" name="'+field.key+'"'+meta+' maxlength="'+esc(field.max)+'" aria-describedby="'+id+'-error'+(field.key==='sourceUrl'?' '+id+'-help':'')+'"'+(error?' aria-invalid="true"':'')+(enabled(s,'form')?'':' disabled')+(field.multiline?'>'+value+'</textarea>':' value="'+value+'">')+'<div id="'+id+'-error" class="error" data-pr-field-error="'+field.key+'">'+esc(error)+'</div>'+(field.key==='sourceUrl'?'<p class="pr-field-help" id="'+id+'-help">仅填写 HTTPS 网址，例如 https://example.invalid/synthetic-source。示例地址是占位文本，未访问、未核验；不要把此说明填入网址。</p>':'');
   }).join('');
   return '<section class="section"><form id="pr-editor" novalidate data-pr-kind="'+f.kind+'"'+attrs(s,'submitForm',{},true,'form')+'><div class="pr-heading"><h2>'+(f.kind==='profile'?'申请登记（演示）':'编辑文章（演示）')+'</h2><span class="badge">本机合成草稿</span></div><p class="muted" data-pr-form-state>'+esc(f.dirty?'当前有未保存填写。':'已打开原版本；保存前请确认全部为合成资料。')+'</p>'+fields+(f.kind==='profile'?'<div class="pr-callout"><h3>资质材料 · 仅虚构引用</h3><p>只能填写 SYNTHETIC- 开头的材料引用。图片选择、证件上传和外部资质核验均未接入；不会显示虚假的上传成功。</p></div>':'<p class="muted">正文与来源仅按纯文本保存。来源网址不会被打开或验证；编辑已审核内容需要重新审核。</p>')+'<label class="consent"><input type="checkbox" id="pr-ack"'+attrs(s,'setAck',{},true,'form')+(f.ack?' checked':'')+(enabled(s,'form')?'':' disabled')+'>我确认所有填写均为虚构合成资料，不含真实证件、个人身份或健康资料。</label><div class="actions">'+button(s,'sample','填入虚构示例',{},true,'form')+'<button type="submit" class="primary"'+attrs(s,'save',{},true,'form')+(enabled(s,'form')?'':' disabled')+'>'+(f.kind==='profile'?'保存本机合成登记':'保存本机合成文章')+'</button>'+button(s,'cancelForm','取消并关闭编辑',{},true,'cancel')+'</div><p class="muted">填写示例不会自动确认或提交。保存失败或结果未确认时保留原填写，请按明确提示核对。</p></form></section>';
  }
  function progress(p){
   const state=p?.state||'EMPTY',current=state==='APPROVED'?3:state==='SUBMITTED'?2:p?1:0;
   const titles=['登记信息','保存草稿','待演示审核','演示结果'];
   return '<ol class="pr-steps" aria-label="本机合成登记进度">'+titles.map((title,i)=>'<li class="'+(i<current?'done':i===current?'current':'')+'"'+(i===current?' aria-current="step"':'')+'><span aria-hidden="true">'+(i<current?'✓':i+1)+'</span>'+title+'</li>').join('')+'</ol>';
  }
  function articleCheck(a){
   const fields=new Map(list(a.fields).map(f=>[f.key,String(f.value||'')]));
   const checks=[['文章标题',!!String(a.title||'').trim()],['正文内容',!!fields.get('bodyText')?.trim()],['HTTPS 来源格式',/^https:\/\/[^\s]+$/.test(fields.get('sourceUrl')||'')],['适用范围与限制',!!fields.get('applicability')?.trim()&&!!fields.get('limitations')?.trim()]];
   return '<section class="pr-callout"><h3>合成演示声明</h3><p>本内容只在本机演练；不会提交到真实平台。检查项只表示文本是否填写，不验证来源，也不代表营养依据或专业审核。</p></section><ul class="pr-checks">'+checks.map(([label,yes])=>'<li class="'+(yes?'complete':'')+'">'+esc(label)+' · '+(yes?'已填写':'待补充')+'</li>').join('')+'</ul>';
  }
  function author(s){
   const r=s.data.registration;if(!r||s.data.identity.role!=='practitioner')return '';
   const p=r.profile;
   if(s.form)return '';
   return '<section class="section"><div class="pr-heading"><h2>营养师登记演示</h2><span class="badge">非真实认证</span></div><p class="muted">'+esc(r.ownerLabel)+' · 虚构角色</p>'+progress(p)+'<p class="status">'+esc(r.profileLabel)+'</p>'+(p?.validUntil?'<p class="muted">合成状态有效期至 '+esc(p.validUntil)+'</p>':'')+'<details><summary>查看本机登记资料与限制</summary>'+fieldRows(r.profileFields,PROFILE)+'<p class="muted">材料仅为虚构引用；不接收真实证件或照片。修改已审核资料会回到草稿，并可能使合成授权及文章可见性失效。</p></details><div class="actions">'+button(s,'openForm',p?'编辑合成登记':'开始营养师登记演示',{'data-pr-kind':'profile'},true,'write','primary')+button(s,'submitProfile','提交演示登记审核',{},r.canSubmitProfile)+button(s,'withdrawProfile','撤回合成登记',{},r.canWithdrawProfile,'write','danger')+'</div><p class="pr-field-help">保存不等于提交；提交不等于审核通过。需切换至独立合成审核员演练审核，不会自动获得真实资格。</p></section><section class="section"><h2>内容与服务工作台</h2><p class="muted">以下操作均围绕当前虚构角色，不接通真实咨询或服务。</p><div class="pr-tiles"><div class="pr-tile"><span class="pr-icon" aria-hidden="true">▤</span><strong>文章草稿</strong><p>编写合成知识内容</p><div class="actions">'+button(s,'openForm','写新文章',{'data-pr-kind':'article'},!!p)+'</div></div><div class="pr-tile"><span class="pr-icon" aria-hidden="true">◌</span><strong>合成问询</strong><p>处理收到的需求</p><nav class="actions">'+link(s,'#practitioner-workbench','查看邀请 ↗')+'</nav></div><div class="pr-tile"><span class="pr-icon" aria-hidden="true">▣</span><strong>服务计划</strong><p>编辑与预约未接入</p><div class="actions"><button type="button" disabled>暂不开放</button></div></div></div><details><summary>服务说明与当前实现范围</summary><p>现有离线契约支持登记、文章和单类别咨询邀请；没有服务计划保存、审核或预约能力。参考图中的 7 / 14 / 28 天服务只是目标布局，当前不生成虚构订单或预约成功。</p></details></section><section class="section" id="pr-articles"><div class="pr-heading"><h2>文章草稿与发布</h2><span class="badge">'+list(r.articles).length+' 篇本机合成文章</span></div><p class="muted">保存草稿 → 提交演示审核 → 独立合成审核 → 明确本机发布。每一步都保留真实控制器状态。</p><div class="demand-list">'+(list(r.articles).map(a=>'<article class="demand-card"><div class="pr-card-top"><h3>'+esc(a.title)+'</h3><span class="badge">'+esc(a.statusLabel)+'</span></div>'+(a.reasonLabel?'<p class="error">驳回理由：'+esc(a.reasonLabel)+'</p>':'')+'<p class="muted">版本 '+esc(a.version)+' · 内容修订 '+esc(a.contentRevision)+'</p><details><summary>查看内容与发布核对（4 项）</summary><div class="pr-article-preview">'+fieldRows(a.fields,ARTICLE)+'</div>'+articleCheck(a)+'</details><div class="actions">'+button(s,'openForm','编辑文章',{'data-pr-kind':'article','data-pr-id':a.id})+button(s,'submitArticle','提交演示审核',{'data-pr-id':a.id},a.canSubmit,'write','primary')+button(s,'publishArticle','明确本机合成发布',{'data-pr-id':a.id},a.canPublish,'write','blue')+button(s,'withdrawArticle','撤回文章',{'data-pr-id':a.id},a.canWithdraw,'write','danger')+'</div></article>').join('')||'<p class="empty">还没有文章。登记后可创建第一篇本机合成草稿。</p>')+'</div></section>';
  }
  function reviewer(s){
   if(s.data.identity.role!=='reviewer')return '';
   const review=(owner,scenario,id,label,eligible,reason)=>button(s,'reviewAction',label,{'data-pr-owner':owner,'data-pr-scenario':scenario,'data-pr-id':id,...(reason?{'data-pr-reason':reason}:{})},eligible);
   return '<section class="section"><h2>独立合成审核工作台</h2><p class="muted">以下操作只演练审核流程，不验证真实专业资格，不授予真实服务权限。每次确认只处理当前所示的确切版本。</p><div class="demand-list">'+(list(s.data.reviewQueue).map(r=>'<article class="demand-card"><h3>'+esc(r.ownerLabel)+'</h3><p class="status">'+esc(r.profileLabel)+'</p>'+(r.profile?'<p class="muted">申请 '+esc(r.profile.applicationId)+' · 版本 '+esc(r.profile.version)+' / 内容修订 '+esc(r.profile.contentRevision)+'</p>':'')+fieldRows(r.profileFields,PROFILE)+'<div class="actions">'+review(r.owner,'approved',r.profile?.applicationId||'','通过此合成登记',r.canApproveProfile)+review(r.owner,'rejected',r.profile?.applicationId||'','拒绝此合成登记',r.canApproveProfile)+review(r.owner,'revoked',r.profile?.applicationId||'','撤销此合成资格',r.canRevokeProfile)+'</div>'+list(r.articles).map(a=>'<section class="section"><h4>'+esc(a.title)+'</h4><p class="status">'+(esc(a.statusLabel)+(a.reasonLabel?' · 驳回理由：'+esc(a.reasonLabel):''))+'</p><p class="muted">文章 '+esc(a.id)+' · 版本 '+esc(a.version)+' / 内容修订 '+esc(a.contentRevision)+'</p>'+fieldRows(a.fields,ARTICLE)+'<div class="actions">'+review(r.owner,'articleApproved',a.id,'通过此篇合成文章',a.canApprove)+[['SOURCE_INSUFFICIENT','来源资料不足'],['SCOPE_UNCLEAR','适用范围不清'],['LIMITATIONS_INSUFFICIENT','限制说明不足']].map(([reason,label])=>review(r.owner,'articleRejected',a.id,'驳回：'+label,a.canApprove,reason)).join('')+'</div></section>').join('')+'</article>').join('')||'<p class="empty">暂无合成审核记录。</p>')+'</div></section>';
  }
  function prepare(s){
   if(!alive)throw Error('STUDENT_PLATFORM_DISPOSED');
   const box=d.createElement('div'),role=s.data?.identity?.role;
   box.innerHTML='<header>'+link(s,'profile.html','‹ 返回我的')+'<span class="badge">登记与文章 · 次级页面</span></header><p class="muted" data-pr-identity'+(s.data?'':' hidden')+'>'+esc(s.data?.identity?.label||'')+'</p>'+status(s)+(s.data?(role==='practitioner'?author(s)+editor(s):role==='reviewer'?reviewer(s):'<section class="hero"><span class="eyebrow">AI-NUTRI · REGISTRATION DEMO</span><h1>分享知识，从登记开始</h1><p>以虚构营养师角色体验资料登记与内容创作。</p>'+progress(null)+'<div class="pr-callout"><h3>服务说明（未接服务）</h3><p>真实资质认证、证件上传、人工审核、个性化服务与预约均未连接。</p></div><nav class="pr-route-nav">'+link(s,'#pr-persona','选择虚构营养师身份')+'</nav></section>'):'<section class="section"><h2>尚未进入已核对角色</h2><p>两个面板共用同一合成身份。请先完成页面顶部的账号状态核对。</p></section>')+'<details class="section"><summary>恢复操作与合成记录状态</summary>'+recovery(s)+(s.data?.journalUsage?'<p class="muted">合成历史事件 '+esc(s.data.journalUsage.events)+' / '+esc(s.data.journalUsage.maxEvents)+'。达到上限时保留数据，不自动清空。</p>':'')+'</details><footer>离线合成流程 · 不代表真实认证、医疗建议、服务预约或外部发布。</footer>';
   return Array.from(box.childNodes);
  }
  function ticket(el,formRequired=false){
   const integer=name=>{const raw=el.getAttribute(name);return typeof raw==='string'&&/^(0|[1-9]\d*)$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;};
   const render=integer('data-pr-render'),attempt=integer('data-pr-attempt'),form=integer('data-pr-form');
   if(render===null||attempt===null||formRequired&&form===null)return null;
   return {render,attempt,...(form!==null?{form}:{})};
  }
  function own(el){return alive&&el&&root.contains(el)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';}
  function reportUnexpected(){const e=root.querySelector('[data-pr-error]');if(e){e.textContent='操作未完成核对。原填写保留，请刷新状态后再操作。';e.hidden=false;}}
  async function invoke(fn,restore){try{const result=await fn();if(result!==true)restore?.();return result===true;}catch(_){restore?.();if(alive)reportUnexpected();return false;}}
  function input(event){
   const el=event.target;if(!own(el)||el.getAttribute('data-pr-action')!=='editField')return;
   const key=el.getAttribute('data-pr-field'),t=ticket(el,true),form=el.closest?.('form');
   const kind=form?.getAttribute('data-pr-kind'),allowed=kind==='profile'?PROFILE:kind==='article'?ARTICLE:null;
   if(!t||!form||!root.contains(form)||!['INPUT','TEXTAREA'].includes(el.tagName)||!allowed?.has(key))return;
   void invoke(()=>c.editField(key,el.value,t));
  }
  function change(event){const el=event.target;if(!own(el)||el.getAttribute('data-pr-action')!=='setAck'||el.type!=='checkbox')return;const t=ticket(el,true);if(!t)return;const previous=!el.checked;void invoke(()=>c.setAck(!!el.checked,t),()=>{if(alive&&root.contains(el))el.checked=previous;});}
  function save(el){const t=ticket(el,true);if(t)void invoke(()=>c.save(t));}
  function click(event){
   if(!alive||!root.contains(event.target))return;
   const el=event.target.closest?.('[data-pr-action]');if(el?.tagName==='A')event.preventDefault();if(!own(el)||!['BUTTON','A'].includes(el.tagName))return;
   const action=el.getAttribute('data-pr-action');if(!ACTIONS.has(action)||action==='setAck')return;
   event.preventDefault();const t=ticket(el,['sample','save','cancelForm'].includes(action));if(!t)return;
   if(action==='save'){save(el);return;}
   if(action==='refresh')void invoke(()=>c.refresh(t));
   else if(action==='retryInitialize')void invoke(()=>c.retryInitialize(t));
   else if(action==='openForm'){const kind=el.getAttribute('data-pr-kind');if(['profile','article'].includes(kind))void invoke(()=>c.openForm(kind,el.getAttribute('data-pr-id')||null,t)).then(ok=>{if(ok&&alive){const editor=root.querySelector('#pr-editor');editor?.scrollIntoView?.({block:'start'});editor?.querySelector('input,textarea')?.focus?.({preventScroll:true});}});}
   else if(action==='sample')void invoke(()=>c.sample(t));
   else if(action==='cancelForm')void invoke(()=>c.cancelForm(t));
   else if(REQUESTS.has(action))void invoke(()=>c.requestAction(action,el.getAttribute('data-pr-id')||null,t));
   else if(action==='reviewAction'){const owner=el.getAttribute('data-pr-owner'),scenario=el.getAttribute('data-pr-scenario');const reason=el.getAttribute('data-pr-reason');if(scenario==='articleRejected'&&!['SOURCE_INSUFFICIENT','SCOPE_UNCLEAR','LIMITATIONS_INSUFFICIENT'].includes(reason))return;if(OWNERS.has(owner)&&SCENARIOS.has(scenario))void invoke(()=>c.reviewAction(owner,scenario,el.getAttribute('data-pr-id')||null,t,reason||undefined));}
   else if(action==='navigate'){const href=el.getAttribute('href');void invoke(()=>{if(c.confirmNavigation(href,t)!==true)return false;if(!alive)return false;if(href==='#pr-persona'){const chooser=d.getElementById?.('pr-persona')?.closest?.('details');if(chooser)chooser.open=true;}if(typeof w.location?.assign==='function')w.location.assign(href);else if(w.location)w.location.href=href;return true;});}
  }
  function submit(event){
   if(!alive||!root.contains(event.target))return;event.preventDefault();
   const form=event.target;if(!own(form)||form.tagName!=='FORM'||form.getAttribute('data-pr-action')!=='submitForm')return;
   const submitter=event.submitter||form.querySelector('[type="submit"]');if(!own(submitter))return;save(form);
  }
  function updateStatus(s){
   if(!alive)return;
   for(const [key,value] of [['notice',s.notice],['error',s.error]])for(const el of root.querySelectorAll('[data-pr-'+key+']')){el.textContent=String(value||'');el.hidden=!value;}
   for(const el of root.querySelectorAll('[data-pr-unverified]'))el.hidden=!s.data||!!s.authorized;
   for(const el of root.querySelectorAll('[data-pr-identity]')){el.textContent=s.data?.identity?.label||'';el.hidden=!s.data;}
   for(const el of root.querySelectorAll('[data-pr-action]')){
    const policy=el.getAttribute('data-pr-policy');
    if(['refresh','initialize'].includes(policy)){el.setAttribute('data-pr-render',s.render);el.setAttribute('data-pr-attempt',s.attempt);}
    const form=el.getAttribute('data-pr-form'),current=el.getAttribute('data-pr-render')===String(s.render)&&(form===null||form===String(s.form?.serial));
    const yes=current&&enabled(s,policy,el.getAttribute('data-pr-eligible')==='1');
    if(el.tagName==='A')el.setAttribute('aria-disabled',yes?'false':'true');else el.disabled=!yes;
   }
   // Errors and dirty indication may change without replacing focused inputs, values or tickets.
   const liveForm=root.querySelector('#pr-editor');
   if(liveForm&&s.form&&liveForm.getAttribute('data-pr-form')===String(s.form.serial)){
    const errors=new Map(list(s.form.fields).map(f=>[f.key,f.error||s.form.errors?.[f.key]||'']));
    for(const el of liveForm.querySelectorAll('[data-pr-field-error]'))el.textContent=errors.get(el.getAttribute('data-pr-field-error'))||'';
    for(const el of liveForm.querySelectorAll('[data-pr-field]')){if(errors.get(el.getAttribute('data-pr-field')))el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');}
    const dirty=liveForm.querySelector('[data-pr-form-state]');if(dirty)dirty.textContent=s.form.dirty?'当前有未保存填写。':'已打开原版本；保存前请确认全部为合成资料。';
   }
  }
  function clear(message){if(!alive)return;const s={...c.snapshot(),data:null,form:null,authorized:false,notice:message||'原角色已退出，等待重新核对。',error:''};root.replaceChildren(...prepare(s));}
  function dispose(){if(!alive)return;alive=false;root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('submit',submit);for(const el of root.querySelectorAll('[data-pr-action]')){if(el.tagName==='A')el.setAttribute('aria-disabled','true');else el.disabled=true;}}
  root.addEventListener('click',click);root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('submit',submit);
  return Object.freeze({root,prepare,updateStatus,clear,dispose});
 }
 return Object.freeze({buildId:BUILD,create});
});
