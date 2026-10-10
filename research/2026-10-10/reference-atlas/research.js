'use strict';
(async()=>{
 const $=s=>document.querySelector(s),grid=$('#grid'),search=$('#search'),category=$('#category'),status=$('#status'),count=$('#count');
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const safeUrl=url=>typeof url==='string'&&(/^https:\/\/[^\s]+$/.test(url)||(/^\/(?!\/)[^\s]*$/.test(url)&&!url.includes('\\'))||/^#[a-z0-9-]+$/.test(url)||/^\.\/[a-zA-Z0-9._/-]+$/.test(url));
 const link=(url,text)=>{if(!safeUrl(url))return el('span',text);const a=el('a',text);a.href=url;if(url.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer';}return a;};
 const section=(parent,title,text,cls)=>{parent.append(el('h3',title),el('p',text,cls));};
 let activeGroup='';
 try{
  const response=await fetch('./research-catalog.json');if(!response.ok)throw new Error('load');
  const {items,updated_at,requirements=[]}=await response.json();
  const groups=['游戏与世界','技术与渲染','美术与资产','工具与方法','待核对来源'];
  const sorted=[...items].sort((a,b)=>groups.indexOf(a.group)-groups.indexOf(b.group));
  for(const [select,key] of [[category,'category'],[status,'status']])for(const name of [...new Set(items.map(x=>x[key]).filter(Boolean))]){const option=el('option',name);option.value=name;select.append(option);}
  const total=$('#total-records');if(total)total.textContent=`${items.length} 条参考与目标记录`;
  const reqList=$('#requirements-list');if(reqList){reqList.replaceChildren();requirements.forEach((r,i)=>{const d=el('details',undefined,'requirement'),s=el('summary');s.append(el('span',String(i+1).padStart(2,'0'),'req-number'),el('span',r.title));d.append(s);const body=el('div',undefined,'req-body');body.append(el('strong','当前做到哪里'),el('p',r.current),el('strong','还差什么 / 下一步'),el('p',r.next));if(r.url)body.append(link(r.url,'查看对应研究 ↗'));d.append(body);reqList.append(d);});}
  const tabs=$('#group-tabs'),groupButtons=[];
  if(tabs)for(const g of ['',...groups]){const b=el('button',g?`${g} ${items.filter(x=>x.group===g).length}`:`全部 ${items.length}`);b.type='button';b.setAttribute?.('aria-pressed',String(g===''));b.addEventListener('click',()=>{activeGroup=g;render();groupButtons.forEach(([name,button])=>button.setAttribute?.('aria-pressed',String(name===g)));});groupButtons.push([g,b]);tabs.append(b);}
  function card(x){
   const article=el('article',undefined,'card');article.id=x.id;
   const figure=el('figure',undefined,`card-figure${x.visual_kind==='style'?' is-cpu':''}`),img=el('img');img.src=x.image.src;img.alt=x.image.alt;img.loading='lazy';img.decoding='async';img.width=640;img.height=300;
   img.addEventListener('error',()=>{figure.replaceChildren(el('p','配图暂未载入。文字研究与来源仍可阅读。','image-fallback'));});figure.append(img,el('figcaption',x.image.caption));article.append(figure);
   const body=el('div',undefined,'card-body'),top=el('div',undefined,'card-topline');top.append(el('span',x.group,'tag'),el('span',x.status,'tag status-tag'));body.append(top,el('h2',x.title),el('p',x.summary,'card-summary'));
   const learn=el('dl',undefined,'learn');learn.append(el('dt','重点学什么'),el('dd',x.takeaways),el('dt','研究价值'),el('dd',x.purpose||x.summary));body.append(learn);
   const next=el('p',undefined,'next-step');next.append(el('strong','下一步'),el('span',x.next));body.append(next);
   const detail=el('details',undefined,'detail-toggle');detail.id=`detail-${x.id}`;
   const summary=el('summary','展开解析、适配与证据');detail.append(summary);
   detail.addEventListener('toggle',()=>{
    if(detail.open)return;
    const restoreVisiblePosition=()=>{if(!detail.open&&detail.isConnected)summary.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(restoreVisiblePosition);else restoreVisiblePosition();
   });
   const content=el('div',undefined,'detail-content');section(content,'机制解析',x.mechanism);section(content,'美术与体验',x.art_direction);
   content.append(el('h3',x.adaptation.label));const steps=el('ol');x.adaptation.steps.forEach(s=>steps.append(el('li',s)));content.append(steps);
   if(x.system_scope){content.append(el('h3',`完整体系对照 · ${x.system_scope.length}个系统`));const systems=el('div',undefined,'system-scope');for(const row of x.system_scope){const block=el('section',undefined,'system-row');block.append(el('h4',row.system),el('strong','已有子集'),el('p',row.implemented),el('strong','仍然缺少'),el('p',row.remaining));systems.append(block);}content.append(systems);}
   content.append(el('h3','七个阶段，分别看证据'));
   const stage=el('div',undefined,'stage'),values=[['研究',x.stages[0]],['原型',x.stages[1]],['正式接入',x.integration],['编译 / 代码检查',x.stages[2]],['实际运行',x.stages[3]],['视觉验收',x.stages[4]],['手机验收',x.mobile]];
   values.forEach(([name,value])=>{const cell=el('span',name);cell.append(el('b',value));stage.append(cell);});content.append(stage);
   section(content,'实际研究覆盖',x.coverage);section(content,'风险与尚未完成',x.missing,'risk');
   content.append(el('h3','完成之前，还要验证'));const acceptance=el('ul');x.acceptance.forEach(a=>acceptance.append(el('li',a)));content.append(acceptance);
   const dl=el('dl',undefined,'metadata');for(const [key,title] of [['identity','来源身份'],['version','版本与范围'],['source_verified_at','来源复核时间'],['license','许可和素材边界']])if(x[key])dl.append(el('dt',title),el('dd',x[key]));dl.append(el('dt','配图来源'),el('dd',x.image.provenance));content.append(dl);
   if(x.image.source)content.append(link(x.image.source,'配图来源说明'));
   content.append(el('p',x.evidence_note,'evidence'));detail.append(content);body.append(detail);
   const links=el('div',undefined,'links');if(x.source)links.append(link(x.source,x.category==='待识别来源'?'来源线索 / 待识别':'原始来源 ↗'));if(x.license_source)links.append(link(x.license_source,'官方使用条款'));
   for(const r of x.reports||[])links.append(link(r.url,r.label));for(const r of x.prototypes||[])links.append(link(r.url,r.label));links.append(link(`#${x.id}`,'本条定位'));body.append(links);article.append(body);return article;
  }
  function render(){
   const q=search.value.trim().toLowerCase();const filtered=sorted.filter(x=>(!activeGroup||x.group===activeGroup)&&(!category.value||x.category===category.value)&&(!status.value||x.status===status.value)&&(!q||JSON.stringify(x).toLowerCase().includes(q)));
   grid.replaceChildren();count.textContent=`${filtered.length} / ${items.length} 条记录 · 按主题分组 · ${updated_at} 更新`;
   for(const x of filtered)grid.append(card(x));if(!filtered.length)grid.append(el('p','没有匹配的记录。试试其他关键词，或点击“重置”显示全部。','empty-state'));
  }
  function revealHash(){try{const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const item=items.find(x=>x.id===id);if(item){if(activeGroup||category.value||status.value||search.value){activeGroup='';category.value='';status.value='';search.value='';groupButtons.forEach(([g,b])=>b.setAttribute?.('aria-pressed',String(g==='')));render();}const d=document.getElementById(`detail-${id}`);if(d)d.open=true;}document.getElementById(id)?.scrollIntoView();}catch{/* Invalid bookmarks do not hide the catalog. */}}
  search.addEventListener('input',render);category.addEventListener('change',render);status.addEventListener('change',render);
  $('#reset').addEventListener('click',()=>{activeGroup='';search.value='';category.value='';status.value='';groupButtons.forEach(([g,b])=>b.setAttribute?.('aria-pressed',String(g==='')));render();search.focus();});
  render();revealHash();if(typeof window!=='undefined')window.addEventListener('hashchange',revealHash);
 }catch{count.textContent='研究目录暂未载入。请刷新，或打开下方JSON清单。';const req=$('#requirements-list');if(req)req.textContent='要求对照暂未载入，请刷新页面。';}
})();
