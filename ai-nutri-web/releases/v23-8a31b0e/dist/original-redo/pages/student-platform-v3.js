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
    return '<label for="'+id+'">'+esc(field.label)+'</label>'+(field.multiline?'<textarea':'<input type="text"')+' id="'+id+'" name="'+field.key+'"'+meta+' maxlength="'+esc(field.max)+'" aria-describedby="'+id+'-error"'+(error?' aria-invalid="true"':'')+(enabled(s,'form')?'':' disabled')+(field.multiline?'>'+value+'</textarea>':' value="'+value+'">')+'<div id="'+id+'-error" class="error" data-pr-field-error="'+field.key+'">'+esc(error)+'</div>';
   }).join('');
   return '<section class="section"><form id="pr-editor" novalidate data-pr-kind="'+f.kind+'"'+attrs(s,'submitForm',{},true,'form')+'><h2>'+esc(f.title)+'</h2><p class="muted" data-pr-form-state>'+esc(f.dirty?'当前有未保存填写。':'已打开原版本；保存前请确认全部为合成资料。')+'</p>'+fields+(f.kind==='profile'?'<p class="muted">只能填写 SYNTHETIC- 开头的虚构材料引用。不接收真实证件、材料上传或联系方式。</p>':'<p class="muted">正文与来源仅按纯文本保存。来源网址不会被打开或验证；编辑已审核内容需要重新审核。</p>')+'<label class="consent"><input type="checkbox" id="pr-ack"'+attrs(s,'setAck',{},true,'form')+(f.ack?' checked':'')+(enabled(s,'form')?'':' disabled')+'>我确认所有填写均为虚构合成资料，不含真实证件、个人身份或健康资料。</label><div class="actions">'+button(s,'sample','填入虚构示例',{},true,'form')+'<button type="submit" class="primary"'+attrs(s,'save',{},true,'form')+(enabled(s,'form')?'':' disabled')+'>'+(f.kind==='profile'?'保存合成登记草稿':'保存合成文章草稿')+'</button>'+button(s,'cancelForm','取消并关闭编辑',{},true,'cancel')+'</div><p class="muted">填写示例不会自动确认或提交。保存失败或结果未确认时保留原填写，请按明确提示核对。</p></form></section>';
  }
  function author(s){
   const r=s.data.registration;if(!r||s.data.identity.role!=='practitioner')return '';
   const p=r.profile;
   return '<section class="section"><h2>我的合成登记</h2><p class="status">'+esc(r.profileLabel)+'</p><p class="muted">'+esc(r.ownerLabel)+(p?' · 记录版本 '+esc(p.version)+' / 内容修订 '+esc(p.contentRevision):'')+'</p>'+(p?.validUntil?'<p class="muted">合成审核有效期至 '+esc(p.validUntil)+'</p>':'')+fieldRows(r.profileFields,PROFILE)+'<p class="muted">修改已审核资料会回到草稿，需要重新审核；相关服务授权和文章可见性可能失效。</p><div class="actions">'+button(s,'openForm',p?'编辑合成登记':'新建合成登记',{'data-pr-kind':'profile'})+button(s,'submitProfile','提交合成登记审核',{},r.canSubmitProfile)+button(s,'withdrawProfile','撤回合成登记',{},r.canWithdrawProfile,'write','danger')+'</div></section><section class="section"><h2>我的合成文章</h2><p class="muted">文章需要独立合成审核，批准后还需明确发布。发布范围仅限本机合成演练。</p><div class="actions">'+button(s,'openForm','新建合成文章',{'data-pr-kind':'article'},!!p)+'</div><div class="demand-list">'+(list(r.articles).map(a=>'<article class="demand-card"><h3>'+esc(a.title)+'</h3><p class="status">'+(esc(a.statusLabel)+(a.reasonLabel?' · 驳回理由：'+esc(a.reasonLabel):''))+'</p><p class="muted">文章 '+esc(a.id)+' · 版本 '+esc(a.version)+' / 内容修订 '+esc(a.contentRevision)+'</p>'+fieldRows(a.fields,ARTICLE)+'<div class="actions">'+button(s,'openForm','编辑此合成文章',{'data-pr-kind':'article','data-pr-id':a.id})+button(s,'submitArticle','提交文章合成审核',{'data-pr-id':a.id},a.canSubmit)+button(s,'publishArticle','本机合成发布',{'data-pr-id':a.id},a.canPublish)+button(s,'withdrawArticle','撤回此合成文章',{'data-pr-id':a.id},a.canWithdraw,'write','danger')+'</div></article>').join('')||'<p class="empty">尚无合成文章。</p>')+'</div></section>';
  }
  function reviewer(s){
   if(s.data.identity.role!=='reviewer')return '';
   const review=(owner,scenario,id,label,eligible,reason)=>button(s,'reviewAction',label,{'data-pr-owner':owner,'data-pr-scenario':scenario,'data-pr-id':id,...(reason?{'data-pr-reason':reason}:{})},eligible);
   return '<section class="section"><h2>独立合成审核工作台</h2><p class="muted">以下操作只演练审核流程，不验证真实专业资格，不授予真实服务权限。每次确认只处理当前所示的确切版本。</p><div class="demand-list">'+(list(s.data.reviewQueue).map(r=>'<article class="demand-card"><h3>'+esc(r.ownerLabel)+'</h3><p class="status">'+esc(r.profileLabel)+'</p>'+(r.profile?'<p class="muted">申请 '+esc(r.profile.applicationId)+' · 版本 '+esc(r.profile.version)+' / 内容修订 '+esc(r.profile.contentRevision)+'</p>':'')+fieldRows(r.profileFields,PROFILE)+'<div class="actions">'+review(r.owner,'approved',r.profile?.applicationId||'','通过此合成登记',r.canApproveProfile)+review(r.owner,'rejected',r.profile?.applicationId||'','拒绝此合成登记',r.canApproveProfile)+review(r.owner,'revoked',r.profile?.applicationId||'','撤销此合成资格',r.canRevokeProfile)+'</div>'+list(r.articles).map(a=>'<section class="section"><h4>'+esc(a.title)+'</h4><p class="status">'+(esc(a.statusLabel)+(a.reasonLabel?' · 驳回理由：'+esc(a.reasonLabel):''))+'</p><p class="muted">文章 '+esc(a.id)+' · 版本 '+esc(a.version)+' / 内容修订 '+esc(a.contentRevision)+'</p>'+fieldRows(a.fields,ARTICLE)+'<div class="actions">'+review(r.owner,'articleApproved',a.id,'通过此篇合成文章',a.canApprove)+[['SOURCE_INSUFFICIENT','来源资料不足'],['SCOPE_UNCLEAR','适用范围不清'],['LIMITATIONS_INSUFFICIENT','限制说明不足']].map(([reason,label])=>review(r.owner,'articleRejected',a.id,'驳回：'+label,a.canApprove,reason)).join('')+'</div></section>').join('')+'</article>').join('')||'<p class="empty">暂无合成审核记录。</p>')+'</div></section>';
  }
  function prepare(s){
   if(!alive)throw Error('STUDENT_PLATFORM_DISPOSED');
   const box=d.createElement('div'),role=s.data?.identity?.role;
   box.innerHTML='<header>'+link(s,'profile.html','‹ 返回个人主页')+'<span class="badge">离线合成演练</span></header><section class="hero"><span class="eyebrow">AI-NUTRI · 营养师登记与发布</span><h1>分享知识，从登记开始</h1><p>合成登记 → 提交审核 → 查看结果 → 撰写文章 → 独立审核 → 本机合成发布</p><p class="muted">真实人工审核、证件上传、外部资质验证与真实服务均未接入。不要填写真实证件、身份或健康资料。</p><p data-pr-identity'+(s.data?'':' hidden')+'>'+esc(s.data?.identity?.label||'')+'</p><div class="actions">'+link(s,'#pr-persona','前往统一演练身份选择')+'</div></section>'+status(s)+(s.data?(role==='practitioner'?author(s)+editor(s):role==='reviewer'?reviewer(s):'<section class="section"><h2>登记与文章发布</h2><p>当前为合成访客。请在上方统一身份选择中切换至虚构营养师填写登记，或切换至独立合成审核员演练审核。</p></section>'):'<section class="section"><h2>尚未进入已核对角色</h2><p>两个面板共用同一角色与账号状态。请重试进入，或先完成页面顶部的合成账号核对。</p></section>')+'<section class="section">'+recovery(s)+(s.data?.journalUsage?'<p class="muted">合成历史事件 '+esc(s.data.journalUsage.events)+' / '+esc(s.data.journalUsage.maxEvents)+'。达到上限时保留已有数据，不自动清空或裁剪。</p>':'')+'</section><footer>本界面仅为隔离合成流程；不代表真实认证、诊疗、浏览器或手机端验收完成。</footer>';
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
   else if(action==='openForm'){const kind=el.getAttribute('data-pr-kind');if(['profile','article'].includes(kind))void invoke(()=>c.openForm(kind,el.getAttribute('data-pr-id')||null,t));}
   else if(action==='sample')void invoke(()=>c.sample(t));
   else if(action==='cancelForm')void invoke(()=>c.cancelForm(t));
   else if(REQUESTS.has(action))void invoke(()=>c.requestAction(action,el.getAttribute('data-pr-id')||null,t));
   else if(action==='reviewAction'){const owner=el.getAttribute('data-pr-owner'),scenario=el.getAttribute('data-pr-scenario');const reason=el.getAttribute('data-pr-reason');if(scenario==='articleRejected'&&!['SOURCE_INSUFFICIENT','SCOPE_UNCLEAR','LIMITATIONS_INSUFFICIENT'].includes(reason))return;if(OWNERS.has(owner)&&SCENARIOS.has(scenario))void invoke(()=>c.reviewAction(owner,scenario,el.getAttribute('data-pr-id')||null,t,reason||undefined));}
   else if(action==='navigate'){const href=el.getAttribute('href');void invoke(()=>{if(c.confirmNavigation(href,t)!==true)return false;if(!alive)return false;if(typeof w.location?.assign==='function')w.location.assign(href);else if(w.location)w.location.href=href;return true;});}
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
