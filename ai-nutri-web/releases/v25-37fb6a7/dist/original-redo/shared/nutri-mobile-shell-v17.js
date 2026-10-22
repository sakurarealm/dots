/* Presentation only. Keep all account, transaction, and leave decisions in the v3 entry. */
(function(w){'use strict';const d=w.document,E=w.NutriRegistrationEntry;let dirty=false;
function refresh(){const v=E?.view?.();for(const n of d.querySelectorAll('section.registration-entry-v3')){const quiet=v?.phase==='ready'&&!v.pending&&(v.notice.startsWith('沈先生 · 合成演示 v3。'))&&n.childNodes.length===1&&n.children.length===1&&n.children[0].getAttribute('role')==='status'&&n.children[0].textContent===v.notice;n.hidden=!!quiet;}
 const h=w.visualViewport?.height||w.innerHeight;if(h)d.body.style?.setProperty('--nutri-viewport-height',h+'px');}
function input(e){if(e.target.closest?.('input,textarea,select'))dirty=true;}
function click(e){const a=e.target.closest?.('[data-shell-nav] a,.nutri-demo-label a');if(!a)return;if(['shop','orders','wallet','address','commerce-admin'].includes(d.body.dataset.nutriShell))return;if(E&&!E.confirmLeave(dirty,'离开会丢失本页尚未保存的填写；已发生的写入不会撤销。是否继续？'))e.preventDefault();}
d.addEventListener('input',input);d.addEventListener('change',input);d.addEventListener('click',click);const unsub=E?.subscribe?.(refresh);refresh();w.addEventListener('resize',refresh);w.visualViewport?.addEventListener('resize',refresh);w.addEventListener('pagehide',()=>{unsub?.();d.removeEventListener?.('input',input);d.removeEventListener?.('change',input);d.removeEventListener?.('click',click);w.removeEventListener('resize',refresh);w.visualViewport?.removeEventListener('resize',refresh);});
})(window);
