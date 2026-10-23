/* Offline service-state adapter; no provider configuration or user-input rewriting. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./llm-contract.js'));
 else root.NutriLLMStatus=factory(root.NutriLLMOffline);
}(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 if(!C||typeof C.create!=='function')throw Error('Offline contract unavailable');
 function describe(status){
  if(status.connected!==false||status.mode!=='disconnected')throw Error('Offline service state required');
  return Object.freeze({connected:false,mode:status.mode,message:status.message,
   label:'AI 未连接',nativeLabel:'LLM 未连接',ruleLabel:'未配置 · 当前为规则'});
 }
 function create(){
  const client=C.create(); // Deliberately no adapter/options: runtime cannot select a provider.
  return Object.freeze({status:()=>describe(client.status()),send:input=>client.send(input),
   invalidate:()=>client.invalidate(),dispose:()=>client.dispose()});
 }
 function status(){const client=create();try{return client.status();}finally{client.dispose();}}
 return Object.freeze({create,status});
}));
