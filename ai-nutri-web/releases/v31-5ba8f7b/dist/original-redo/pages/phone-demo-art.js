/* Visual control parity only. Never starts microphone, audio, or a call. */
(function(){'use strict';const pairs=[['call-demo-mic','不录音'],['call-demo-speaker','无声音']];
function set(id,on,boundary){const button=document.getElementById(id),label=document.getElementById(id+'-label');button.setAttribute('aria-pressed',String(on));button.classList.toggle('on',on);button.classList.toggle('off',!on);label.textContent=(on?'模拟开启':'模拟关闭')+' · '+boundary;}
for(const [id,boundary] of pairs)document.getElementById(id).addEventListener('click',()=>set(id,document.getElementById(id).getAttribute('aria-pressed')!=='true',boundary));
function reset(){for(const [id,boundary] of pairs)set(id,false,boundary);}
for(const id of ['call-start','call-end'])document.getElementById(id).addEventListener('click',reset);window.addEventListener('pagehide',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});reset();})();
