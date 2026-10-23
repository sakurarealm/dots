/* Presentation only. Keep all account, transaction, and leave decisions in the v3 entry. */
(function(w){'use strict';const d=w.document,E=w.NutriRegistrationEntry;let dirty=false;
/* One primary route contract. Reuse existing nav nodes, never wrap page content. */
const script=d.currentScript,base=new URL('../',script.src);
const route=(w.location.pathname.split('/').filter(Boolean).pop()||'').replace(/\.html$/,'');
const active=['diet','intake','health-calendar','recipes'].includes(route)?'diet':['shop','orders','wallet','address','commerce-admin'].includes(route)?'shop':route==='nutrition-booklet'?'book':['aiAgent','phone-demo'].includes(route)?'ai':'profile';
const entries=[['shop','商城','pages/shop.html','shop','selectshop'],['book','营养册','nutrition-booklet.html','note','selectnote'],['ai','AI营养师','pages/aiAgent.html','AI','AI'],['diet','饮食','pages/diet.html','rise','selectrise'],['profile','我的','pages/profile.html','profile','selectprofile']];
function primaryNavigation(){
 for(const nav of d.querySelectorAll('[data-shell-nav],.hd-tabs'+(route==='nutrition-booklet'?',.tabbar':''))){
  if(nav.dataset.nutriCanonicalNav==='1')continue;
  const links=entries.map(([id,label,href,icon,selected])=>{const a=d.createElement('a');a.href=new URL(href,base).href;if(active===id)a.setAttribute('aria-current','page');const img=d.createElement('img');img.src=new URL('pages/static/tabBar/'+(active===id?selected:icon)+'.png',base).href;img.alt='';img.width=26;img.height=26;const text=d.createElement('span');text.textContent=label;a.append(img,text);return a;});
  nav.replaceChildren(...links);nav.classList.add('nutri-canonical-nav');nav.dataset.nutriCanonicalNav='1';nav.setAttribute('aria-label','主要页面');
 }
 if(d.querySelector('[data-shell-nav].nutri-canonical-nav'))d.body.dataset.nutriCanonicalReady='true';
}
primaryNavigation();
const navObserver=new MutationObserver(primaryNavigation);navObserver.observe(d.body,{childList:true,subtree:true});

function refresh(){const v=E?.view?.();for(const n of d.querySelectorAll('section.registration-entry-v3')){const quiet=v?.phase==='ready'&&!v.pending&&(v.notice.startsWith('沈先生 · 合成演示 v3。'))&&n.childNodes.length===1&&n.children.length===1&&n.children[0].getAttribute('role')==='status'&&n.children[0].textContent===v.notice;n.hidden=!!quiet;}
 const h=w.visualViewport?.height||w.innerHeight;if(h)d.body.style?.setProperty('--nutri-viewport-height',h+'px');}
function input(e){if(e.target.closest?.('input,textarea,select'))dirty=true;}
function click(e){const a=e.target.closest?.('[data-shell-nav] a,.nutri-demo-label a');if(!a)return;if(['shop','orders','wallet','address','commerce-admin'].includes(d.body.dataset.nutriShell))return;if(E&&!E.confirmLeave(dirty,'离开会丢失本页尚未保存的填写；已发生的写入不会撤销。是否继续？'))e.preventDefault();}
d.addEventListener('input',input);d.addEventListener('change',input);d.addEventListener('click',click);const unsub=E?.subscribe?.(refresh);refresh();w.addEventListener('resize',refresh);w.visualViewport?.addEventListener('resize',refresh);w.addEventListener('pagehide',()=>{navObserver.disconnect();unsub?.();d.removeEventListener?.('input',input);d.removeEventListener?.('change',input);d.removeEventListener?.('click',click);w.removeEventListener('resize',refresh);w.visualViewport?.removeEventListener('resize',refresh);});
w.addEventListener('pageshow',e=>{if(e.persisted){primaryNavigation();navObserver.observe(d.body,{childList:true,subtree:true});d.addEventListener('input',input);d.addEventListener('change',input);d.addEventListener('click',click);}});
})(window);
