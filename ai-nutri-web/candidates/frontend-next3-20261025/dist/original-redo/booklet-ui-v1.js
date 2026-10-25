/* Booklet-only progressive feedback. No storage, requests, permissions, or medical calculations. */
(function (w) {
 'use strict';
 const d=w.document;
 if(!d.body.hasAttribute('data-nutri-booklet'))return;
 const image=d.querySelector('.body-atlas'),status=d.getElementById('booklet-image-status'),retry=d.getElementById('booklet-image-retry');
 if(image&&status&&retry){
  function loading(){status.hidden=false;status.textContent='正在加载人体示意图；仍可使用“部位列表”浏览全部内容。';retry.hidden=true;retry.disabled=true;}
  function loaded(){if(!image.naturalWidth)return failed();status.hidden=true;status.textContent='';retry.hidden=true;retry.disabled=false;}
  function failed(){status.hidden=false;status.textContent='人体示意图未能加载。部位列表与主题内容仍可使用；这不表示健康状态异常。';retry.hidden=false;retry.disabled=false;}
  image.addEventListener('load',loaded);image.addEventListener('error',failed);
  retry.addEventListener('click',()=>{if(retry.disabled)return;loading();image.src=image.getAttribute('src');});
  if(image.complete){if(image.naturalWidth)loaded();else failed();}else loading();
 }
 const sheet=d.getElementById('sheet');let opener=null;
 if(sheet){
  for(const id of ['list','all-topics'])d.getElementById(id)?.addEventListener('click',()=>{opener=d.getElementById(id);});
  // Native Escape also emits close. Return focus without reopening or changing the selected topic.
  sheet.addEventListener('close',()=>{if(opener?.isConnected&&!sheet.open){opener.focus({preventScroll:true});opener=null;}});
 }
})(window);
