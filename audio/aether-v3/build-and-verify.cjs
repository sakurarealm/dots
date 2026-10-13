// Offline only. Uses Node built-ins and recovered original project sources.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,expected=require('./expected-sha256.json');
fs.mkdirSync(path.join(root,'dist/assets'),{recursive:true});
require('./tests/spatial-verify.cjs');
require('./scripts/bake-events.cjs');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
for(const f of expected.archives){const p='dist/assets/'+f.filename;assert.equal(fs.statSync(path.join(root,p)).size,f.bytes,p+' size');assert.equal(sha(p),f.sha256,p+' hash');}
for(const f of expected.wav_files){assert.equal(fs.statSync(path.join(root,f.path)).size,f.bytes,f.path+' size');assert.equal(sha(f.path),f.sha256,f.path+' hash');}
console.log('PASS: both original ZIPs and all 186 WAV files are byte-identical to recovered originals.');
