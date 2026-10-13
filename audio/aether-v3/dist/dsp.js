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
// V3 spatial renderer. Legacy synth() remains byte-identical and available for rollback.
// A centered material anchor survives mono fold-down; no polarity-flipped widening.
function synthStereo(input){
 const p=validate(input),g=p.global,reference=synth(p),room=g.room/.6;
 if(g.room===0){const a=reference.samples;return {samples:a,channels:[a.slice(),a.slice()],sampleRate:SR,params:p,spatial:{energyGain:1,headroomLimited:false}};}
 const dryParams=JSON.parse(JSON.stringify(p));dryParams.global.room=0;
 const dry=synth(dryParams).samples,n=reference.samples.length+Math.ceil((.18+room*.22)*SR);
 const l=new Float64Array(n),r=new Float64Array(n),body=new Float64Array(n),detail=new Float64Array(n),far=new Float64Array(n);
 const traits={'金属':[950,.23,1.05],'木':[580,.15,.76],'石':[360,.13,.86],'悬浮':[720,.2,1.24]};
 const [split,detailLevel,tailScale]=traits[p.material]||[680,.17,1];
 let low=0,air=0,rumble=0;const lowA=1-Math.exp(-TAU*split/SR),airA=1-Math.exp(-TAU*3300/SR),rumbleA=1-Math.exp(-TAU*170/SR);
 for(let i=0;i<n;i++){
  const x=dry[i]||0;low+=lowA*(x-low);air+=airA*(x-air);rumble+=rumbleA*(air-rumble);
  body[i]=low;detail[i]=x-low;far[i]=air-rumble;
  l[i]=r[i]=x; // immediate dry attack, exact centered low-frequency material identity
 }
 // Near details: small, unequal same-polarity micro-reflections; low body remains centered.
 for(const [delay,amp,pan] of [[.0037,detailLevel,-.7],[.0061,detailLevel*.75,.75]]){
  const d=Math.round(delay*SR);for(let i=d;i<n;i++){const v=detail[i-d]*amp*room;l[i]+=v*(1-pan);r[i]+=v*(1+pan);}
 }
 // Early room geometry: independent arrival times and left/right energy, no Haas-only copy.
 const seedShift=((p.seed%13)-6)*.00013;
 for(const [delay,amp,pan] of [[.012,.30,-.64],[.021,.24,.61],[.033,.20,-.3],[.048,.17,.77],[.066,.12,-.78],[.087,.08,.19]]){
  const d=Math.round((delay+seedShift)*SR);for(let i=d;i<n;i++){const v=(far[i-d]+body[i-d]*.18)*amp*room;l[i]+=v*(1-pan);r[i]+=v*(1+pan);}
 }
 // Eight damped feedback delays create a denser late field than discrete echoes.
 // RT60 varies with material; 18ms pre-delay keeps the material's onset articulate.
 const lateL=new Float64Array(n),lateR=new Float64Array(n),pre=Math.round(.018*SR);
 const rt60=(.25+room*.36)*tailScale;
 [.0277,.0311,.0379,.0413,.0437,.0479,.0533,.0593].forEach((seconds,k)=>{
  const d=Math.round(seconds*SR),line=new Float64Array(d),feedback=10**(-3*seconds/rt60);
  const pan=[-.88,.68,-.46,.91,.34,-.74,.55,-.17][k];let damp=0;
  for(let i=0;i<n;i++){const at=i%d,v=line[at];damp+=(.13+(k%3)*.025)*(v-damp);line[at]=(i>=pre?far[i-pre]:0)+damp*feedback;lateL[i]+=v*(1-pan)/8;lateR[i]+=v*(1+pan)/8;}
 });
 // Two short all-pass diffusers per channel remove repetitive comb onset patterns.
 function diffuse(a,delays){for(const seconds of delays){const d=Math.round(seconds*SR),buf=new Float64Array(d);for(let i=0;i<n;i++){const at=i%d,x=a[i],old=buf[at],y=old-.45*x;buf[at]=x+.45*y;a[i]=y;}}}
 diffuse(lateL,[.0043,.0017]);diffuse(lateR,[.0059,.0023]);
 let energy=0,peak=0;for(let i=0;i<n;i++){
  const edge=Math.max(0,Math.min(1,i/(SR*.002),(n-1-i)/(SR*.06)));
  l[i]=(l[i]+lateL[i]*room*.66)*edge;r[i]=(r[i]+lateR[i]*room*.66)*edge;
  energy+=(l[i]*l[i]+r[i]*r[i])/2;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));
 }
 // Match per-channel RMS to the mono reference at the requested gain. Spatial color
 // must not hide the +50% default gain change. Peak guard only attenuates at extremes.
 let refEnergy=0;for(const x of reference.samples)refEnergy+=x*x;
 const desired=energy?Math.sqrt((refEnergy/reference.samples.length)*n/energy):1;
 const scale=Math.min(desired,peak?.89/peak:desired),left=new Float32Array(n),right=new Float32Array(n),mid=new Float32Array(n);
 for(let i=0;i<n;i++){left[i]=l[i]*scale;right[i]=r[i]*scale;mid[i]=(left[i]+right[i])/2;}
 left[0]=right[0]=mid[0]=0;left[n-1]=right[n-1]=mid[n-1]=0;
 return {samples:mid,channels:[left,right],sampleRate:SR,params:p,spatial:{energyGain:scale,headroomLimited:scale<desired}};
}
function wavStereo(channels){
 if(!Array.isArray(channels)||channels.length!==2||channels[0].length!==channels[1].length)throw Error('Stereo WAV requires two equal-length channels');
 const n=channels[0].length,b=new ArrayBuffer(44+n*4),v=new DataView(b),header=wav(new Float32Array(0));new Uint8Array(b).set(header);
 v.setUint32(4,b.byteLength-8,true);v.setUint16(22,2,true);v.setUint32(28,SR*4,true);v.setUint16(32,4,true);v.setUint32(40,n*4,true);
 for(let i=0;i<n;i++)for(let c=0;c<2;c++){const x=channels[c][i];if(!Number.isFinite(x))throw Error('Non-finite PCM');v.setInt16(44+i*4+c*2,Math.round(clamp(x,-1,1)*32767),true);}return new Uint8Array(b);
}
function wav(samples){const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);samples.forEach((x,i)=>v.setInt16(44+i*2,Math.round(clamp(x,-1,1)*32767),true));return new Uint8Array(b);}
function crc32(a){let c=0xffffffff;for(const x of a){c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function zip(files){let offset=0;const chunks=[],central=[];const enc=new TextEncoder();for(const f of files){const name=enc.encode(f.name),data=f.data,crc=crc32(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);chunks.push(h,data);const c=new Uint8Array(46+name.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+data.length;}const clen=central.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,clen,true);ev.setUint32(16,offset,true);const all=[...chunks,...central,end],out=new Uint8Array(offset+clen+22);let pos=0;all.forEach(x=>{out.set(x,pos);pos+=x.length;});return out;}
const api={synth,synthStereo,wav,wavStereo,zip,validate,SR};if(typeof module!=='undefined')module.exports=api;root.AetherDSP=api;
})(typeof globalThis!=='undefined'?globalThis:this);
