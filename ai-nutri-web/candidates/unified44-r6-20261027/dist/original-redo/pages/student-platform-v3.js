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
 const BUILD='registration-web-service-v4-c1';
 const PROFILE=new Set(['displayName','biography','practiceScope','credentialType','credentialIssuer','credentialJurisdiction','credentialClaimRef']);
 const SERVICE_AUDIENCES={WEIGHT:'体重管理',BALANCE:'均衡饮食',OFFICE:'上班族',STUDENT:'学生党',OLDER:'中老年'};
 const ARTICLE=new Set(['title','bodyText','sourceUrl','sourceTitle','sourceDate','applicability','limitations']);
 const REQUESTS=new Set(['submitProfile','withdrawProfile','submitArticle','publishArticle','withdrawArticle']);
 const SCENARIOS=new Set(['approved','rejected','revoked','articleApproved','articleRejected']);
 const OWNERS=new Set(['fictional-lin','fictional-zhou']);
 const ACTIONS=new Set(['refresh','retryInitialize','openForm','sample','save','cancelForm','setAck','reviewAction','navigate','previewService','closeServicePreview','serviceChoice','viewService','planSubmit','planWithdraw','planApprove','planReject','enableServicePlans',...REQUESTS]);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const list=x=>Array.isArray(x)?x:[];
 function create(options={}){
  const {root,controller:c}=options,d=options.document||root?.ownerDocument,w=options.window||{};
  if(!root||!d||typeof d.createElement!=='function'||typeof root.replaceChildren!=='function'||typeof root.addEventListener!=='function'||!c||typeof c.snapshot!=='function')throw Error('STUDENT_PLATFORM_ROOT_REQUIRED');
  let alive=true;
  function attrs(s,action,extra={},eligible=true,policy='write'){
   const a={'data-pr-action':action,'data-pr-render':s.render,'data-pr-attempt':s.attempt,'data-pr-eligible':eligible?'1':'0','data-pr-policy':policy,...((policy==='form'||policy==='cancel')&&s.form?{'data-pr-form':s.form.serial}:{}),...extra};
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
  function icon(name){
   const paths={people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 2 4v2"/>',leaf:'<path d="M5 20C1 9 10 3 21 3c0 11-6 19-16 17Zm0 0L17 7"/>',chart:'<path d="M5 20v-7m7 7V8m7 12V3"/>',file:'<path d="M6 2h8l5 5v15H6V2Zm8 0v6h5M9 12h7m-7 4h7"/>',certificate:'<rect x="4" y="3" width="16" height="15" rx="2"/><circle cx="12" cy="10" r="3"/><path d="m10 13-1 9 3-2 3 2-1-9"/>',card:'<rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 17c0-4 6-4 6 0m3-7h5m-5 4h5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'};
   return '<svg class="pr09-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.file)+'</svg>';
  }
  function serviceNote(){return '<aside class="pr09-service">'+icon('info')+'<div><h3>服务说明（未接服务）</h3><p>当前仅为营养师登记与内容创作演示。真实认证、图片上传、个性化建议与预约服务均未接入。</p></div></aside>';}
  function landing(s){
   const practitioner=s.data?.identity?.role==='practitioner';
   return '<section class="pr09-landing" data-pr09-screen="entry"><div class="pr09-hero"><div class="pr09-hero-copy"><span class="pr09-eyebrow">AI-NUTRI · 合成演示</span><h1>营养师<br>登记演示</h1><p>以下为虚构营养师示例，<br>仅用于演示流程。</p></div><img class="pr09-hero-portrait" src="images/nutrition-companion-photo-v2.png" width="224" height="280" alt="AI 生成的虚构营养师形象，非真实专业人员"></div><section class="section pr09-benefits"><h2>加入后你可以</h2><div class="pr09-benefit-grid"><div><span class="pr09-symbol coral">'+icon('people')+'</span><h3>分享营养知识</h3><p>创作合成文章<br>与展示内容</p></div><div><span class="pr09-symbol green">'+icon('leaf')+'</span><h3>演练需求互动</h3><p>合成咨询与邀请<br>不提供真实建议</p></div><div><span class="pr09-symbol blue">'+icon('chart')+'</span><h3>整理专业展示</h3><p>登记虚构资料<br>管理本机草稿</p></div></div></section><section class="section pr09-process"><div class="pr-heading"><h2>合成流程</h2><span class="pr09-caption">本机演练</span></div>'+progress(null)+'<div class="pr09-start">'+(practitioner?button(s,'openForm','开始营养师登记演示  ›',{'data-pr-kind':'profile'},true,'write','primary'):link(s,'#pr-persona','选择虚构营养师，开始登记  ›'))+'</div></section>'+serviceNote()+'</section>';
  }

  function previewNotice(saved=false){if(saved)return '<p class="pr10-preview-note" role="note">本浏览器合成记录 · 非真实认证、预约或个性化营养方案。审核状态只描述本机演练。</p>';return '<p class="pr10-preview-note" role="note">仅本页未持久预览 · 尚未保存或提交审核。刷新、离页或切换角色后不保留；不提供真人服务。</p>';}
  function serviceEditor(s){
   const f=s.form,fields=new Map(f.fields.map(x=>[x.key,x]));
   const row=(key,label,max,multiline=false)=>{const field=fields.get(key),id='pr-service-'+key,error=f.errors?.[key]||'';return '<div class="pr10-field"><div class="pr10-field-heading"><label for="'+id+'">'+label+' <span aria-hidden="true">*</span></label><span data-pr10-count="'+key+'">'+field.value.length+'/'+max+'</span></div>'+(multiline?'<textarea':'<input type="text"')+' id="'+id+'" name="'+key+'"'+attrs(s,'editField',{'data-pr-field':key},true,'form')+' maxlength="'+max+'" required aria-describedby="'+id+'-error"'+(error?' aria-invalid="true"':'')+(enabled(s,'form')?'':' disabled')+(multiline?'>'+esc(field.value)+'</textarea>':' value="'+esc(field.value)+'">')+'<p class="error" id="'+id+'-error" data-pr-field-error="'+key+'" role="alert">'+esc(error)+'</p></div>';};
   const choices=(key,label,items)=>'<fieldset class="pr10-field pr10-choice-group"><legend>'+label+' <span aria-hidden="true">*</span></legend><p class="pr10-help">'+(key==='audiences'?'仅为展示标签，可多选；不是对任何人的适用性评估。':'仅为参考图中的展示时长；不生成医学或个体化饮食方案。')+'</p><div class="pr10-choices">'+items.map(([value,text])=>'<label><input type="'+(key==='duration'?'radio':'checkbox')+'" name="service-'+key+'" value="'+value+'"'+attrs(s,'serviceChoice',{'data-pr-choice':key},true,'form')+' aria-describedby="pr-service-'+key+'-error"'+((key==='duration'?f.duration===value:f.audiences.includes(value))?' checked':'')+(enabled(s,'form')?'':' disabled')+'><span>'+esc(text)+'</span></label>').join('')+'</div><p class="error" id="pr-service-'+key+'-error" data-pr-field-error="'+key+'" role="alert">'+esc(f.errors?.[key]||'')+'</p></fieldset>';
   return '<section class="pr10-editor" data-pr10-screen="editor"><form id="pr-editor" novalidate data-pr-kind="service-preview"'+attrs(s,'previewSubmit',{},true,'form')+'><header class="pr09-page-heading">'+button(s,'cancelForm','‹',{'aria-label':'返回并取消服务编辑'},true,'cancel','pr09-back')+'<h1>编辑服务</h1><span></span></header><p class="pr09-page-subtitle">编辑虚构展示内容，先保存草稿再提交演示审核</p>'+previewNotice(f.persistentAvailable)+'<p class="muted" data-pr-form-state>'+esc(f.dirty?'当前有未保存填写。':'填写仅作合成用途；保存前不会覆盖已有记录。')+'</p><section class="section pr10-form-card">'+row('title','服务标题',30)+choices('audiences','展示人群',Object.entries(SERVICE_AUDIENCES))+choices('duration','展示时长',[['7','7天'],['14','14天'],['28','28天']])+row('description','服务说明',500,true)+'</section><div class="pr09-sample-action">'+button(s,'sample','填入虚构预览示例',{},true,'form')+'</div><div class="actions pr09-form-actions">'+button(s,'save','保存本机草稿',{},f.persistentAvailable,'form','primary')+button(s,'planSubmit','提交演示审核',{'data-pr-id':f.recordId||''},f.persistentAvailable&&f.canSubmit,'write','blue')+'</div><div class="actions">'+button(s,'cancelForm','取消编辑',{},true,'cancel')+button(s,'previewService','仅预览未保存内容',{},true,'form')+'</div><p class="pr10-help">'+(f.persistentAvailable?'新建或修改后请先保存，再从当前已保存版本提交演示审核。':'当前未启用服务持久格式；可临时预览，但保存与审核不会冒充已接入。')+'请勿输入真实身份、病情、检查指标或任何个人健康资料。</p></form></section>';
  }
  function serviceDetail(s){
   const p=s.servicePreview;if(!p)return '';const saved=p.persistent===true;
   return '<section class="pr10-detail" data-pr10-screen="detail"><header class="pr09-page-heading">'+button(s,'closeServicePreview','‹',{'aria-label':saved?'返回工作台，保留已保存计划':'关闭未保存预览并返回工作台'},true,'cancel','pr09-back')+'<h1 tabindex="-1" data-pr10-detail-heading>服务详情</h1><span></span></header>'+previewNotice(saved)+'<div data-pr10-preview-content><section class="section pr10-detail-card"><div class="pr10-detail-title"><h2>'+esc(p.title)+'</h2><span class="badge">'+esc(saved?p.statusLabel:'未提交预览')+'</span></div><figure class="pr10-service-photo"><img src="../assets/recipes/shrimp-quinoa-original.png" width="1254" height="1254" alt="既有合成餐食示意图，不是为您生成的饮食方案"><figcaption>仅示意配图，不表示所选人群或个人的适用餐食。</figcaption></figure><dl class="pr10-facts"><div><dt>展示时长</dt><dd>'+esc(p.duration)+'天</dd></div><div><dt>展示人群</dt><dd>'+p.audiences.map(k=>esc(SERVICE_AUDIENCES[k])).join('、')+'</dd></div><div><dt>服务状态</dt><dd>'+esc(saved?p.statusLabel:'未保存')+'</dd></div></dl></section><section class="section"><h2>服务说明</h2><p class="pr10-description">'+esc(p.description)+'</p></section><section class="section"><h2>适用范围与限制</h2><p>以上人群与时长仅用于界面展示，不是健康评估、营养处方或任何人的适用性结论。</p><p>不生成每日处方、营养目标或治疗方案；未接真人营养师、专业审核与实际预约。</p></section>'+(saved?'<p class="muted">本机版本 '+esc(p.version)+' · 内容修订 '+esc(p.contentRevision)+'</p>':'')+'<div class="actions">'+(!saved||p.canEdit?button(s,'openForm',saved?'编辑此合成计划':'返回编辑未保存内容',{'data-pr-kind':'service-preview','data-pr-id':p.recordId||''}):'')+(saved&&p.canSubmit?button(s,'planSubmit','提交演示审核',{'data-pr-id':p.id},true,'write','primary'):'')+(saved&&p.canWithdraw?button(s,'planWithdraw','撤回本机合成服务',{'data-pr-id':p.id},true,'write','danger'):'')+(saved&&p.canReview?button(s,'planApprove','通过此合成服务',{'data-pr-id':p.id})+button(s,'planReject','拒绝此合成服务',{'data-pr-id':p.id}):'')+'</div><button type="button" disabled aria-disabled="true" class="pr10-booking">预约服务（未连接真人服务）</button></div></section>';
  }
  function serviceList(s,kind){
   const plans=s.data?.servicePlans,rows=list(plans?.[kind]);if(!plans?.available)return kind==='owned'?'<section class="section" data-pr-services-unavailable><h2>服务计划保存尚未启用</h2><p>已有合法持久schema3可明确备份升级；临时演示不能冒充持久保存。</p>'+button(s,'enableServicePlans','明确备份并启用本机服务计划',{},s.canEnableServicePlans===true)+'<p class="error">统一候选仍待完整及真实浏览器验收；旧版缓存页不兼容schema4，不得混用。暂不可发布或在真实账号执行；只使用合成数据。</p></section>':'';
   const title=kind==='owned'?'本机服务计划':kind==='reviewQueue'?'待演示审核的服务计划':'本机合成服务展示';
   return '<section class="section" data-pr-service-list="'+kind+'"><div class="pr-heading"><h2>'+title+'</h2><span class="pr09-caption">'+rows.length+'份</span></div><p class="muted">仅合成记录；不是实际专业审核或预约。</p><div class="demand-list">'+(rows.map(p=>'<article class="demand-card"><div class="pr-card-top"><h3>'+esc(p.content.title)+'</h3><span class="badge">'+esc(p.statusLabel)+'</span></div><p>'+esc(p.content.durationDays)+'天展示标签 · 版本 '+esc(p.version)+'</p><div class="actions">'+button(s,'viewService','查看当前详情',{'data-pr-id':p.id})+(p.canEdit?button(s,'openForm','编辑草稿',{'data-pr-kind':'service-preview','data-pr-id':p.id}):'')+(p.canSubmit?button(s,'planSubmit','提交演示审核',{'data-pr-id':p.id}):'')+(p.canWithdraw?button(s,'planWithdraw','撤回',{'data-pr-id':p.id}):'')+(p.canReview?button(s,'planApprove','合成通过',{'data-pr-id':p.id})+button(s,'planReject','合成拒绝',{'data-pr-id':p.id}):'')+'</div></article>').join('')||'<p class="empty">暂无此类合成计划。</p>')+'</div></section>';
  }

  function workbench(s,r){
   const p=r.profile,articles=list(r.articles);
   if(!p)return registrationStatus(s,r);
   return '<section class="pr10-workbench" data-pr10-screen="workbench"><header class="pr10-workbench-heading"><h1>营养师工作台</h1><p>整理本机合成内容与服务草稿。</p></header><section class="section pr10-welcome"><div><h2>'+esc(r.ownerLabel)+'</h2><p>虚构营养师角色 · 非真实专业人员<br>本机演练，不提供个性化健康建议。</p></div><img src="images/nutrition-companion-photo-v2.png" width="90" height="90" alt="AI生成的虚构角色示意头像"></section><div class="pr10-tiles"><section class="pr10-tile blue"><span class="pr09-symbol blue">'+icon('file')+'</span><h2>文章草稿</h2><p>编写本机合成<br>知识内容</p>'+button(s,'openForm','编辑文章 ›',{'data-pr-kind':'article'},true,'write')+'</section><section class="pr10-tile coral"><span class="pr09-symbol coral">'+icon('people')+'</span><h2>合成问询</h2><p>查看收到的<br>合成需求</p>'+link(s,'#practitioner-workbench','查看邀请 ›')+'</section><section class="pr10-tile green"><span class="pr09-symbol green">'+icon('card')+'</span><h2>服务计划</h2><p>保存合成草稿<br>演练明确审核</p>'+button(s,'openForm','编辑服务 ›',{'data-pr-kind':'service-preview'},true,'write')+'</section></div><section class="section pr10-recent"><div class="pr-heading"><h2>近期文章</h2><span class="pr09-caption">'+articles.length+'篇本机记录</span></div>'+(articles.slice(-3).reverse().map(a=>'<div class="pr10-recent-row"><span class="pr10-recent-icon">'+icon('file')+'</span><div><h3>'+esc(a.title)+'</h3><p>'+esc(a.statusLabel)+' · 修订 '+esc(a.contentRevision)+'</p></div>'+button(s,'openForm','›',{'data-pr-kind':'article','data-pr-id':a.id,'aria-label':'编辑文章：'+a.title},true,'write')+'</div>').join('')||'<p class="empty">暂无文章。你可以先创建一篇合成草稿。</p>')+'</section><div class="pr10-registration-short"><span>'+esc(r.profileLabel)+'</span>'+button(s,'openForm','编辑合成登记',{'data-pr-kind':'profile'})+'</div><details class="pr10-registration-details"><summary>登记进度与合成状态</summary>'+registrationStatus(s,r)+'</details><p class="pr10-help">服务计划只在本机合成账号演练；是否可保存以当前明确升级及回执为准。预约始终未连接。</p></section>';
  }

  function editor(s){
   const f=s.form;if(!f)return '';if(f.kind==='service-preview')return serviceEditor(s);const allowed=f.kind==='profile'?PROFILE:f.kind==='article'?ARTICLE:null;if(!allowed)throw Error('REGISTRATION_FORM_KIND');
   const seen=new Set(),fields=new Map();
   for(const field of list(f.fields).filter(field=>allowed.has(field.key)&&!seen.has(field.key)&&seen.add(field.key))){
    const id='pr-'+f.kind+'-'+field.key,value=esc(field.value),error=field.error||f.errors?.[field.key]||'',meta=attrs(s,'editField',{'data-pr-field':field.key},true,'form');
    fields.set(field.key,'<div class="pr09-field pr09-field-'+field.key+'"><label for="'+id+'">'+esc(field.label)+'</label><div class="pr09-field-control">'+(field.multiline?'<textarea':'<input type="'+(field.key==='sourceUrl'?'url':field.key==='sourceDate'?'date':'text')+'"')+' id="'+id+'" name="'+field.key+'"'+meta+' maxlength="'+esc(field.max)+'" aria-describedby="'+id+'-error'+(field.key==='sourceUrl'?' '+id+'-help':'')+'"'+(error?' aria-invalid="true"':'')+(enabled(s,'form')?'':' disabled')+(field.multiline?'>'+value+'</textarea>':' value="'+value+'">')+'<div id="'+id+'-error" class="error" data-pr-field-error="'+field.key+'">'+esc(error)+'</div>'+(field.key==='sourceUrl'?'<p class="pr-field-help" id="'+id+'-help">仅填写 HTTPS 网址，例如 https://example.invalid/synthetic-source。示例地址是占位文本，未访问、未核验；不要把此说明填入网址。</p>':'')+'</div></div>');
   }
   const profile=f.kind==='profile',get=key=>fields.get(key)||'';
   const content=profile?'<section class="section pr09-basic"><h2>基本信息</h2>'+get('displayName')+'<div class="pr09-avatar-row"><span>示例头像</span><img src="images/nutrition-companion-photo-v2.png" width="70" height="70" alt="固定虚构角色示例头像"><span class="pr09-caption">仅展示 · 不支持更换</span></div>'+get('practiceScope')+get('biography')+'</section><section class="section pr09-materials"><div class="pr-heading"><h2>资质材料</h2><span class="pr09-caption">仅虚构引用</span></div><div class="pr09-material-grid">'+[['file','学历证明'],['certificate','相关证书'],['card','其他材料']].map(([name,label])=>'<div>'+icon(name)+'<h3>'+label+'</h3><p>图片上传未接入</p></div>').join('')+'</div><p class="pr-field-help">不选择、不接收真实证件或照片。下方仅保存 SYNTHETIC- 开头的虚构材料引用。</p>'+get('credentialType')+get('credentialIssuer')+get('credentialJurisdiction')+get('credentialClaimRef')+'</section>':'<section class="section">'+Array.from(fields.values()).join('')+'<p class="muted">正文与来源仅按纯文本保存。来源网址不会被打开或验证；编辑已审核内容需要重新审核。</p></section>';
   return '<section class="pr09-editor" data-pr09-screen="'+(profile?'application':'article')+'"><form id="pr-editor" novalidate data-pr-kind="'+f.kind+'"'+attrs(s,'submitForm',{},true,'form')+'><header class="pr09-page-heading">'+button(s,'cancelForm','‹',{'aria-label':'返回并关闭编辑'},true,'cancel','pr09-back')+'<h1>'+(profile?'申请登记':'编辑文章')+'</h1><span class="pr09-heading-spacer" aria-hidden="true"></span></header><p class="pr09-page-subtitle">'+(profile?'填写虚构信息，保存后可进入演示审核流程。':'仅编写本机合成内容，不构成健康建议。')+'</p><p class="muted" data-pr-form-state>'+esc(f.dirty?'当前有未保存填写。':'已打开原版本；保存前请确认全部为合成资料。')+'</p>'+content+'<section class="pr09-form-finish"><label class="consent"><input type="checkbox" id="pr-ack" aria-describedby="pr-ack-error"'+attrs(s,'setAck',{},true,'form')+(f.ack?' checked':'')+(enabled(s,'form')?'':' disabled')+'>我确认所有填写均为虚构合成资料，不含真实证件、个人身份或健康资料。</label><p id="pr-ack-error" class="error" data-pr-ack-error role="alert" hidden></p><div class="pr09-sample-action">'+button(s,'sample','填入虚构示例',{},true,'form')+'</div><div class="actions pr09-form-actions">'+button(s,'cancelForm','取消编辑',{},true,'cancel')+'<button type="submit" class="primary"'+attrs(s,'save',{},true,'form')+(enabled(s,'form')?'':' disabled')+'>'+(profile?'保存本机草稿':'保存合成文章')+'</button></div><p class="pr-field-help">保存不等于提交审核。填写示例不会自动确认或提交；保存失败时保留原填写。</p></section></form></section>';
  }
  function progress(p){
   const titles=['登记信息','保存草稿','演示审核','查看结果'],sub=['基本资料','虚构引用','独立角色','非真实认证'];
   return '<ol class="pr-steps pr09-steps" aria-label="本机合成登记流程">'+titles.map((title,i)=>'<li><span aria-hidden="true">'+(i+1)+'</span><strong>'+title+'</strong><small>'+sub[i]+'</small></li>').join('')+'</ol>';
  }
  function registrationStatus(s,r){
   const p=r.profile;if(!p)return landing(s);
   const state=p.state,terminal=['APPROVED','REJECTED','REVOKED','WITHDRAWN'].includes(state),submitted=state==='SUBMITTED',known=['DRAFT','SUBMITTED','APPROVED','REJECTED','REVOKED','WITHDRAWN'].includes(state);
   const steps=[['资料已在本机保存','仅保存虚构文本与材料引用，不包含已上传图片。'],[submitted?'待演示审核':terminal?'本轮合成流程':'待提交演示审核',submitted?'需切换至独立合成审核员，手动核对此确切版本。':terminal?'本轮状态以当前记录为准；不是实际执业认证。':'草稿尚未提交，保存不会自动触发审核。'],['独立合成审核',state==='WITHDRAWN'?'登记已撤回；不能据此认定曾完成审核。':terminal?'本轮处理已结束，请查看下方当前状态。':'尚未执行；不存在后台自动审核。'],[terminal?r.profileLabel:'查看演示结果',terminal?'此结果仅限本机演练，不授予真实资格或服务权限。':'结果未产生，不代表已通过。']];
   return '<section class="pr09-status-screen" data-pr09-screen="progress"><header class="pr09-page-heading">'+link(s,'profile.html','‹ 返回我的')+'<h1>登记进度</h1><span class="pr09-heading-spacer" aria-hidden="true"></span></header><p class="pr09-page-subtitle">以下为平台合成流程，非真实执业认证。</p><section class="section pr09-timeline-card"><p class="pr09-current-status">当前状态：<strong>'+esc(r.profileLabel)+'</strong></p><ol class="pr09-timeline" aria-label="当前合成登记进度">'+steps.map(([title,detail],i)=>'<li class="'+(i===0?'done':known&&((terminal&&i===3)||(!terminal&&i===1))?'current':'waiting')+'"'+(known&&((terminal&&i===3)||(!terminal&&i===1))?' aria-current="step"':'')+'><span class="pr09-step-number" aria-hidden="true">'+(i===0?'✓':i+1)+'</span><div><h2>'+esc(title)+'</h2><p>'+esc(detail)+'</p></div></li>').join('')+'</ol>'+(p.validUntil?'<p class="pr-field-help">合成状态有效期至 '+esc(p.validUntil)+'；是否可用以当前状态为准。</p>':'')+'</section><section class="section pr09-saved-material"><div class="pr-heading"><h2>已保存的资料</h2><span class="pr09-caption">虚构文本 · 非图片</span></div><div class="pr09-record-row"><span class="pr09-record-symbol">'+icon('people')+'</span><div><h3>个人信息</h3><p>'+esc(r.ownerLabel)+'</p></div><span class="pr09-record-label">本机记录</span></div><div class="pr09-record-row"><span class="pr09-record-symbol warm">'+icon('certificate')+'</span><div><h3>材料引用</h3><p>'+esc(list(r.profileFields).find(f=>f.key==='credentialClaimRef')?.value||'未填写')+'</p></div><span class="pr09-record-label">非实际上传</span></div><details><summary>查看全部登记资料与限制</summary>'+fieldRows(r.profileFields,PROFILE)+'<p class="muted">修改已审核资料会回到草稿，并可能使合成授权及文章可见性失效。</p></details><div class="actions">'+button(s,'openForm','编辑合成登记',{'data-pr-kind':'profile'})+button(s,'submitProfile','提交演示登记审核',{},r.canSubmitProfile,'write','primary')+button(s,'withdrawProfile','撤回合成登记',{},r.canWithdrawProfile,'write','danger')+'</div><nav class="pr-route-nav">'+link(s,'#pr-persona','切换独立合成审核员  ›')+'</nav></section>'+serviceNote()+'</section>';
  }
  function articleCheck(a){
   const fields=new Map(list(a.fields).map(f=>[f.key,String(f.value||'')]));
   const checks=[['文章标题',!!String(a.title||'').trim()],['正文内容',!!fields.get('bodyText')?.trim()],['HTTPS 来源格式',/^https:\/\/[^\s]+$/.test(fields.get('sourceUrl')||'')],['适用范围与限制',!!fields.get('applicability')?.trim()&&!!fields.get('limitations')?.trim()]];
   return '<section class="pr-callout"><h3>合成演示声明</h3><p>本内容只在本机演练；不会提交到真实平台。检查项只表示文本是否填写，不验证来源，也不代表营养依据或专业审核。</p></section><ul class="pr-checks">'+checks.map(([label,yes])=>'<li class="'+(yes?'complete':'')+'">'+esc(label)+' · '+(yes?'已填写':'待补充')+'</li>').join('')+'</ul>';
  }
  function articleOverview(s,articles){
   if(s.authorized!==true)return '<p class="muted" data-pr-article-overview>状态尚未核对，暂不显示文章统计。</p>';
   const labels={DRAFT:'草稿',SUBMITTED:'待演示审核',APPROVED:'审核通过未发布',PUBLISHED:'本机已发布且当前可见',HIDDEN:'曾发布当前不可见',REJECTED:'未通过',WITHDRAWN:'已撤回',UNKNOWN:'状态待核对'},counts={};
   for(const a of list(articles)){const key=a.state==='PUBLISHED'?(a.publiclyVisible===true?'PUBLISHED':'HIDDEN'):Object.hasOwn(labels,a.state)&&!['HIDDEN','UNKNOWN'].includes(a.state)?a.state:'UNKNOWN';counts[key]=(counts[key]||0)+1;}
   return '<dl class="pr-article-counts" data-pr-article-overview aria-label="同一文章列表的只读状态统计"><div><dt>全部</dt><dd>'+list(articles).length+'</dd></div>'+Object.entries(labels).filter(([key])=>counts[key]).map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+counts[key]+'</dd></div>').join('')+'</dl>';
  }
  function articleExcerpt(s,a){
   if(s.authorized!==true)return '';
   const value=list(a.fields).find(f=>f.key==='bodyText')?.value,text=typeof value==='string'?value.replace(/\s+/g,' ').trim():'',chars=Array.from(text);
   return '<p class="pr-article-excerpt" data-pr-article-excerpt><span>正文节选 · 非 AI 摘要</span>'+esc(chars.length?chars.slice(0,72).join('')+(chars.length>72?'…':''):'正文尚未填写')+'</p>';
  }
  function author(s){
   const r=s.data.registration;if(!r||s.data.identity.role!=='practitioner')return '';
   const p=r.profile;
   if(s.form)return '';
   if(s.servicePreview)return serviceDetail(s);
   return workbench(s,r)+serviceList(s,'owned')+'<details class="pr10-all-articles"><summary>全部文章与发布操作</summary><section class="section" id="pr-articles"><div class="pr-heading"><h2>文章草稿与发布</h2><span class="badge">'+list(r.articles).length+' 篇本机合成文章</span></div><p class="muted">保存草稿 → 提交演示审核 → 独立合成审核 → 明确本机发布。每一步都保留真实控制器状态。</p>'+articleOverview(s,r.articles)+'<div class="demand-list">'+(list(r.articles).map(a=>'<article class="demand-card"><div class="pr-card-top"><h3>'+esc(a.title)+'</h3><span class="badge">'+esc(a.statusLabel)+'</span></div>'+(a.reasonLabel?'<p class="error">驳回理由：'+esc(a.reasonLabel)+'</p>':'')+articleExcerpt(s,a)+'<p class="muted">版本 '+esc(a.version)+' · 内容修订 '+esc(a.contentRevision)+'</p><details><summary>查看内容与发布核对（4 项）</summary><div class="pr-article-preview">'+fieldRows(a.fields,ARTICLE)+'</div>'+articleCheck(a)+'</details><div class="actions">'+button(s,'openForm','编辑文章',{'data-pr-kind':'article','data-pr-id':a.id})+button(s,'submitArticle','提交演示审核',{'data-pr-id':a.id},a.canSubmit,'write','primary')+button(s,'publishArticle','明确本机合成发布',{'data-pr-id':a.id},a.canPublish,'write','blue')+button(s,'withdrawArticle','撤回文章',{'data-pr-id':a.id},a.canWithdraw,'write','danger')+'</div></article>').join('')||'<p class="empty">还没有文章。登记后可创建第一篇本机合成草稿。</p>')+'</div></section></details>';
  }
  function reviewer(s){
   if(s.data.identity.role!=='reviewer')return '';
   const review=(owner,scenario,id,label,eligible,reason)=>button(s,'reviewAction',label,{'data-pr-owner':owner,'data-pr-scenario':scenario,'data-pr-id':id,...(reason?{'data-pr-reason':reason}:{})},eligible);
   return '<section class="section"><h2>独立合成审核工作台</h2><p class="muted">以下操作只演练审核流程，不验证真实专业资格，不授予真实服务权限。每次确认只处理当前所示的确切版本。</p><div class="demand-list">'+(list(s.data.reviewQueue).map(r=>'<article class="demand-card"><h3>'+esc(r.ownerLabel)+'</h3><p class="status">'+esc(r.profileLabel)+'</p>'+(r.profile?'<p class="muted">申请 '+esc(r.profile.applicationId)+' · 版本 '+esc(r.profile.version)+' / 内容修订 '+esc(r.profile.contentRevision)+'</p>':'')+fieldRows(r.profileFields,PROFILE)+'<div class="actions">'+review(r.owner,'approved',r.profile?.applicationId||'','通过此合成登记',r.canApproveProfile)+review(r.owner,'rejected',r.profile?.applicationId||'','拒绝此合成登记',r.canApproveProfile)+review(r.owner,'revoked',r.profile?.applicationId||'','撤销此合成资格',r.canRevokeProfile)+'</div>'+list(r.articles).map(a=>'<section class="section"><h4>'+esc(a.title)+'</h4><p class="status">'+(esc(a.statusLabel)+(a.reasonLabel?' · 驳回理由：'+esc(a.reasonLabel):''))+'</p><p class="muted">文章 '+esc(a.id)+' · 版本 '+esc(a.version)+' / 内容修订 '+esc(a.contentRevision)+'</p>'+fieldRows(a.fields,ARTICLE)+'<div class="actions">'+review(r.owner,'articleApproved',a.id,'通过此篇合成文章',a.canApprove)+[['SOURCE_INSUFFICIENT','来源资料不足'],['SCOPE_UNCLEAR','适用范围不清'],['LIMITATIONS_INSUFFICIENT','限制说明不足']].map(([reason,label])=>review(r.owner,'articleRejected',a.id,'驳回：'+label,a.canApprove,reason)).join('')+'</div></section>').join('')+'</article>').join('')||'<p class="empty">暂无合成审核记录。</p>')+'</div></section>';
  }
  function prepare(s){
   if(!alive)throw Error('STUDENT_PLATFORM_DISPOSED');
   const box=d.createElement('div'),role=s.data?.identity?.role;
   box.innerHTML='<p class="notice error-box" role="note">统一候选待完整及真实浏览器验收 · 旧版缓存页不兼容服务schema4，不得混用；暂不可发布或在真实账号运行。本轮仅合成离线验证。</p>'+status(s)+(s.data?(s.servicePreview&&!s.form?serviceDetail(s):role==='practitioner'?author(s)+editor(s):role==='reviewer'?reviewer(s)+serviceList(s,'reviewQueue'):landing(s)+serviceList(s,'publicPlans')):landing(s)+'<p class="notice">尚未进入已核对角色。请选择下方虚构身份后开始演练。</p>')+'<details class="section pr09-recovery"><summary>恢复操作与合成记录状态</summary>'+recovery(s)+(s.data?.journalUsage?'<p class="muted">合成历史事件 '+esc(s.data.journalUsage.events)+' / '+esc(s.data.journalUsage.maxEvents)+'。达到上限时保留数据，不自动清空。</p>':'')+'</details><footer>离线合成流程 · 不代表真实认证、医疗建议、服务预约或外部发布。</footer>';
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
   const kind=form?.getAttribute('data-pr-kind'),allowed=kind==='profile'?PROFILE:kind==='article'?ARTICLE:kind==='service-preview'?new Set(['title','description']):null;
   if(!t||!form||!root.contains(form)||!['INPUT','TEXTAREA'].includes(el.tagName)||!allowed?.has(key))return;
   void invoke(()=>c.editField(key,el.value,t));
  }
  function change(event){const el=event.target;if(own(el)&&el.getAttribute('data-pr-action')==='serviceChoice'&&['checkbox','radio'].includes(el.type)){const t=ticket(el,true);if(t)void invoke(()=>c.serviceChoice(el.getAttribute('data-pr-choice'),el.value,t));return;}if(!own(el)||el.getAttribute('data-pr-action')!=='setAck'||el.type!=='checkbox')return;const t=ticket(el,true);if(!t)return;const previous=!el.checked;void invoke(()=>c.setAck(!!el.checked,t),()=>{if(alive&&root.contains(el))el.checked=previous;});}
  function revealSaveValidation(t,form,focused){
   if(!alive||d.hidden===true||d.hasFocus?.()===false||d.activeElement!==focused||!root.contains(form)||root.querySelector('#pr-editor')!==form)return;
   const s=c.snapshot();
   if(s.phase!=='ready'||s.authorized!==true||s.busy||s.pending||s.error||s.render!==t.render||s.attempt!==t.attempt||s.form?.serial!==t.form||s.data?.identity?.role!=='practitioner')return;
   const invalid=Array.from(form.querySelectorAll('[data-pr-field],[data-pr-choice]')).find(field=>field.getAttribute('aria-invalid')==='true');
   const missingAck=!invalid&&s.form.ack===false&&s.notice==='请明确确认所有内容均为虚构合成资料';
   const target=invalid||(missingAck?form.querySelector('#pr-ack'):null);
   if(!target||target.disabled||target.closest?.('[hidden]')||!root.contains(target))return;
   if(missingAck){const message=form.querySelector('[data-pr-ack-error]');if(message){message.textContent=s.notice;message.hidden=false;target.setAttribute('aria-invalid','true');}}
   target.scrollIntoView?.({block:'center'});target.focus?.({preventScroll:true});
  }
  function save(el){
   const t=ticket(el,true),form=el.closest?.('form'),focused=d.activeElement;
   if(t&&form&&root.contains(form))void invoke(()=>c.save(t)).then(ok=>{if(!ok)try{revealSaveValidation(t,form,focused);}catch(_){/* Validation feedback must never alter the save outcome. */}});
  }
  function cancel(el,t){
   const before=c.snapshot(),form=el.closest?.('form'),focused=d.activeElement,href=w.location?.href;
   void invoke(()=>c.cancelForm(t)).then(ok=>{if(!ok)return;try{
    if(!alive||d.hidden===true||d.hasFocus?.()===false||!form||!form.contains(focused)||root.contains(form)||w.location?.href!==href)return;
    if(d.activeElement&&d.activeElement!==d.body&&d.activeElement!==focused)return;
    const s=c.snapshot();
    if(s.phase!=='ready'||s.authorized!==true||s.busy||s.pending||s.error||s.form||s.persona!==before.persona||s.attempt!==t.attempt||s.render!==t.render+1||s.data?.identity?.role!=='practitioner')return;
    const kind=before.form?.kind,id=kind==='article'?(before.form.recordId||''):'';
    if(!['profile','article','service-preview'].includes(kind))return;
    const target=Array.from(root.querySelectorAll('[data-pr-action]')).find(n=>n.getAttribute('data-pr-action')==='openForm'&&n.getAttribute('data-pr-kind')===kind&&(n.getAttribute('data-pr-id')||'')===id&&n.getAttribute('data-pr-render')===String(s.render)&&n.getAttribute('data-pr-attempt')===String(s.attempt));
    if(!target||target.disabled||target.getAttribute('aria-disabled')==='true'||target.closest?.('[hidden]'))return;
    target.scrollIntoView?.({block:'center'});target.focus?.({preventScroll:true});
   }catch(_){/* Focus feedback must never alter a completed cancellation. */}});
  }
  function click(event){
   if(!alive||!root.contains(event.target))return;
   const el=event.target.closest?.('[data-pr-action]');if(el?.tagName==='A')event.preventDefault();if(!own(el)||!['BUTTON','A'].includes(el.tagName))return;
   const action=el.getAttribute('data-pr-action');if(!ACTIONS.has(action)||action==='setAck')return;
   event.preventDefault();const t=ticket(el,['sample','save','cancelForm','previewService'].includes(action));if(!t)return;
   if(action==='previewService'){const form=el.closest?.('form'),focused=d.activeElement;void invoke(()=>c.previewService(t)).then(ok=>{if(!ok){try{revealSaveValidation(t,form,focused);}catch(_){}}else focusService('detail',focused);});return;}
   if(action==='closeServicePreview'){const focused=d.activeElement;void invoke(()=>c.closeServicePreview(t)).then(ok=>{if(ok)focusService('entry',focused);});return;}
   if(action==='save'){save(el);return;}
   if(action==='refresh')void invoke(()=>c.refresh(t));
   else if(action==='retryInitialize')void invoke(()=>c.retryInitialize(t));
   else if(action==='openForm'){const kind=el.getAttribute('data-pr-kind');if(['profile','article','service-preview'].includes(kind))void invoke(()=>c.openForm(kind,el.getAttribute('data-pr-id')||null,t)).then(ok=>{if(ok&&alive){const editor=root.querySelector('#pr-editor');editor?.scrollIntoView?.({block:'start'});editor?.querySelector('input,textarea')?.focus?.({preventScroll:true});}});}
   else if(action==='enableServicePlans')void invoke(()=>c.enableServicePlans(t));
   else if(action==='viewService'){const focused=d.activeElement;void invoke(()=>c.viewService(el.getAttribute('data-pr-id'),t)).then(ok=>{if(ok)focusService('detail',focused);});}
   else if(['planSubmit','planWithdraw','planApprove','planReject'].includes(action))void invoke(()=>c.planAction(action==='planSubmit'?'submit':action==='planWithdraw'?'withdraw':'review',el.getAttribute('data-pr-id'),t,action==='planApprove'?'APPROVED':action==='planReject'?'REJECTED':undefined));
   else if(action==='sample')void invoke(()=>c.sample(t));
   else if(action==='cancelForm')cancel(el,t);
   else if(REQUESTS.has(action))void invoke(()=>c.requestAction(action,el.getAttribute('data-pr-id')||null,t));
   else if(action==='reviewAction'){const owner=el.getAttribute('data-pr-owner'),scenario=el.getAttribute('data-pr-scenario');const reason=el.getAttribute('data-pr-reason');if(scenario==='articleRejected'&&!['SOURCE_INSUFFICIENT','SCOPE_UNCLEAR','LIMITATIONS_INSUFFICIENT'].includes(reason))return;if(OWNERS.has(owner)&&SCENARIOS.has(scenario))void invoke(()=>c.reviewAction(owner,scenario,el.getAttribute('data-pr-id')||null,t,reason||undefined));}
   else if(action==='navigate'){const href=el.getAttribute('href');void invoke(()=>{if(c.confirmNavigation(href,t)!==true)return false;if(!alive)return false;if(href==='#pr-persona'){const chooser=d.getElementById?.('pr-persona')?.closest?.('details');if(chooser)chooser.open=true;}if(typeof w.location?.assign==='function')w.location.assign(href);else if(w.location)w.location.href=href;return true;});}
  }
  function focusService(kind,previous){
   try{if(!alive||d.hidden===true||d.hasFocus?.()===false||d.activeElement&&d.activeElement!==d.body&&d.activeElement!==previous)return;const s=c.snapshot();if(!s.authorized||s.busy||s.pending||s.form)return;const target=kind==='detail'?root.querySelector('[data-pr10-detail-heading]'):Array.from(root.querySelectorAll('[data-pr-action]')).find(n=>n.getAttribute('data-pr-action')==='openForm'&&n.getAttribute('data-pr-kind')==='service-preview');if(!target||target.disabled||target.closest?.('[hidden]'))return;target.scrollIntoView?.({block:'start'});target.focus?.({preventScroll:true});}catch(_){}
  }
  function submit(event){
   if(!alive||!root.contains(event.target))return;event.preventDefault();
   const form=event.target;if(!own(form)||form.tagName!=='FORM')return;
   if(form.getAttribute('data-pr-action')==='previewSubmit'){const t=ticket(form,true),focused=d.activeElement;if(t)void invoke(()=>c.snapshot().form?.persistentAvailable?c.save(t):c.previewService(t)).then(ok=>{if(ok)focusService('detail',focused);else try{revealSaveValidation(t,form,focused);}catch(_){}});return;}
   if(form.getAttribute('data-pr-action')!=='submitForm')return;
   const submitter=event.submitter||form.querySelector('[type="submit"]');if(!own(submitter))return;save(form);
  }
  function updateStatus(s){
   if(!alive)return;
   for(const el of root.querySelectorAll('[data-pr10-preview-content]'))el.hidden=s.authorized!==true;
   for(const el of root.querySelectorAll('[data-pr10-preview-unavailable]'))el.hidden=s.authorized===true;
   if(s.authorized!==true||s.data?.identity?.role!=='practitioner')for(const el of root.querySelectorAll('[data-pr-article-overview],[data-pr-article-excerpt]')){el.textContent='';el.hidden=true;}
   for(const [key,value] of [['notice',s.notice],['error',s.error]])for(const el of root.querySelectorAll('[data-pr-'+key+']')){el.textContent=String(value||'');el.hidden=!value;}
   for(const el of root.querySelectorAll('[data-pr-unverified]'))el.hidden=!s.data||!!s.authorized;
   for(const el of root.querySelectorAll('[data-pr-identity]')){el.textContent=s.data?.identity?.label||'';el.hidden=!s.data;}
   for(const el of root.querySelectorAll('[data-pr-action]')){
    const policy=el.getAttribute('data-pr-policy');
    if(['refresh','initialize'].includes(policy)){el.setAttribute('data-pr-render',s.render);el.setAttribute('data-pr-attempt',s.attempt);}
    const form=el.getAttribute('data-pr-form'),current=el.getAttribute('data-pr-render')===String(s.render)&&(form===null||form===String(s.form?.serial));
    const editorSubmit=el.getAttribute('data-pr-action')==='planSubmit'&&el.closest?.('form')?.id==='pr-editor'&&s.form?.kind==='service-preview',eligible=editorSubmit?s.form.persistentAvailable&&s.form.canSubmit:el.getAttribute('data-pr-eligible')==='1';const yes=current&&enabled(s,policy,eligible);
    if(el.tagName==='A')el.setAttribute('aria-disabled',yes?'false':'true');else el.disabled=!yes;
   }
   // Errors and dirty indication may change without replacing focused inputs, values or tickets.
   const liveForm=root.querySelector('#pr-editor');
   if(liveForm&&s.form&&liveForm.getAttribute('data-pr-form')===String(s.form.serial)){
    const ackError=liveForm.querySelector('[data-pr-ack-error]');if(ackError){ackError.textContent='';ackError.hidden=true;}liveForm.querySelector('#pr-ack')?.removeAttribute('aria-invalid');
    const errors=new Map(list(s.form.fields).map(f=>[f.key,f.error||s.form.errors?.[f.key]||'']));
    for(const el of liveForm.querySelectorAll('[data-pr-field-error]'))el.textContent=errors.get(el.getAttribute('data-pr-field-error'))||'';
    for(const el of liveForm.querySelectorAll('[data-pr-field]')){if(errors.get(el.getAttribute('data-pr-field')))el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');}
    if(s.form.kind==='service-preview'){
     for(const el of liveForm.querySelectorAll('[data-pr-choice]')){const key=el.getAttribute('data-pr-choice');el.checked=key==='duration'?s.form.duration===el.value:s.form.audiences.includes(el.value);if(s.form.errors?.[key])el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');}
     for(const el of liveForm.querySelectorAll('[data-pr10-count]')){const field=s.form.fields.find(x=>x.key===el.getAttribute('data-pr10-count'));if(field)el.textContent=field.value.length+'/'+field.max;}
     for(const key of ['audiences','duration']){const target=Array.from(liveForm.querySelectorAll('[data-pr-field-error]')).find(x=>x.getAttribute('data-pr-field-error')===key);if(target)target.textContent=s.form.errors?.[key]||'';}
    }
    const dirty=liveForm.querySelector('[data-pr-form-state]');if(dirty)dirty.textContent=s.form.dirty?'当前有未保存填写。':'已打开原版本；保存前请确认全部为合成资料。';
   }
  }
  function clear(message){if(!alive)return;const s={...c.snapshot(),data:null,form:null,authorized:false,notice:message||'原角色已退出，等待重新核对。',error:''};root.replaceChildren(...prepare(s));}
  function dispose(){if(!alive)return;alive=false;for(const el of root.querySelectorAll('[data-pr10-screen]'))el.replaceChildren();root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('submit',submit);for(const el of root.querySelectorAll('[data-pr-action]')){if(el.tagName==='A')el.setAttribute('aria-disabled','true');else el.disabled=true;}}
  root.addEventListener('click',click);root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('submit',submit);
  return Object.freeze({root,prepare,updateStatus,clear,dispose});
 }
 return Object.freeze({buildId:BUILD,create});
});
