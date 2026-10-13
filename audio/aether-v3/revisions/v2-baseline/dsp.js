/* Aether original parameter synthesizer. No dependencies. */
(function(root){
'use strict';
const SR=48000, TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function num(x,f,a,b){return Number.isFinite(x)?clamp(x,a,b):f;}
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);}
function schema(x,keys,label){if(!plain(x))throw Error(label+' 必须是普通 JSON 对象');for(const k of Object.keys(x))if(!keys.includes(k))throw Error(label+' 不支持字段：'+k);}
function bounded(x,f,a,b,label,integer=false){if(x===undefined)return f;if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b||(integer&&!Number.isInteger(x)))throw Error(label+' 需要 '+a+'–'+b+' 范围内的'+(integer?'整数':'数值'));return x;}
function validate(p){
 schema(p,['version','id','name','category','material','description','seed','variantSeeds','duration','global','modules'],'参数');
 if(p.version!==1)throw Error('参数需要 version: 1');
 if(!Array.isArray(p.modules)||!p.modules.length||p.modules.length>32)throw Error('modules 需要 1–32 个模块');
 for(const k of ['id','name','category','material','description'])if(p[k]!==undefined&&(typeof p[k]!=='string'||p[k].length>80))throw Error(k+' 需要不超过 80 字的字符串');
 if(p.global!==undefined)schema(p.global,['pitch','stretch','softness','room','gain'],'global');
 if(p.variantSeeds!==undefined){if(!Array.isArray(p.variantSeeds)||p.variantSeeds.length!==2)throw Error('variantSeeds 需要两个整数种子');p.variantSeeds.forEach(x=>bounded(x,0,0,4294967295,'variantSeeds',true));}
 const q=JSON.parse(JSON.stringify(p));q.name=q.name||'Custom';q.id=String(q.id||'custom').replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'custom';
 if(['__proto__','constructor','prototype'].includes(q.id))throw Error('id 使用了保留名称');
 q.seed=bounded(p.seed,1001,0,4294967295,'seed',true);q.duration=bounded(p.duration,.4,.06,4,'duration');
 q.global=q.global||{};for(const [k,f,a,b] of [['pitch',0,-12,12],['stretch',1,.5,2],['softness',.6,0,1],['room',.12,0,.6],['gain',.24,0,.7]])q.global[k]=bounded(p.global?.[k],f,a,b,'global.'+k);
 for(let i=0;i<q.modules.length;i++){const m=q.modules[i],raw=p.modules[i];schema(raw,['type','start','duration','freq','endFreq','gain','decay','count','notes','ratios','weights','damping','attack','cutoff'],'module');if(!['tone','modal','notes','clicks','noise'].includes(m.type))throw Error('未知模块：'+String(m.type));for(const [k,f,a,b] of [['start',0,0,4],['duration',.12,.005,4],['freq',660,40,10000],['endFreq',660,40,10000],['gain',.4,0,1],['decay',8,.1,100],['count',2,1,12]])m[k]=bounded(raw[k],f,a,b,'module.'+k,k==='count');for(const [k,f,a,b] of [['attack',null,.0005,.3],['cutoff',null,80,16000]])if(raw[k]!==undefined)m[k]=bounded(raw[k],f,a,b,'module.'+k);if(raw.ratios!==undefined){if(!Array.isArray(raw.ratios)||!raw.ratios.length||raw.ratios.length>8)throw Error('ratios 需要 1–8 个频率比');m.ratios=raw.ratios.map(x=>bounded(x,1,.25,8,'ratios'));for(const k of ['weights','damping']){if(!Array.isArray(raw[k])||raw[k].length!==raw.ratios.length)throw Error(k+' 长度需要与 ratios 一致');m[k]=raw[k].map(x=>bounded(x,1,k==='damping'?.1:0,k==='damping'?120:1,k));}}else if(raw.weights!==undefined||raw.damping!==undefined)throw Error('weights/damping 需要 ratios');if(m.type==='notes'||raw.notes!==undefined){if(!Array.isArray(raw.notes)||!raw.notes.length||raw.notes.length>16)throw Error('notes 需要 1–16 个音符');m.notes=raw.notes.map(n=>bounded(n,0,-36,36,'notes'));}}
 return q;
}
function synth(input){const p=validate(input),g=p.global;let state=p.seed||1;const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
 const stretch=g.stretch,pitch=2**(g.pitch/12),dryDuration=p.duration*stretch;const n=Math.ceil((dryDuration+.25+g.room*.9)*SR),a=new Float64Array(n);let noiseState=0;
 for(const m of p.modules){const start=Math.floor(m.start*stretch*SR),len=Math.floor(m.duration*stretch*SR);const detune=1+(rand()-.5)*.012;let phase=rand()*TAU;
 for(let j=0;j<len&&j+start<n;j++){const t=j/SR,u=j/Math.max(1,len-1),attack=Math.min(1,t/(m.attack??(.0015+g.softness*.009))),release=Math.min(1,(len-1-j)/(SR*.012));let v=0;const f=m.freq*pitch*detune;
 if(m.type==='tone'){phase+=TAU*(f+(m.endFreq*pitch-f)*u)/SR;v=Math.sin(phase)*Math.exp(-m.decay*t);}
 if(m.type==='modal'&&m.ratios){for(let k=0;k<m.ratios.length;k++){const hz=f*m.ratios[k];if(hz<SR*.45)v+=m.weights[k]*Math.sin(TAU*hz*t)*Math.exp(-m.damping[k]*t);}}
 if(m.type==='modal'&&!m.ratios){v=(Math.sin(TAU*f*t)+.34*Math.sin(TAU*f*1.503*t)*Math.exp(-12*t)+.16*(1-g.softness)*Math.sin(TAU*f*2.71*t)*Math.exp(-18*t))*Math.exp(-m.decay*t);}
 if(m.type==='notes'){const ix=Math.min(m.notes.length-1,Math.floor(u*m.notes.length)),local=(u*m.notes.length)%1;v=Math.sin(TAU*f*2**(m.notes[ix]/12)*t)*Math.sin(Math.PI*local)**2*Math.exp(-local*2);}
 if(m.type==='clicks'){const vtime=(u*Math.floor(m.count))%1;v=Math.sin(TAU*f*t)*Math.exp(-vtime*(24+g.softness*10));}
 if(m.type==='noise'){noiseState+=((rand()*2-1)-noiseState)*(m.cutoff?1-Math.exp(-TAU*m.cutoff/SR):(.035+(1-g.softness)*.28));v=noiseState*Math.sin(Math.PI*u)**2*Math.exp(-m.decay*t);}
 a[start+j]+=v*m.gain*attack*Math.max(0,release);
 }}
 const dry=a.slice();if(g.room>0)for(const [delay,amp]of [[.029,.3],[.047,.21],[.079,.16],[.113,.1],[.173,.06]]){const d=Math.floor(delay*SR);for(let i=d;i<n;i++)a[i]+=dry[i-d]*amp*g.room;}
 // One-pole lowpass softens upper partials. Peak normalization only attenuates.
 let lp=0,peak=0;const alpha=.32+(1-g.softness)*.48;for(let i=0;i<n;i++){lp+=alpha*(a[i]-lp);a[i]=lp;peak=Math.max(peak,Math.abs(lp));}
 const scale=g.gain/Math.max(1,peak);const out=new Float32Array(n);for(let i=0;i<n;i++){const fade=Math.min(1,i/(SR*.003),(n-1-i)/(SR*.025));out[i]=clamp(a[i]*scale*Math.max(0,fade),-.95,.95);}out[0]=0;out[n-1]=0;return {samples:out,sampleRate:SR,params:p};
}
function wav(samples){const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);samples.forEach((x,i)=>v.setInt16(44+i*2,Math.round(clamp(x,-1,1)*32767),true));return new Uint8Array(b);}
function crc32(a){let c=0xffffffff;for(const x of a){c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function zip(files){let offset=0;const chunks=[],central=[];const enc=new TextEncoder();for(const f of files){const name=enc.encode(f.name),data=f.data,crc=crc32(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);chunks.push(h,data);const c=new Uint8Array(46+name.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+data.length;}const clen=central.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,clen,true);ev.setUint32(16,offset,true);const all=[...chunks,...central,end],out=new Uint8Array(offset+clen+22);let pos=0;all.forEach(x=>{out.set(x,pos);pos+=x.length;});return out;}
const api={synth,wav,zip,validate,SR};if(typeof module!=='undefined')module.exports=api;root.AetherDSP=api;
})(typeof globalThis!=='undefined'?globalThis:this);
