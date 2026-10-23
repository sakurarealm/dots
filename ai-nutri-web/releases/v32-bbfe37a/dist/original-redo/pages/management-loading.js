/* Presentation only: never initializes, adopts, recovers, or writes account data. */
(function(w){'use strict';const d=w.document;let active=true,failed=false,unsubscribe;
function message(text){if(!active)return;const n=d.querySelector('[data-management-loading]');if(n)n.textContent=text;}
function failure(){failed=true;message('管理页模块未能完整加载。请重新加载；现有合成记录不会被清空。');}
function resourceError(e){if(e.target?.tagName==='SCRIPT'&&e.target.hasAttribute('src'))failure();}
function state(){if(failed)return;const v=w.NutriRegistrationEntry?.view?.();if(!v){failure();return;}if(v.phase==='blocked')message('管理页尚未通过版本或数据核对，请查看页面上的恢复提示。现有记录保留。');else if(v.phase==='choice')message('请先在页面提示中明确选择合成演示方式；尚未采用或写入记录。');}
function ready(){if(!active)return;state();unsubscribe=w.NutriRegistrationEntry?.subscribe?.(state);}
w.addEventListener('error',resourceError,true);d.addEventListener('DOMContentLoaded',ready);w.addEventListener('pagehide',()=>{active=false;unsubscribe?.();w.removeEventListener('error',resourceError,true);d.removeEventListener('DOMContentLoaded',ready);});
})(window);
